/*
 AuthController.java

 Registration, login, email verification and "who am I".

 Registration composes four identity entities - User, the default STUDENT Role, the
 UserRole join row and an EMAIL Verification token - and every one of them is built
 through its factory, never through setters.

 Author: <Your Full Name> (<Student Number>)
 Date: 04 September 2026
*/

package za.ac.cput.controller.identity;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import za.ac.cput.domain.enums.AccountStatus;
import za.ac.cput.domain.enums.RoleType;
import za.ac.cput.domain.enums.VerificationType;
import za.ac.cput.domain.identity.Role;
import za.ac.cput.domain.identity.User;
import za.ac.cput.domain.identity.Verification;
import za.ac.cput.dto.auth.AuthResponse;
import za.ac.cput.dto.auth.LoginRequest;
import za.ac.cput.dto.auth.RegisterRequest;
import za.ac.cput.dto.auth.VerifyRequest;
import za.ac.cput.factory.identity.RoleFactory;
import za.ac.cput.factory.identity.UserFactory;
import za.ac.cput.factory.identity.VerificationFactory;
import za.ac.cput.security.JwtService;
import za.ac.cput.security.UniExchangeUserDetailsService.AuthenticatedUser;
import za.ac.cput.service.identity.IRoleService;
import za.ac.cput.service.identity.IUserRoleService;
import za.ac.cput.service.identity.IUserService;
import za.ac.cput.service.identity.IVerificationService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final long VERIFICATION_TTL_HOURS = 24;

    private final IUserService userService;
    private final IRoleService roleService;
    private final IUserRoleService userRoleService;
    private final IVerificationService verificationService;
    private final AuthenticationManager authenticationManager;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthController(IUserService userService,
                          IRoleService roleService,
                          IUserRoleService userRoleService,
                          IVerificationService verificationService,
                          AuthenticationManager authenticationManager,
                          PasswordEncoder passwordEncoder,
                          JwtService jwtService) {
        this.userService = userService;
        this.roleService = roleService;
        this.userRoleService = userRoleService;
        this.verificationService = verificationService;
        this.authenticationManager = authenticationManager;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        if (this.userService.existsByEmail(request.email())) {
            throw new IllegalArgumentException("An account already exists for " + request.email());
        }

        User created = this.userService.create(UserFactory.createUser(
                request.email(),
                request.firstName(),
                request.middleName(),
                request.lastName(),
                request.cellPhone(),
                this.passwordEncoder.encode(request.password()),
                request.dateOfBirth(),
                AccountStatus.PENDING_VERIFICATION,
                request.campusId()));

        Role student = defaultRole();
        this.userRoleService.assignRole(created.getUserId(), student.getRoleId());

        this.verificationService.create(VerificationFactory.createVerification(
                created.getUserId(),
                VerificationType.EMAIL,
                UUID.randomUUID().toString(),
                LocalDateTime.now().plusHours(VERIFICATION_TTL_HOURS)));

        List<String> roles = List.of("ROLE_" + student.getName().name());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(tokenFor(created, roles));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        // Throws AuthenticationException on bad credentials -> 401 via GlobalExceptionHandler.
        Authentication authentication = this.authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(request.email(), request.password()));

        AuthenticatedUser principal = (AuthenticatedUser) authentication.getPrincipal();

        // Spring Security 7 also grants authentication-factor authorities such as
        // FACTOR_PASSWORD. Those are not application roles, so keep only ROLE_*.
        List<String> roles = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(authority -> authority.startsWith("ROLE_"))
                .toList();

        return ResponseEntity.ok(tokenFor(principal.getUser(), roles));
    }

    @PostMapping("/verify")
    public ResponseEntity<Map<String, Object>> verify(@Valid @RequestBody VerifyRequest request) {
        Verification consumed = this.verificationService.consumeToken(request.token());
        if (consumed == null) {
            throw new IllegalArgumentException("Verification token is invalid, expired or already used");
        }

        User user = this.userService.read(consumed.getUserId());
        if (user == null) {
            throw new IllegalArgumentException("Verification token does not belong to a known user");
        }

        this.userService.update(UserFactory.updateUser(
                user,
                user.getEmail(),
                user.getFirstName(),
                user.getMiddleName(),
                user.getLastName(),
                user.getCellPhone(),
                user.getPasswordHash(),
                user.getDateOfBirth(),
                AccountStatus.ACTIVE,
                user.getCampusId()));

        return ResponseEntity.ok(Map.of(
                "verified", true,
                "email", user.getEmail()));
    }

    @GetMapping("/me")
    public ResponseEntity<User> me(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUser principal)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(principal.getUser());
    }

    /** The STUDENT role every new account starts with, created on first use. */
    private Role defaultRole() {
        Role existing = this.roleService.findByName(RoleType.STUDENT);
        if (existing != null) {
            return existing;
        }
        return this.roleService.create(RoleFactory.createRole(
                RoleType.STUDENT, "Default role for a registered student"));
    }

    private AuthResponse tokenFor(User user, List<String> roles) {
        String token = this.jwtService.generateToken(user.getEmail(), Map.of(
                "uid", user.getUserId(),
                "roles", roles));

        return new AuthResponse(
                token,
                "Bearer",
                this.jwtService.getTtlSeconds(),
                user.getUserId(),
                user.getEmail(),
                roles);
    }

}
