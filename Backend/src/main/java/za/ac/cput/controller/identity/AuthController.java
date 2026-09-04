/*
 AuthController.java

 Registration, email-OTP verification, login and "who am I".

 The verification gate is the point of this class. Registration creates a
 PENDING_VERIFICATION account and emails a short code; it returns NO token. Only
 /verify-otp - which requires the code that was delivered to the
 @mycput.ac.za mailbox - issues a JWT. So a made-up student number cannot obtain
 credentials: it never receives the code.

 Every entity here (User, Role, UserRole, Verification) is built through its
 factory, never through setters.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 04 September 2026
*/

package za.ac.cput.controller.identity;

import java.util.List;
import java.util.Map;

import jakarta.validation.Valid;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.MailException;
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
import za.ac.cput.domain.identity.Role;
import za.ac.cput.domain.identity.User;
import za.ac.cput.dto.auth.AuthResponse;
import za.ac.cput.dto.auth.LoginRequest;
import za.ac.cput.dto.auth.RegisterRequest;
import za.ac.cput.dto.auth.RegistrationResponse;
import za.ac.cput.dto.auth.ResendOtpRequest;
import za.ac.cput.dto.auth.VerifyOtpRequest;
import za.ac.cput.factory.identity.RoleFactory;
import za.ac.cput.factory.identity.UserFactory;
import za.ac.cput.mail.EmailSender;
import za.ac.cput.security.JwtService;
import za.ac.cput.security.UniExchangeUserDetailsService.AuthenticatedUser;
import za.ac.cput.service.identity.IRoleService;
import za.ac.cput.service.identity.IUserRoleService;
import za.ac.cput.service.identity.IUserService;
import za.ac.cput.service.identity.OtpService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final IUserService userService;
    private final IRoleService roleService;
    private final IUserRoleService userRoleService;
    private final OtpService otpService;
    private final EmailSender emailSender;
    private final AuthenticationManager authenticationManager;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthController(IUserService userService,
                          IRoleService roleService,
                          IUserRoleService userRoleService,
                          OtpService otpService,
                          EmailSender emailSender,
                          AuthenticationManager authenticationManager,
                          PasswordEncoder passwordEncoder,
                          JwtService jwtService) {
        this.userService = userService;
        this.roleService = roleService;
        this.userRoleService = userRoleService;
        this.otpService = otpService;
        this.emailSender = emailSender;
        this.authenticationManager = authenticationManager;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    /** Creates a pending account and emails a code. Returns no token by design. */
    @PostMapping("/register")
    public ResponseEntity<RegistrationResponse> register(@Valid @RequestBody RegisterRequest request) {
        String email = normalise(request.email());

        if (this.userService.existsByEmail(email)) {
            throw new IllegalArgumentException("An account already exists for " + email);
        }

        User created = this.userService.create(UserFactory.createUser(
                email,
                request.firstName(),
                request.middleName(),
                request.lastName(),
                request.cellPhone(),
                this.passwordEncoder.encode(request.password()),
                request.dateOfBirth(),
                AccountStatus.PENDING_VERIFICATION,
                request.campusId()));

        this.userRoleService.assignRole(created.getUserId(), defaultRole().getRoleId());

        sendCode(created);

        return ResponseEntity.status(HttpStatus.ACCEPTED).body(new RegistrationResponse(
                email,
                "We sent a %d-digit code to %s. Enter it to activate your account."
                        .formatted(6, email),
                this.otpService.getTtlMinutes() * 60));
    }

    /** Exchanges a valid code for a token, activating the account. */
    @PostMapping("/verify-otp")
    public ResponseEntity<AuthResponse> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        User user = this.userService.findByEmail(normalise(request.email()));
        if (user == null) {
            // Same message as a wrong code, so this cannot be used to discover
            // which student numbers are registered.
            throw new IllegalArgumentException("That code is not valid. Request a new one.");
        }

        OtpService.Result result = this.otpService.check(user.getUserId(), request.code());
        switch (result) {
            case OK -> { /* fall through to activation below */ }
            case EXPIRED -> throw new IllegalArgumentException(
                    "That code has expired. Request a new one.");
            case TOO_MANY_ATTEMPTS -> throw new IllegalArgumentException(
                    "Too many incorrect attempts. Request a new code.");
            case NO_PENDING_CODE -> throw new IllegalArgumentException(
                    "There is no code waiting for this account. Request a new one.");
            case MISMATCH -> throw new IllegalArgumentException(
                    "That code is not valid. Check it and try again.");
        }

        User active = this.userService.update(UserFactory.verifyEmail(user));

        // Verifying logs the student straight in - no second trip to /login.
        return ResponseEntity.ok(tokenFor(active, rolesFor(active)));
    }

    /** Issues a replacement code, subject to a cooldown. */
    @PostMapping("/resend-otp")
    public ResponseEntity<RegistrationResponse> resendOtp(@Valid @RequestBody ResendOtpRequest request) {
        String email = normalise(request.email());
        User user = this.userService.findByEmail(email);

        if (user != null && user.getAccountStatus() == AccountStatus.PENDING_VERIFICATION) {
            long wait = this.otpService.resendCooldownRemaining(user.getUserId());
            if (wait > 0) {
                throw new IllegalArgumentException(
                        "Please wait %d seconds before requesting another code.".formatted(wait));
            }
            sendCode(user);
        }
        else {
            // Unknown or already-active account: say nothing either way, so the
            // endpoint cannot be used to enumerate registered student numbers.
            log.info("Resend requested for {} - no pending account, responding generically", email);
        }

        return ResponseEntity.status(HttpStatus.ACCEPTED).body(new RegistrationResponse(
                email,
                "If that account is awaiting verification, a new code is on its way.",
                this.otpService.getTtlMinutes() * 60));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        // Unverified accounts fail here as a DisabledException, which
        // GlobalExceptionHandler turns into 403 EMAIL_NOT_VERIFIED so the client
        // can send the student to the code screen. Bad credentials -> 401.
        Authentication authentication = this.authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(
                        normalise(request.email()), request.password()));

        AuthenticatedUser principal = (AuthenticatedUser) authentication.getPrincipal();

        // Spring Security 7 also grants authentication-factor authorities such as
        // FACTOR_PASSWORD. Those are not application roles, so keep only ROLE_*.
        List<String> roles = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(authority -> authority.startsWith("ROLE_"))
                .toList();

        return ResponseEntity.ok(tokenFor(principal.getUser(), roles));
    }

    @GetMapping("/me")
    public ResponseEntity<User> me(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUser principal)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(principal.getUser());
    }

    /** Issues a code and emails it. The plaintext never leaves this method. */
    private void sendCode(User user) {
        String code = this.otpService.issue(user.getUserId());

        try {
            this.emailSender.send(
                    user.getEmail(),
                    "Your UniExchange verification code",
                    """
                    Hi %s,

                    Your UniExchange verification code is:

                        %s

                    It expires in %d minutes. If you did not sign up for
                    UniExchange, you can ignore this email.

                    - The UniExchange team
                    """.formatted(user.getFirstName(), code, this.otpService.getTtlMinutes()));
        }
        catch (MailException ex) {
            log.error("Could not deliver the verification code to {}", user.getEmail(), ex);
            throw new IllegalStateException(
                    "We could not send the verification email. Please try again shortly.", ex);
        }
    }

    private List<String> rolesFor(User user) {
        return this.userRoleService.findByUserId(user.getUserId()).stream()
                .map(userRole -> this.roleService.read(userRole.getRoleId()))
                .filter(role -> role != null)
                .map(role -> "ROLE_" + role.getName().name())
                .toList();
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

    /** Student addresses are case-insensitive; store and compare them lowercased. */
    private static String normalise(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

}
