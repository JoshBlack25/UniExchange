/*
 RegistrationResponse.java

 What /api/auth/register hands back. Deliberately carries NO token: an account
 is unusable until the emailed code proves the student owns the mailbox.

 loginTicket is set only when an elevated (moderator/admin) /login is waiting on
 its code. It proves the password was checked, and /verify-otp needs it before it
 will open that mode. It is not a session token and cannot be used as one.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 04 September 2026
*/

package za.ac.cput.dto.auth;

public record RegistrationResponse(
        String email,
        String message,
        long codeExpiresInSeconds,
        String loginTicket) {

    public RegistrationResponse(String email, String message, long codeExpiresInSeconds) {
        this(email, message, codeExpiresInSeconds, null);
    }
}
