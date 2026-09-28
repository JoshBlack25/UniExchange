/*
 AdminController.java

 /api/admin - the part only an admin can do: deciding who else is a moderator
 or an admin. SecurityConfig requires ROLE_ADMIN, which exists only in a session
 opened through the admin sign-in. The rules (no removing yourself, never
 removing the last admin) are in ModerationService.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 24 September 2026
*/

package za.ac.cput.controller.admin;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import za.ac.cput.domain.enums.RoleType;
import za.ac.cput.dto.moderation.ModerationDtos.ModeratedUser;
import za.ac.cput.security.UniExchangeUserDetailsService.AuthenticatedUser;
import za.ac.cput.service.moderation.ModerationService;

// A second layer behind SecurityConfig's URL rule, so a routing change cannot expose this class.
@PreAuthorize("hasRole('ADMIN')")
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final ModerationService service;

    public AdminController(ModerationService service) {
        this.service = service;
    }

    /** Everyone holding MODERATOR or ADMIN. */
    @GetMapping("/staff")
    public List<ModeratedUser> staff() {
        return this.service.staff();
    }

    @PostMapping("/users/{id}/moderator")
    public ModeratedUser grantModerator(@PathVariable long id, @AuthenticationPrincipal AuthenticatedUser principal) {
        return this.service.grantRole(principal, id, RoleType.MODERATOR);
    }

    @DeleteMapping("/users/{id}/moderator")
    public ModeratedUser revokeModerator(@PathVariable long id, @AuthenticationPrincipal AuthenticatedUser principal) {
        return this.service.revokeRole(principal, id, RoleType.MODERATOR);
    }

    @PostMapping("/users/{id}/admin")
    public ModeratedUser grantAdmin(@PathVariable long id, @AuthenticationPrincipal AuthenticatedUser principal) {
        return this.service.grantRole(principal, id, RoleType.ADMIN);
    }

    @DeleteMapping("/users/{id}/admin")
    public ModeratedUser revokeAdmin(@PathVariable long id, @AuthenticationPrincipal AuthenticatedUser principal) {
        return this.service.revokeRole(principal, id, RoleType.ADMIN);
    }

}
