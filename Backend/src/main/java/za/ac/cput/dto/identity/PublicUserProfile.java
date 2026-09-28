/*
 PublicUserProfile.java

 What one student may see about another: GET /api/users/{id} outside a
 moderator/admin session.

 The User entity carries email, cellPhone and dateOfBirth, none of which another
 student has any business reading - returning the entity handed them to anyone
 who could guess an id. Staff sessions still get the full entity.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 25 September 2026
*/

package za.ac.cput.dto.identity;

import java.time.LocalDateTime;

import za.ac.cput.domain.enums.AccountStatus;
import za.ac.cput.domain.identity.User;

public record PublicUserProfile(
        long userId,
        String firstName,
        String middleName,
        String lastName,
        Long campusId,
        LocalDateTime createdAt,
        // STUDENT or STAFF - the profile badge.
        String affiliation,
        String profilePhotoUrl,
        // Drives the "Suspended" badge the profile page already shows publicly.
        AccountStatus accountStatus) {

    public static PublicUserProfile of(User user) {
        return new PublicUserProfile(
                user.getUserId(),
                user.getFirstName(),
                user.getMiddleName(),
                user.getLastName(),
                user.getCampusId(),
                user.getCreatedAt(),
                user.getAffiliation(),
                user.getProfilePhotoUrl(),
                user.getAccountStatus());
    }

}
