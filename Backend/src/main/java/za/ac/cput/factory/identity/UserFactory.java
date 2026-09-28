/*
 UserFactory.java

 Factory for User. All construction goes through here so that every
 User is validated with Helper before it exists - the entity itself
 exposes only a Builder and a protected JPA constructor.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 04 September 2026
*/

package za.ac.cput.factory.identity;

import java.time.LocalDate;
import java.time.LocalDateTime;

import za.ac.cput.domain.enums.AccountStatus;
import za.ac.cput.domain.identity.User;
import za.ac.cput.util.Helper;

public class UserFactory {

    // Prevent instantiation - factory class
    private UserFactory() {}

    public static User createUser(String email, String firstName, String middleName, String lastName,
                                  String cellPhone, String passwordHash, LocalDate dateOfBirth,
                                  AccountStatus accountStatus, Long campusId) {
        if (!Helper.isValidEmail(email)) {
            throw new IllegalArgumentException("User: email is not a valid email address");
        }

        if (Helper.isNullOrEmpty(firstName)) {
            throw new IllegalArgumentException("User: firstName is required");
        }

        if (Helper.isNullOrEmpty(lastName)) {
            throw new IllegalArgumentException("User: lastName is required");
        }

        if (!Helper.isNullOrEmpty(cellPhone) && !Helper.isValidMobileNumber(cellPhone)) {
            throw new IllegalArgumentException("User: cellPhone must be 10 to 15 digits");
        }

        if (Helper.isNullOrEmpty(passwordHash)) {
            throw new IllegalArgumentException("User: passwordHash is required");
        }

        if (!Helper.isValidObject(accountStatus)) {
            throw new IllegalArgumentException("User: accountStatus is required");
        }

        if (campusId != null && !Helper.isValidId(campusId)) {
            throw new IllegalArgumentException("User: campusId must be a positive id when supplied");
        }

        LocalDateTime now = LocalDateTime.now();

        return new User.Builder()
                .setEmail(email)
                .setFirstName(firstName)
                .setMiddleName(middleName)
                .setLastName(lastName)
                .setCellPhone(cellPhone)
                .setPasswordHash(passwordHash)
                .setDateOfBirth(dateOfBirth)
                .setAccountStatus(accountStatus)
                .setCampusId(campusId)
                .setCreatedAt(now)
                .setUpdatedAt(now)
                .build();
    }

    public static User updateUser(User existing, String email, String firstName, String middleName,
                                  String lastName, String cellPhone, String passwordHash,
                                  LocalDate dateOfBirth, AccountStatus accountStatus, Long campusId) {
        if (!Helper.isValidObject(existing)) {
            throw new IllegalArgumentException("User: existing record is required for an update");
        }

        if (!Helper.isValidEmail(email)) {
            throw new IllegalArgumentException("User: email is not a valid email address");
        }

        if (Helper.isNullOrEmpty(firstName)) {
            throw new IllegalArgumentException("User: firstName is required");
        }

        if (Helper.isNullOrEmpty(lastName)) {
            throw new IllegalArgumentException("User: lastName is required");
        }

        if (!Helper.isNullOrEmpty(cellPhone) && !Helper.isValidMobileNumber(cellPhone)) {
            throw new IllegalArgumentException("User: cellPhone must be 10 to 15 digits");
        }

        if (Helper.isNullOrEmpty(passwordHash)) {
            throw new IllegalArgumentException("User: passwordHash is required");
        }

        if (!Helper.isValidObject(accountStatus)) {
            throw new IllegalArgumentException("User: accountStatus is required");
        }

        if (campusId != null && !Helper.isValidId(campusId)) {
            throw new IllegalArgumentException("User: campusId must be a positive id when supplied");
        }

        return new User.Builder()
                .copy(existing)
                .setEmail(email)
                .setFirstName(firstName)
                .setMiddleName(middleName)
                .setLastName(lastName)
                .setCellPhone(cellPhone)
                .setPasswordHash(passwordHash)
                .setDateOfBirth(dateOfBirth)
                .setAccountStatus(accountStatus)
                .setCampusId(campusId)
                .setUpdatedAt(LocalDateTime.now())
                .build();
    }


