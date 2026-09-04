/*
 VerifyRequest.java

 Email-verification payload: the token that was issued at registration.

 Author: <Your Full Name> (<Student Number>)
 Date: 04 September 2026
*/

package za.ac.cput.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record VerifyRequest(@NotBlank String token) {
}
