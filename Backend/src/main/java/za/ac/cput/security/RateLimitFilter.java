/*
 RateLimitFilter.java

 Per-client request limits, answered with 429 and Retry-After before any
 authentication or database work is done.

 In-memory token buckets (Bucket4j). The app runs as ONE instance, so memory is
 the right store; with several instances each would count separately and the
 effective limit would multiply.

 Rules (first match wins; every limit refills greedily):

   POST /api/auth/login                 5/min and 20/hour per IP + email
   POST /api/auth/register|resend-otp|verify-otp
                                        5/min per IP + email
     ...and all of the above together   30/min per IP (backstop)
   POST /api/auth/elevate               5 per 15 min per user
   uploads (POST /api/uploads, /api/listing-images/upload,
            /api/profile-photos/**, /api/chat/threads/{id}/media)
                                        30/min per user
   POST /api/wallet/topup|transfer      10/min per user
   everything else                      120/min per user, or per IP when signed out

 Why IP + email on the auth endpoints rather than IP alone: a whole campus lab
 or residence shares one public IP behind NAT, so a strict per-IP limit would
 lock every student out while one of them retried. Keying by the email being
 tried stops password guessing and code spam against any one account; the looser
 per-IP backstop still stops one machine cycling through many accounts. The
 per-day cap on emailed codes (OtpService) is the last line for the mail quota.

 Who "the user" is: this filter runs BEFORE JwtAuthenticationFilter, so nothing
 is resolved yet. It verifies the Bearer token's signature itself (no database
 hit) and keys on its uid claim; a missing or bad token falls back to the IP.
 Cheap enough that a flood is rejected before the JWT filter loads any user.

 Client IP is request.getRemoteAddr(). Behind Azure, server.forward-headers-strategy
 makes Tomcat substitute the real client from X-Forwarded-For, trusting that
 header only from internal proxy addresses, so a client cannot spoof it.

 Memory is bounded: an idle bucket is dropped once it has been untouched longer
 than its longest window (at which point it would be full again anyway), and if
 the map still exceeds MAX_KEYS it is cleared outright - erring towards letting
 requests through rather than growing without limit.

 Not a @Component on purpose: Boot would also register a @Component filter with
 the servlet container, outside the security chain. SecurityConfig creates it.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 25 September 2026
*/

package za.ac.cput.security;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.SequenceInputStream;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

public class RateLimitFilter extends OncePerRequestFilter {

    /** Hard ceiling on tracked keys. Around 200 bytes each, so a few tens of MB at worst. */
    static final int MAX_KEYS = 100_000;

    /** How often (in requests) idle buckets are swept. */
    private static final int SWEEP_EVERY = 1_000;

    /** Auth bodies are tiny JSON; anything bigger is not buffered for key extraction. */
    private static final int MAX_BUFFERED_BODY = 16 * 1024;

    private static final String BEARER = "Bearer ";

    enum KeyBy { IP, IP_EMAIL, USER }

    /** A named limit: its bandwidths, how clients are told apart, and the longest window. */
    record Rule(String name, KeyBy keyBy, List<Bandwidth> limits, Duration idleAfter) {

        static Rule of(String name, KeyBy keyBy, long[][] perWindow) {
            List<Bandwidth> limits = new ArrayList<>();
            Duration longest = Duration.ZERO;
            for (long[] limit : perWindow) {
                Duration window = Duration.ofSeconds(limit[1]);
                limits.add(Bandwidth.builder().capacity(limit[0]).refillGreedy(limit[0], window).build());
                if (window.compareTo(longest) > 0) longest = window;
            }
            return new Rule(name, keyBy, List.copyOf(limits), longest);
        }
    }

    private static final long MINUTE = 60;
    private static final long HOUR = 3600;

    static final Rule LOGIN = Rule.of("login", KeyBy.IP_EMAIL, new long[][] {{5, MINUTE}, {20, HOUR}});
    static final Rule OTP = Rule.of("otp", KeyBy.IP_EMAIL, new long[][] {{5, MINUTE}});
    static final Rule AUTH_IP = Rule.of("auth-ip", KeyBy.IP, new long[][] {{30, MINUTE}});
    static final Rule ELEVATE = Rule.of("elevate", KeyBy.USER, new long[][] {{5, 15 * MINUTE}});
    static final Rule UPLOAD = Rule.of("upload", KeyBy.USER, new long[][] {{30, MINUTE}});
    static final Rule WALLET = Rule.of("wallet", KeyBy.USER, new long[][] {{10, MINUTE}});
    static final Rule GENERAL = Rule.of("general", KeyBy.USER, new long[][] {{120, MINUTE}});

