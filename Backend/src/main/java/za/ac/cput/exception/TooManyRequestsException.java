/*
 TooManyRequestsException.java

 A per-account limit was hit (for example the daily cap on emailed codes).
 Surfaces as 429 with a Retry-After header. Per-IP request limits are enforced
 earlier, in security/RateLimitFilter, and never reach a controller.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 25 September 2026
*/

package za.ac.cput.exception;

public class TooManyRequestsException extends RuntimeException {

    private final long retryAfterSeconds;

    public TooManyRequestsException(String message, long retryAfterSeconds) {
        super(message);
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() {
        return this.retryAfterSeconds;
    }

}
