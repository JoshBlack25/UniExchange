/*
 ModerationDeniedException.java

 A moderation action the caller's role does not allow - acting on your own
 account, a moderator acting on an admin, removing the last admin. Unlike a
 plain AccessDeniedException its message is shown to the moderator, so they know
 why the button did nothing.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 24 September 2026
*/

package za.ac.cput.exception;

import org.springframework.security.access.AccessDeniedException;

public class ModerationDeniedException extends AccessDeniedException {

    public ModerationDeniedException(String message) {
        super(message);
    }

}
