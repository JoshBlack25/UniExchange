/*
 AuthResponse.java

 What /api/auth/register and /api/auth/login hand back to the client.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 04 September 2026
*/

package za.ac.cput.dto.auth;

import java.util.List;

public record AuthResponse(
        String token,
        String tokenType,
        long expiresIn,
        long userId,
        String email,
        List<String> roles) {
}
