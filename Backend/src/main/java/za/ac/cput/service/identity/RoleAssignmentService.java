/*
 RoleAssignmentService.java

 The one place that answers "which roles does this user hold" and grants or
 revokes them by RoleType rather than by row id.

 Role rows are created on first use (nothing seeds them), so every lookup goes
 through roleFor(), which creates the row if it is missing - the same approach
 AuthController always took for STUDENT.

 Also applies app.bootstrap.admins / app.bootstrap.moderators, so the first
 admin can be named in configuration instead of by hand-written SQL.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 24 September 2026
*/

package za.ac.cput.service.identity;

import java.util.Arrays;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import za.ac.cput.domain.enums.RoleType;
import za.ac.cput.domain.identity.Role;
import za.ac.cput.domain.identity.User;
import za.ac.cput.domain.identity.UserRole;
import za.ac.cput.factory.identity.RoleFactory;
import za.ac.cput.factory.identity.UserRoleFactory;
import za.ac.cput.repository.identity.RoleRepository;
import za.ac.cput.repository.identity.UserRoleRepository;
import za.ac.cput.util.Helper;

@Service
public class RoleAssignmentService {

    private static final Logger log = LoggerFactory.getLogger(RoleAssignmentService.class);

    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final Set<String> bootstrapAdmins;
    private final Set<String> bootstrapModerators;

    public RoleAssignmentService(RoleRepository roleRepository,
                                 UserRoleRepository userRoleRepository,
                                 @Value("${app.bootstrap.admins:}") String bootstrapAdmins,
                                 @Value("${app.bootstrap.moderators:}") String bootstrapModerators) {
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
        this.bootstrapAdmins = parseEmails(bootstrapAdmins);
        this.bootstrapModerators = parseEmails(bootstrapModerators);
    }

    /** The Role row for a type, created on first use. */
    public Role roleFor(RoleType type) {
        return this.roleRepository.findByName(type)
                .orElseGet(() -> this.roleRepository.save(
                        RoleFactory.createRole(type, describe(type))));
    }

    public Set<RoleType> rolesOf(long userId) {
        List<Long> roleIds = this.userRoleRepository.findByUserId(userId).stream()
                .map(UserRole::getRoleId)
                .toList();
        if (roleIds.isEmpty()) {
            return EnumSet.noneOf(RoleType.class);
        }
        return this.roleRepository.findAllById(roleIds).stream()
                .map(Role::getName)
                .collect(Collectors.toCollection(() -> EnumSet.noneOf(RoleType.class)));
    }

    public boolean has(long userId, RoleType type) {
        return this.roleRepository.findByName(type)
                .map(role -> this.userRoleRepository.existsByUserIdAndRoleId(userId, role.getRoleId()))
                .orElse(false);
    }

    /** Idempotent: granting a role the user already holds does nothing. */
    public void grant(long userId, RoleType type) {
        Role role = roleFor(type);
        if (!this.userRoleRepository.existsByUserIdAndRoleId(userId, role.getRoleId())) {
            this.userRoleRepository.save(UserRoleFactory.createUserRole(userId, role.getRoleId()));
        }
    }

    public void revoke(long userId, RoleType type) {
        this.roleRepository.findByName(type).ifPresent(role ->
                this.userRoleRepository.findByUserId(userId).stream()
                        .filter(userRole -> userRole.getRoleId() == role.getRoleId())
                        .forEach(this.userRoleRepository::delete));
    }

    /** Every user id holding the role. */
    public List<Long> userIdsWith(RoleType type) {
        return this.roleRepository.findByName(type)
                .map(role -> this.userRoleRepository.findByRoleId(role.getRoleId()).stream()
                        .map(UserRole::getUserId)
                        .distinct()
                        .toList())
                .orElse(List.of());
    }

    /** Grants ADMIN / MODERATOR when the account is named in app.bootstrap.*. */
    public void applyBootstrap(User user) {
        // Only an address that has passed an emailed code counts. Otherwise an
        // account merely renamed to a bootstrap address would be promoted.
        if (user == null || user.getEmail() == null || user.getEmailVerifiedAt() == null) {
            return;
        }
        String email = user.getEmail().trim().toLowerCase();
        if (this.bootstrapAdmins.contains(email) && !has(user.getUserId(), RoleType.ADMIN)) {
            grant(user.getUserId(), RoleType.ADMIN);
            log.info("Bootstrap: granted ADMIN to userId {}", user.getUserId());
        }
        if (this.bootstrapModerators.contains(email) && !has(user.getUserId(), RoleType.MODERATOR)) {
            grant(user.getUserId(), RoleType.MODERATOR);
            log.info("Bootstrap: granted MODERATOR to userId {}", user.getUserId());
        }
    }

    public Set<String> bootstrapEmails() {
        Set<String> all = new java.util.HashSet<>(this.bootstrapAdmins);
        all.addAll(this.bootstrapModerators);
        return all;
    }

    private static Set<String> parseEmails(String csv) {
        if (Helper.isNullOrEmpty(csv)) {
            return Set.of();
        }
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(email -> !email.isEmpty())
                .map(String::toLowerCase)
                .collect(Collectors.toUnmodifiableSet());
    }

    private static String describe(RoleType type) {
        return switch (type) {
            case STUDENT -> "Default role for a registered student";
            case FACULTY -> "CPUT staff member";
            case MODERATOR -> "Moderates content and ordinary users";
            case ADMIN -> "Moderator powers plus managing moderators and admins";
            default -> type.name();
        };
    }

}
