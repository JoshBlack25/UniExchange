/*
 OtpService.java

 Issues and checks the short numeric codes that prove a student owns the
 @mycput.ac.za mailbox they signed up with.

 Design notes:
  - The code is never stored in plaintext. Only a BCrypt hash goes into
    Verification.token, reusing the PasswordEncoder bean from SecurityConfig.
  - Codes are generated with SecureRandom, not Math.random / Random.
  - A 6-digit code is only a million possibilities, so attempts are counted and
    capped. Without that cap the OTP would be brute-forceable in minutes.
  - Issuing a new code invalidates any earlier unused one, so an old email
    cannot be replayed.
  - At most app.otp.max-per-day codes are emailed to one account in any rolling
    24 hours, which protects the Gmail sending quota and the student's inbox.
    Counted in memory (one app instance); a restart resets it, which only ever
    errs towards letting a student sign in.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 04 September 2026
*/

package za.ac.cput.service.identity;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayDeque;
import java.util.Comparator;
import java.util.Deque;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import za.ac.cput.domain.enums.VerificationType;
import za.ac.cput.domain.identity.Verification;
import za.ac.cput.exception.TooManyRequestsException;
import za.ac.cput.factory.identity.VerificationFactory;
import za.ac.cput.repository.identity.VerificationRepository;

@Service
public class OtpService {

    /** Outcome of checking a submitted code. Each maps to a distinct API message. */
    public enum Result {
        OK,
        NO_PENDING_CODE,
        EXPIRED,
        TOO_MANY_ATTEMPTS,
        MISMATCH
    }

    private static final Duration DAY = Duration.ofDays(1);
    private static final int SWEEP_THRESHOLD = 10_000;

    private final VerificationRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom random = new SecureRandom();

    private final int length;
    private final long ttlMinutes;
    private final int maxAttempts;
    private final long resendCooldownSeconds;
    private final int maxPerDay;

    /* userId -> when each recent code was issued, oldest first. At most maxPerDay entries each. */
    private final Map<Long, Deque<Instant>> issuedRecently = new ConcurrentHashMap<>();

    public OtpService(VerificationRepository repository,
                      PasswordEncoder passwordEncoder,
                      @Value("${app.otp.length:6}") int length,
                      @Value("${app.otp.ttl-minutes:10}") long ttlMinutes,
                      @Value("${app.otp.max-attempts:5}") int maxAttempts,
                      @Value("${app.otp.resend-cooldown-seconds:60}") long resendCooldownSeconds,
                      @Value("${app.otp.max-per-day:10}") int maxPerDay) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.length = length;
        this.ttlMinutes = ttlMinutes;
        this.maxAttempts = maxAttempts;
        this.resendCooldownSeconds = resendCooldownSeconds;
        this.maxPerDay = maxPerDay;
    }

    /**
     * Issues a fresh code for the user, superseding any earlier unused one.
     *
     * @return the plaintext code - the ONLY time it exists in readable form.
     *         Hand it straight to the mailer and do not log or return it.
     */
    @Transactional
    public String issue(long userId) {
        recordIssue(userId);
        supersedePending(userId);

        String code = randomCode();
        this.repository.save(VerificationFactory.createVerification(
                userId,
                VerificationType.EMAIL,
                this.passwordEncoder.encode(code),
                LocalDateTime.now().plusMinutes(this.ttlMinutes)));

        return code;
    }

    /** Checks a submitted code, counting the attempt when it is wrong. */
    @Transactional
    public Result check(long userId, String code) {
        Verification pending = latestPending(userId).orElse(null);
        if (pending == null) {
            return Result.NO_PENDING_CODE;
        }
        if (pending.getExpiresAt() != null && pending.getExpiresAt().isBefore(LocalDateTime.now())) {
            return Result.EXPIRED;
        }
        if (pending.getAttempts() >= this.maxAttempts) {
            return Result.TOO_MANY_ATTEMPTS;
        }

        if (code == null || !this.passwordEncoder.matches(code.trim(), pending.getToken())) {
            this.repository.save(new Verification.Builder()
                    .copy(pending)
                    .setAttempts(pending.getAttempts() + 1)
                    .build());
            return Result.MISMATCH;
        }

        this.repository.save(new Verification.Builder()
                .copy(pending)
                .setVerifiedAt(LocalDateTime.now())
                .build());
        return Result.OK;
    }

    /**
     * Seconds a caller must wait before another code may be issued,
     * or 0 when a resend is allowed right now.
     */
    public long resendCooldownRemaining(long userId) {
        return latestPending(userId)
                .map(Verification::getCreatedAt)
                .map(issuedAt -> this.resendCooldownSeconds
                        - Duration.between(issuedAt, LocalDateTime.now()).toSeconds())
                .filter(remaining -> remaining > 0)
                .orElse(0L);
    }

    public long getTtlMinutes() {
        return this.ttlMinutes;
    }

    public int getMaxAttempts() {
        return this.maxAttempts;
    }

    /** Counts this issue against the daily cap, or refuses it with a 429. */
    private void recordIssue(long userId) {
        Instant now = Instant.now();
        Instant cutoff = now.minus(DAY);
        long[] retryAfter = {0};

        this.issuedRecently.compute(userId, (id, times) -> {
            Deque<Instant> recent = times == null ? new ArrayDeque<>() : times;
            while (!recent.isEmpty() && recent.peekFirst().isBefore(cutoff)) {
                recent.pollFirst();
            }
            if (recent.size() >= this.maxPerDay) {
                retryAfter[0] = Math.max(1, Duration.between(cutoff, recent.peekFirst()).toSeconds());
                return recent;
            }
            recent.addLast(now);
            return recent;
        });

        if (retryAfter[0] > 0) {
            throw new TooManyRequestsException(
                    "Too many codes have been sent to this account today. Try again later.", retryAfter[0]);
        }

        // Keep the map bounded: drop accounts with nothing inside the window.
        if (this.issuedRecently.size() > SWEEP_THRESHOLD) {
            this.issuedRecently.entrySet().removeIf(entry -> {
                Instant newest = entry.getValue().peekLast();
                return newest == null || newest.isBefore(cutoff);
            });
        }
    }

    /** Most recent unused EMAIL verification for the user, if any. */
    private Optional<Verification> latestPending(long userId) {
        return this.repository.findByUserIdAndVerificationType(userId, VerificationType.EMAIL).stream()
                .filter(v -> v.getVerifiedAt() == null)
                .max(Comparator.comparing(Verification::getCreatedAt));
    }

    /** Burns any outstanding codes so a previously emailed one stops working. */
    private void supersedePending(long userId) {
        this.repository.findByUserIdAndVerificationType(userId, VerificationType.EMAIL).stream()
                .filter(v -> v.getVerifiedAt() == null)
                .forEach(this.repository::delete);
    }

    private String randomCode() {
        StringBuilder code = new StringBuilder(this.length);
        for (int i = 0; i < this.length; i++) {
            code.append(this.random.nextInt(10));
        }
        return code.toString();
    }

}
