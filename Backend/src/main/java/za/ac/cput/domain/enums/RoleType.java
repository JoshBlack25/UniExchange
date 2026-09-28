/*
 RoleType.java

 RoleType ENUM class

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 04 September 2026
*/

package za.ac.cput.domain.enums;

public enum RoleType {
    STUDENT,
    FACULTY,
    VENDOR,
    RESIDENT,
    // Moderates content and ordinary users. Its powers only apply in a session
    // opened through the moderator sign-in - see JwtAuthenticationFilter.
    MODERATOR,
    // Everything MODERATOR can do, plus granting and revoking MODERATOR/ADMIN.
    ADMIN
}