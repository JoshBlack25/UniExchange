/*
 SessionMode.java

 What a signed-in session is allowed to do, carried as the "mode" claim of the
 JWT.

 A moderator or admin who signs in the normal way gets a STANDARD session and is
 treated exactly like a student. Their elevated powers only switch on in a
 session opened through the moderator or admin sign-in (a hidden keybind on the
 frontend, then /login, /verify-otp or /elevate with a mode). The database role
 is still checked on every request, so revoking the role ends the powers at
 once, even for a token that is still valid.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 24 September 2026
*/

package za.ac.cput.security;

import java.util.Set;

import za.ac.cput.domain.enums.RoleType;

public enum SessionMode {
    STANDARD,
    MODERATOR,
    ADMIN;

    /** Whether someone holding these database roles may open a session in this mode. */
    public boolean permittedFor(Set<RoleType> roles) {
        return switch (this) {
            case STANDARD -> true;
            case MODERATOR -> roles.contains(RoleType.MODERATOR) || roles.contains(RoleType.ADMIN);
            case ADMIN -> roles.contains(RoleType.ADMIN);
        };
    }

    /** Lenient parse for request bodies and token claims: anything unknown is STANDARD. */
    public static SessionMode parse(Object value) {
        if (value == null) {
            return STANDARD;
        }
        try {
            return SessionMode.valueOf(value.toString().trim().toUpperCase());
        }
        catch (IllegalArgumentException ex) {
            return STANDARD;
        }
    }
}
