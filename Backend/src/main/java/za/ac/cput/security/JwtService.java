/*
 JwtService.java

 Mints and verifies HS256 JSON Web Tokens.

 Uses the non-deprecated jjwt 0.12+/0.13 API only: subject()/issuedAt()/expiration()
 rather than setSubject()/setIssuedAt()/setExpiration(), signWith(SecretKey) rather
 than signWith(key, SignatureAlgorithm), and
 Jwts.parser().verifyWith(key).build().parseSignedClaims(t).getPayload() rather than
 setSigningKey()/parseClaimsJws()/getBody().

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 04 September 2026
*/

package za.ac.cput.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Date;
import java.util.Map;

import javax.crypto.SecretKey;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    static final String ISSUED_AT_MILLIS_CLAIM = "iatMs";

    /** The placeholder that used to ship as the default. Refused outright. */
    static final String OLD_PLACEHOLDER = "change-me-to-at-least-32-bytes-of-random-secret-value";

    private static final String TICKET_PURPOSE = "otp-login";
    private static final long TICKET_TTL_SECONDS = 600;

    private final SecretKey key;
    private final SecretKey ticketKey;
    private final long ttlSeconds;
    private final long rememberedTtlSeconds;
    private final long elevatedTtlSeconds;

    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.ttl-seconds:3600}") long ttlSeconds,
                      @Value("${app.jwt.remembered-ttl-seconds:604800}") long rememberedTtlSeconds,
                      @Value("${app.jwt.elevated-ttl-seconds:3600}") long elevatedTtlSeconds) {
        /*
         No default secret. A secret anyone can read in the repository lets them
         sign their own tokens, and with session modes that means signing an
         ADMIN session. Refuse to start rather than run with one.
        */
        if (secret == null || secret.isBlank() || OLD_PLACEHOLDER.equals(secret.trim())) {
            throw new IllegalStateException(
                    "app.jwt.secret is not set. Set the JWT_SECRET environment variable "
                            + "(or app.jwt.secret in application-local.properties) to a random value of at least 32 bytes.");
        }
        // Throws the unchecked WeakKeyException if the secret is under 32 bytes (HS256).
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        // Login tickets use a key derived from the secret, so a ticket can never
        // be replayed as a bearer token and a bearer token never reads as a ticket.
        this.ticketKey = Keys.hmacShaKeyFor(sha256("login-ticket:" + secret));
        this.ttlSeconds = ttlSeconds;
        this.rememberedTtlSeconds = rememberedTtlSeconds;
        this.elevatedTtlSeconds = elevatedTtlSeconds;
    }

    public String generateToken(String subject) {
        return generateToken(subject, Map.of());
    }

    public String generateToken(String subject, Map<String, Object> extraClaims) {
        return generateToken(subject, extraClaims, this.ttlSeconds);
    }

    public String generateToken(String subject, Map<String, Object> extraClaims, long ttlSeconds) {
        Instant now = Instant.now();
        return Jwts.builder()
                .claims(extraClaims)
                // Millisecond issue time. The standard iat is whole seconds, too
                // coarse to tell a token minted just before a password reset from
                // one minted just after it (see JwtAuthenticationFilter).
                .claim(ISSUED_AT_MILLIS_CLAIM, now.toEpochMilli())
                .subject(subject)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(ttlSeconds)))
                .signWith(this.key)
                .compact();
    }

    public Claims parseClaims(String token) throws JwtException {
        return Jwts.parser()
                .verifyWith(this.key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /*
     A login ticket proves the password was checked at /login. It lets an
     elevated (moderator/admin) sign-in carry its mode across the emailed-code
     step: /verify-otp needs only the code, so without the ticket anyone holding
     the mailbox - or able to plant a code - could open an elevated session.
    */
    public String mintLoginTicket(String email, SessionMode mode) {
        Instant now = Instant.now();
        return Jwts.builder()
                .claim("purpose", TICKET_PURPOSE)
                .claim("mode", mode.name())
                .subject(email)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(TICKET_TTL_SECONDS)))
                .signWith(this.ticketKey)
                .compact();
    }

    /** The mode a valid ticket for this email grants, or STANDARD if it is missing or invalid. */
    public SessionMode modeFromLoginTicket(String ticket, String email) {
        if (ticket == null || ticket.isBlank() || email == null) {
            return SessionMode.STANDARD;
        }
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(this.ticketKey)
                    .build()
                    .parseSignedClaims(ticket)
                    .getPayload();
            if (!TICKET_PURPOSE.equals(claims.get("purpose", String.class))
                    || !email.equalsIgnoreCase(claims.getSubject())) {
                return SessionMode.STANDARD;
            }
            return SessionMode.parse(claims.get("mode", String.class));
        }
        catch (JwtException | IllegalArgumentException ex) {
            return SessionMode.STANDARD;
        }
    }

    public String extractSubject(String token) throws JwtException {
        return parseClaims(token).getSubject();
    }

    public long getTtlSeconds() {
        return this.ttlSeconds;
    }

    /*
     How long a "Remember me" sign-in lasts. Deliberately much longer than the
     default: with no refresh endpoint, an hour-long token would sign the student
     out every hour no matter what they ticked.

     The trade this accepts: a JWT cannot be revoked server-side, so a stolen
     remembered token stays valid until it expires. Shorten
     app.jwt.remembered-ttl-seconds if that is not an acceptable trade.
    */
    public long getRememberedTtlSeconds() {
        return this.rememberedTtlSeconds;
    }

    /*
     Moderator and admin sessions ignore "Remember me" and always expire after
     app.jwt.elevated-ttl-seconds: a forgotten elevated tab should not keep its
     powers for a month.
    */
    public long getElevatedTtlSeconds() {
        return this.elevatedTtlSeconds;
    }

    /** The lifetime to mint with, given whether "Remember me" was ticked. */
    public long ttlSecondsFor(boolean remembered) {
        return remembered ? this.rememberedTtlSeconds : this.ttlSeconds;
    }

    private static byte[] sha256(String value) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
        }
        catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is unavailable", ex);
        }
    }

}
