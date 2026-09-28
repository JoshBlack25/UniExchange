/*
 ElevateRequest.java

 Switches an existing signed-in session into moderator or admin mode. The
 password is asked for again even though the caller already holds a token, so
 an unattended, signed-in laptop cannot be elevated by whoever sits down at it.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 24 September 2026
*/

package za.ac.cput.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record ElevateRequest(
        @NotBlank String password,
        @NotBlank String mode) {
}
