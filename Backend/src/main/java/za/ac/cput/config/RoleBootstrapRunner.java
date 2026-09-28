/*
 RoleBootstrapRunner.java

 On startup, grants ADMIN / MODERATOR to the accounts named in
 app.bootstrap.admins and app.bootstrap.moderators.

 This is how the first admin comes to exist: nobody can be promoted through the
 API without already being an admin. An account that has not registered yet is
 skipped here and picked up when it verifies its email (AuthController).

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 24 September 2026
*/

package za.ac.cput.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import za.ac.cput.repository.identity.UserRepository;
import za.ac.cput.service.identity.RoleAssignmentService;

@Component
@Order(2)
public class RoleBootstrapRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(RoleBootstrapRunner.class);

    private final RoleAssignmentService roles;
    private final UserRepository users;

    public RoleBootstrapRunner(RoleAssignmentService roles, UserRepository users) {
        this.roles = roles;
        this.users = users;
    }

    @Override
    public void run(ApplicationArguments args) {
        for (String email : this.roles.bootstrapEmails()) {
            try {
                this.users.findByEmail(email).ifPresentOrElse(
                        this.roles::applyBootstrap,
                        () -> log.info("Bootstrap: {} has not registered yet - the role is granted on verification", email));
            }
            catch (RuntimeException ex) {
                log.error("Bootstrap: could not apply roles for {}: {}", email, ex.getMessage(), ex);
            }
        }
    }

}
