/*
 StepDownRequest.java

 Leaves moderator/admin mode. rememberMe lets the replacement STANDARD token
 keep the lifetime the student originally chose at sign-in.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 24 September 2026
*/

package za.ac.cput.dto.auth;

public record StepDownRequest(Boolean rememberMe) {
}
