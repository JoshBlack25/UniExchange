/*
 ServiceUnavailableException.java

 A temporary failure whose message is written for the user - "the verification
 email could not be sent", "the PayFast tunnel is not running". Surfaces as 503
 with that message.

 A plain IllegalStateException is treated as an internal fault instead: it is
 logged and the client only ever sees a generic 503, because its message may
 describe internals (paths, algorithms, ids). Throw this type only with text that
 is safe and useful to show.

 Extends IllegalStateException so anything already treating these as such
 (transaction rollback rules, callers) behaves exactly as before.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 25 September 2026
*/

package za.ac.cput.exception;

public class ServiceUnavailableException extends IllegalStateException {

    public ServiceUnavailableException(String message) {
        super(message);
    }

    public ServiceUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }

}