    private static final AntPathMatcher PATHS = new AntPathMatcher();

    private record Entry(Bucket bucket, Duration idleAfter, AtomicLong lastUsedNanos) {}

    private final Map<String, Entry> buckets = new ConcurrentHashMap<>();
    private final AtomicLong requests = new AtomicLong();
    private final JwtService jwtService;
    private final JsonMapper json = JsonMapper.builder().build();
    private final boolean enabled;

    public RateLimitFilter(JwtService jwtService, boolean enabled) {
        this.jwtService = jwtService;
        this.enabled = enabled;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!this.enabled) return true;
        String method = request.getMethod();
        if (HttpMethod.OPTIONS.matches(method)) return true; // CORS preflight
        String path = request.getRequestURI();
        if (HttpMethod.GET.matches(method)) {
            // Images a page embeds by the dozen through <img>; counting them would
            // exhaust the general limit on one scroll through the feed.
            return path.startsWith("/uploads/")
                    || path.startsWith("/api/profile-photos/")
                    || path.startsWith("/api/listing-images/files/")
                    || path.startsWith("/api/chat/media/");
        }
        // PayFast's server-to-server callback; it authenticates itself and must not be refused.
        return HttpMethod.POST.matches(method) && path.equals("/api/payfast/itn");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        maybeSweep();

        String path = request.getRequestURI();
        boolean post = HttpMethod.POST.matches(request.getMethod());
        String ip = request.getRemoteAddr();
        HttpServletRequest forward = request;

        List<Rule> rules;
        if (post && path.equals("/api/auth/login")) {
            rules = List.of(AUTH_IP, LOGIN);
        } else if (post && (path.equals("/api/auth/register")
                || path.equals("/api/auth/resend-otp")
                || path.equals("/api/auth/verify-otp"))) {
            rules = List.of(AUTH_IP, OTP);
        } else if (post && path.equals("/api/auth/elevate")) {
            rules = List.of(ELEVATE);
        } else if (post && isUpload(path)) {
            rules = List.of(UPLOAD);
        } else if (post && (path.equals("/api/wallet/topup") || path.equals("/api/wallet/transfer"))) {
            rules = List.of(WALLET);
        } else {
            rules = List.of(GENERAL);
        }

        String email = null;
        if (rules.stream().anyMatch(rule -> rule.keyBy() == KeyBy.IP_EMAIL)) {
            CachedBodyRequest cached = CachedBodyRequest.wrap(request);
            if (cached != null) {
                forward = cached;
                email = emailFrom(cached.body());
            }
        }

        for (Rule rule : rules) {
            String key = rule.name() + '|' + switch (rule.keyBy()) {
                case IP -> ip;
                case IP_EMAIL -> ip + '|' + (email == null ? "" : email);
                case USER -> userKey(request, ip);
            };
            ConsumptionProbe probe = bucketFor(key, rule).tryConsumeAndReturnRemaining(1);
            if (!probe.isConsumed()) {
                reject(response, probe.getNanosToWaitForRefill());
                return;
            }
        }

