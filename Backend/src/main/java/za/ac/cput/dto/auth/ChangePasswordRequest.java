/*
 ChangePasswordRequest.java

 A signed-in user changing their own password - including replacing the
 temporary one a moderator's reset emailed them.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 24 September 2026
*/

package za.ac.cput.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank String currentPassword,
        @NotBlank @Size(min = 8, message = "password must be at least 8 characters") String newPassword,
        // Boxed: Jackson 3 rejects a missing field for a primitive.
        Boolean rememberMe) {
}