    /**
     * Marks a user's email as verified: ACTIVE, with emailVerifiedAt stamped.
     *
     * Exists as its own method because updateUser has no emailVerifiedAt
     * parameter, so activating through it left the column permanently null -
     * the account looked active but carried no record of when, or whether, the
     * mailbox was ever proved.
     */
    public static User verifyEmail(User existing) {
        if (!Helper.isValidObject(existing)) {
            throw new IllegalArgumentException("User: existing record is required to verify");
        }

        LocalDateTime now = LocalDateTime.now();
        return new User.Builder()
                .copy(existing)
                .setAccountStatus(AccountStatus.ACTIVE)
                .setEmailVerifiedAt(now)
                .setUpdatedAt(now)
                .build();
    }

    /**
     * Replaces the password hash and stamps credentialsChangedAt, which makes
     * JwtAuthenticationFilter reject every token issued before now.
     */
    public static User changePassword(User existing, String passwordHash) {
        if (!Helper.isValidObject(existing)) {
            throw new IllegalArgumentException("User: existing record is required to change the password");
        }
        if (Helper.isNullOrEmpty(passwordHash)) {
            throw new IllegalArgumentException("User: passwordHash is required");
        }

        LocalDateTime now = LocalDateTime.now();
        return new User.Builder()
                .copy(existing)
                .setPasswordHash(passwordHash)
                .setCredentialsChangedAt(now)
                .setUpdatedAt(now)
                .build();
    }

    /**
     * Moves the account to a new status. Locking statuses (SUSPENDED,
     * DEACTIVATED) also stamp credentialsChangedAt so existing tokens die now.
     */
    public static User changeStatus(User existing, AccountStatus accountStatus) {
        if (!Helper.isValidObject(existing)) {
            throw new IllegalArgumentException("User: existing record is required to change the status");
        }
        if (!Helper.isValidObject(accountStatus)) {
            throw new IllegalArgumentException("User: accountStatus is required");
        }

        LocalDateTime now = LocalDateTime.now();
        User.Builder builder = new User.Builder()
                .copy(existing)
                .setAccountStatus(accountStatus)
                .setUpdatedAt(now);
        if (accountStatus == AccountStatus.SUSPENDED || accountStatus == AccountStatus.DEACTIVATED) {
            builder.setCredentialsChangedAt(now);
        }
        return builder.build();
    }

    /** Records that the profile photo changed (now) or was removed (null). */
    public static User changePhoto(User existing, LocalDateTime photoUpdatedAt) {
        if (!Helper.isValidObject(existing)) {
            throw new IllegalArgumentException("User: existing record is required to change the photo");
        }
        return new User.Builder()
                .copy(existing)
                .setPhotoUpdatedAt(photoUpdatedAt)
                .setUpdatedAt(LocalDateTime.now())
                .build();
    }

    /**
     * What a moderator's "delete user" does: the account is closed and stripped
     * of personal details, but the row stays so wallets, purchases, reviews and
     * chats that point at this id keep making sense.
     */
    public static User anonymise(User existing, String randomPasswordHash) {
        if (!Helper.isValidObject(existing)) {
            throw new IllegalArgumentException("User: existing record is required to anonymise");
        }

        LocalDateTime now = LocalDateTime.now();
        return new User.Builder()
                .copy(existing)
                .setEmail("deleted-" + existing.getUserId() + "@removed.invalid")
                .setFirstName("Deleted")
                .setMiddleName(null)
                .setLastName("user")
                .setCellPhone(null)
                .setDateOfBirth(null)
                .setPasswordHash(randomPasswordHash)
                .setAccountStatus(AccountStatus.DEACTIVATED)
                .setCredentialsChangedAt(now)
                .setPhotoUpdatedAt(null)
                .setUpdatedAt(now)
                .build();
    }

}
