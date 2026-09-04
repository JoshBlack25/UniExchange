/*
 RegisterRequest.java

 Registration payload. Carries a RAW password, which no entity models - User only
 ever holds a passwordHash - so this cannot be replaced by the entity itself.

 Author: <Your Full Name> (<Student Number>)
 Date: 04 September 2026
*/

package za.ac.cput.dto.auth;

import java.time.LocalDate;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Email String email,
        @NotBlank String firstName,
        String middleName,
        @NotBlank String lastName,
        String cellPhone,
        @NotBlank @Size(min = 8, message = "password must be at least 8 characters") String password,
        LocalDate dateOfBirth,
        Long campusId) {
}