        chain.doFilter(forward, response);
    }

    private static boolean isUpload(String path) {
        return path.equals("/api/uploads")
                || path.equals("/api/listing-images/upload")
                || path.startsWith("/api/profile-photos/")
                || PATHS.match("/api/chat/threads/*/media", path);
    }

    /** "user:<uid>" from a correctly signed token, else "ip:<address>". */
    private String userKey(HttpServletRequest request, String ip) {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith(BEARER)) {
            try {
                Claims claims = this.jwtService.parseClaims(header.substring(BEARER.length()));
                Object uid = claims.get("uid");
                if (uid != null) {
                    return "user:" + uid;
                }
            } catch (JwtException | IllegalArgumentException ex) {
                // A bad token is the JWT filter's problem; here it just means "unknown user".
            }
        }
        return "ip:" + ip;
    }

    private String emailFrom(byte[] body) {
        if (body.length == 0) return null;
        try {
            JsonNode email = this.json.readTree(body).path("email");
            return email.isString() ? email.asString().trim().toLowerCase(Locale.ROOT) : null;
        } catch (RuntimeException ex) {
            // Malformed JSON: the controller rejects it; key on the IP alone meanwhile.
            return null;
        }
    }

    private Bucket bucketFor(String key, Rule rule) {
        Entry entry = this.buckets.computeIfAbsent(key, k -> new Entry(
                buildBucket(rule), rule.idleAfter(), new AtomicLong()));
        entry.lastUsedNanos().set(System.nanoTime());
        return entry.bucket();
    }

    private static Bucket buildBucket(Rule rule) {
        var builder = Bucket.builder();
        rule.limits().forEach(builder::addLimit);
        return builder.build();
    }

    private void maybeSweep() {
        if (this.requests.incrementAndGet() % SWEEP_EVERY != 0 && this.buckets.size() < MAX_KEYS) {
            return;
        }
        long now = System.nanoTime();
        this.buckets.entrySet().removeIf(e ->
                now - e.getValue().lastUsedNanos().get() > e.getValue().idleAfter().toNanos());
        if (this.buckets.size() >= MAX_KEYS) {
            // Still full of live keys: a flood from many addresses. Start over rather than grow.
            this.buckets.clear();
        }
    }

    /* Same body shape as GlobalExceptionHandler, so the frontend reads the message the same way. */
    private static void reject(HttpServletResponse response, long nanosToWait) throws IOException {
        long seconds = Math.max(1, TimeUnit.NANOSECONDS.toSeconds(nanosToWait + 999_999_999L));
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setHeader(HttpHeaders.RETRY_AFTER, String.valueOf(seconds));
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write("""
                {"timestamp":"%s","status":429,"error":"Too Many Requests","message":"Too many requests. Try again in %d seconds."}"""
                .formatted(LocalDateTime.now(), seconds));
    }

    /**
     * Lets the filter read a small JSON body (to find the email) and still hand the
     * same bytes to the controller. Only used on the auth endpoints.
     */
    static final class CachedBodyRequest extends HttpServletRequestWrapper {

        private final byte[] head;
        private final boolean complete;

        private CachedBodyRequest(HttpServletRequest request, byte[] head, boolean complete) {
            super(request);
            this.head = head;
            this.complete = complete;
        }

        /** Null when the declared body is too large to be worth buffering; the request then passes unwrapped. */
        static CachedBodyRequest wrap(HttpServletRequest request) throws IOException {
            if (request.getContentLengthLong() > MAX_BUFFERED_BODY) {
                return null;
            }
            byte[] head = request.getInputStream().readNBytes(MAX_BUFFERED_BODY + 1);
            // Longer than it claimed (or chunked): replay what was read, then the rest of the stream.
            return new CachedBodyRequest(request, head, head.length <= MAX_BUFFERED_BODY);
        }

        /** The whole body, or an empty array when it was too large to buffer. */
        byte[] body() {
            return this.complete ? this.head : new byte[0];
        }

        @Override
        public ServletInputStream getInputStream() throws IOException {
            InputStream in = this.complete
                    ? new ByteArrayInputStream(this.head)
                    : new SequenceInputStream(new ByteArrayInputStream(this.head), super.getInputStream());
            return new ServletInputStream() {
                @Override public int read() throws IOException { return in.read(); }
                @Override public int read(byte[] b, int off, int len) throws IOException { return in.read(b, off, len); }
                @Override public boolean isFinished() {
                    try {
                        return in.available() == 0;
                    } catch (IOException ex) {
                        return true;
                    }
                }
                @Override public boolean isReady() { return true; }
                @Override public void setReadListener(ReadListener listener) {
                    throw new UnsupportedOperationException("Synchronous reads only");
                }
            };
        }

        @Override
        public BufferedReader getReader() throws IOException {
            String encoding = getCharacterEncoding() == null ? StandardCharsets.UTF_8.name() : getCharacterEncoding();
            return new BufferedReader(new InputStreamReader(getInputStream(), Charset.forName(encoding)));
        }

    }

}
