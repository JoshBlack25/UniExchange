/*
 ResendOtpRequest.java

 Request a fresh verification code.

 Author: <Your Full Name> (<Student Number>)
 Date: 04 September 2026
*/

package za.ac.cput.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record ResendOtpRequest(@NotBlank String email) {
}
