/*
 AuthController.java

 Registration, email-OTP verification, login and "who am I".

 The verification gate is the point of this class. Registration creates a
 PENDING_VERIFICATION account and emails a short code; it returns NO token. Only
 /verify-otp - which requires the code that was delivered to the
 @mycput.ac.za mailbox - issues a JWT. So a made-up student number cannot obtain
 credentials: it never receives the code.

 The code is also a second factor at sign-in, not just at registration. /login
 has two outcomes once the password checks out:

   trusted device  -> 200 with an AuthResponse, exactly as before.
   unknown device  -> 202 with a RegistrationResponse: a code has been sent, and
                      the client must finish at /verify-otp.

 A device becomes trusted only by completing /verify-otp, and the token proving
 it never replaces the password - it only ever skips the second factor. See
 DeviceTrustService.

 Moderators and admins use the same endpoints with a "mode". A normal sign-in
 always yields a STANDARD session; MODERATOR/ADMIN sessions come only from
 /login or /verify-otp with that mode (the frontend's hidden sign-in), or from
 /elevate, and only when the account holds the role. See SessionMode.

 Staff (@cput.ac.za) register exactly like students but receive FACULTY instead
 of STUDENT.

 Every entity here (User, Role, UserRole, Verification, TrustedDevice) is built
 through its factory, never through setters.

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
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import za.ac.cput.domain.enums.AccountStatus;
import za.ac.cput.domain.enums.RoleType;
import za.ac.cput.domain.identity.User;
import za.ac.cput.dto.auth.AuthResponse;
import za.ac.cput.dto.auth.ChangePasswordRequest;
import za.ac.cput.dto.auth.ElevateRequest;
import za.ac.cput.dto.auth.LoginRequest;
import za.ac.cput.dto.auth.RegisterRequest;
import za.ac.cput.dto.auth.RegistrationResponse;
import za.ac.cput.dto.auth.ResendOtpRequest;
import za.ac.cput.dto.auth.StepDownRequest;
import za.ac.cput.dto.auth.VerifyOtpRequest;
import za.ac.cput.exception.ServiceUnavailableException;
import za.ac.cput.factory.identity.UserFactory;
import za.ac.cput.mail.EmailSender;
import za.ac.cput.security.JwtService;
import za.ac.cput.security.SessionMode;
import za.ac.cput.security.UniExchangeUserDetailsService.AuthenticatedUser;
import za.ac.cput.service.identity.DeviceTrustService;
import za.ac.cput.service.identity.IRoleService;
import za.ac.cput.service.identity.IUserRoleService;
import za.ac.cput.service.identity.IUserService;
import za.ac.cput.service.identity.OtpService;
import za.ac.cput.service.identity.RoleAssignmentService;
import za.ac.cput.service.transactions.IWalletService;
import za.ac.cput.util.Helper;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final IUserService userService;
    private final IRoleService roleService;
    private final IUserRoleService userRoleService;
    private final OtpService otpService;
    private final DeviceTrustService deviceTrustService;
    private final EmailSender emailSender;
    private final AuthenticationManager authenticationManager;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final IWalletService walletService;
    private final RoleAssignmentService roleAssignments;

    public AuthController(IUserService userService,
                          IRoleService roleService,
                          IUserRoleService userRoleService,
                          OtpService otpService,
                          DeviceTrustService deviceTrustService,
                          EmailSender emailSender,
                          AuthenticationManager authenticationManager,
                          PasswordEncoder passwordEncoder,
                          JwtService jwtService,
                          IWalletService walletService,
                          RoleAssignmentService roleAssignments) {
        this.walletService = walletService;
        this.roleAssignments = roleAssignments;
        this.userService = userService;
        this.roleService = roleService;
        this.userRoleService = userRoleService;
        this.otpService = otpService;
        this.deviceTrustService = deviceTrustService;
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

        // Staff get FACULTY (shown as a "CPUT Staff" badge); everyone else STUDENT.
        this.roleAssignments.grant(created.getUserId(),
                Helper.isStaffEmail(email) ? RoleType.FACULTY : RoleType.STUDENT);

        /*
         Every student gets a wallet at registration, with a zero balance.

         Creating it lazily on first use looks tidier but is a money bug waiting to
         happen: releasing an escrow credits the SELLER, and if that seller had
         never opened the wallet page there would be no row to credit. The buyer
         would already have been debited. A row that costs nothing and always
         exists removes that entire failure mode.
        */
        this.walletService.getOrCreateForUser(created.getUserId());

        sendCode(created);

        return ResponseEntity.status(HttpStatus.ACCEPTED).body(new RegistrationResponse(
                email,
                "We sent a %d-digit code to %s. Enter it to activate your account."
                        .formatted(6, email),
                this.otpService.getTtlMinutes() * 60));
    }

    /**
     * Exchanges a valid code for a token, activating the account, and trusts the
     * browser it came from. This is the ONLY place a device becomes trusted -
     * which is what makes "skip the OTP" safe: it can only ever be earned by
     * completing an OTP.
     */
    @PostMapping("/verify-otp")
    public ResponseEntity<AuthResponse> verifyOtp(
            @Valid @RequestBody VerifyOtpRequest request,
            @RequestHeader(value = "User-Agent", required = false) String userAgent) {
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

        // Already-verified accounts reach here on an ordinary sign-in, where the
        // code is a second factor rather than an activation. verifyEmail is
        // idempotent enough to re-run, but there is no reason to.
        User active = user.getEmailVerifiedAt() == null
                ? this.userService.update(UserFactory.verifyEmail(user))
                : user;

        // An account named in app.bootstrap.* that registered after startup.
        this.roleAssignments.applyBootstrap(active);

        SessionMode mode = requireModeAllowed(active, request.mode());

        /*
         The code alone never opens an elevated session: it proves the mailbox,
         not the password. An elevated mode needs the ticket /login issued after
         checking the password. Without one, fall back to an ordinary session.
        */
        if (mode != SessionMode.STANDARD
                && this.jwtService.modeFromLoginTicket(request.loginTicket(), active.getEmail()) != mode) {
            log.warn("Elevated verify-otp for userId {} without a valid login ticket - opening STANDARD",
                    active.getUserId());
            mode = SessionMode.STANDARD;
        }

        String deviceToken = this.deviceTrustService.issue(
                active.getUserId(), userAgent, request.rememberMe());

        // Verifying logs the student straight in - no second trip to /login.
        return ResponseEntity.ok(
                tokenFor(active, rolesFor(active), request.rememberMe(), deviceToken, mode));
    }

    /** Issues a replacement code, subject to a cooldown. */
    @PostMapping("/resend-otp")
    public ResponseEntity<RegistrationResponse> resendOtp(@Valid @RequestBody ResendOtpRequest request) {
        String email = normalise(request.email());
        User user = this.userService.findByEmail(email);

        /*
         Both kinds of pending code land here: activating a new account, and the
         second factor for an established one signing in from a new device.
         Limiting this to PENDING_VERIFICATION would leave "Send a new code" dead
         on the sign-in path, which is the more common one now.

         SUSPENDED and DEACTIVATED accounts are deliberately excluded - they must
         not be able to pull a code at all.
        */
        boolean mayReceiveCode = user != null
                && (user.getAccountStatus() == AccountStatus.PENDING_VERIFICATION
                        || user.getAccountStatus() == AccountStatus.ACTIVE);

        if (mayReceiveCode) {
            long wait = this.otpService.resendCooldownRemaining(user.getUserId());
            if (wait > 0) {
                throw new IllegalArgumentException(
                        "Please wait %d seconds before requesting another code.".formatted(wait));
            }
            sendCode(user);
        }
        else {
            // Unknown or closed account: say nothing either way, so the endpoint
            // cannot be used to enumerate registered student numbers.
            log.info("Resend requested for {} - no eligible account, responding generically", email);
        }

        return ResponseEntity.status(HttpStatus.ACCEPTED).body(new RegistrationResponse(
                email,
                "If that account needs a code, a new one is on its way.",
                this.otpService.getTtlMinutes() * 60));
    }

    /**
     * Signs in. The password is always required; the emailed code is required on
     * top of it unless this browser has been trusted before.
     *
     * @return 200 with a token when the device is trusted, or 202 with no token
     *         when a code has just been sent and /verify-otp must finish the job.
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequest request,
            @RequestHeader(value = "User-Agent", required = false) String userAgent) {
        // Unverified accounts fail here as a DisabledException, which
        // GlobalExceptionHandler turns into 403 EMAIL_NOT_VERIFIED so the client
        // can send the student to the code screen. Bad credentials -> 401.
        //
        // This runs FIRST, so a wrong password never triggers an email. Otherwise
        // /login would be a free way to spam any student's inbox.
        Authentication authentication = this.authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(
                        normalise(request.email()), request.password()));

        AuthenticatedUser principal = (AuthenticatedUser) authentication.getPrincipal();
        User user = principal.getUser();

        // Checked before any code is emailed, so the hidden sign-in cannot be
        // used to spam a student's inbox either.
        SessionMode mode = requireModeAllowed(user, request.mode());

        // Spring Security 7 also grants authentication-factor authorities such as
        // FACTOR_PASSWORD. Those are not application roles, so keep only ROLE_*.
        List<String> roles = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(authority -> authority.startsWith("ROLE_"))
                .toList();

        if (this.deviceTrustService.isTrusted(user.getUserId(), request.deviceToken())) {
            // Known browser: password alone is enough. The student may have
            // changed their mind about "Remember me" though, so let the device
            // catch up - realign returns a replacement token only when it did.
            String replacement = this.deviceTrustService.realign(
                    user.getUserId(), request.deviceToken(), userAgent, request.rememberMe());

            return ResponseEntity.ok(tokenFor(user, roles, request.rememberMe(), replacement, mode));
        }

        /*
         The same 60-second cooldown as /resend-otp. Without it a correct password
         could be replayed to email a code on every request. Inside the cooldown the
         code already sent is still valid, so answer exactly as if one had just gone
         out - the student finishes at /verify-otp either way.
        */
        if (this.otpService.resendCooldownRemaining(user.getUserId()) > 0) {
            log.info("Login from an untrusted device for userId {} - a code was sent moments ago, not resending",
                    user.getUserId());
        }
        else {
            log.info("Login from an untrusted device for userId {} - sending a code", user.getUserId());
            sendCode(user);
        }

        String ticket = mode == SessionMode.STANDARD
                ? null
                : this.jwtService.mintLoginTicket(user.getEmail(), mode);

        return ResponseEntity.status(HttpStatus.ACCEPTED).body(new RegistrationResponse(
                user.getEmail(),
                "We sent a code to %s to confirm it's you.".formatted(user.getEmail()),
                this.otpService.getTtlMinutes() * 60,
                ticket));
    }

    @GetMapping("/me")
    public ResponseEntity<User> me(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUser principal)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(principal.getUser());
    }

    /**
     * Opens a moderator or admin session for someone already signed in. The
     * password is asked for again; the device is already trusted because the
     * caller holds a token, so no code is sent.
     */
    @PostMapping("/elevate")
    public ResponseEntity<AuthResponse> elevate(@Valid @RequestBody ElevateRequest request,
                                                Authentication authentication) {
        User current = currentUser(authentication);

        /*
         400, not 401: the caller IS signed in, and a 401 would make the
         frontend drop their whole session over a mistyped password. One message
         for both failures, as at /login.
        */
        SessionMode mode = SessionMode.parse(request.mode());
        boolean allowed = mode != SessionMode.STANDARD
                && mode.permittedFor(this.roleAssignments.rolesOf(current.getUserId()))
                && this.passwordEncoder.matches(request.password(), current.getPasswordHash());
        if (!allowed) {
            log.warn("Refused elevation to {} for userId {}", mode, current.getUserId());
            throw new IllegalArgumentException("That password is not correct.");
        }

        return ResponseEntity.ok(tokenFor(current, rolesFor(current), false, null, mode));
    }

    /** Leaves moderator/admin mode, handing back an ordinary session. */
    @PostMapping("/step-down")
    public ResponseEntity<AuthResponse> stepDown(@RequestBody(required = false) StepDownRequest request,
                                                 Authentication authentication) {
        User current = currentUser(authentication);
        boolean remembered = request != null && Boolean.TRUE.equals(request.rememberMe());
        return ResponseEntity.ok(
                tokenFor(current, rolesFor(current), remembered, null, SessionMode.STANDARD));
    }

    /**
     * Changes the caller's own password. Every other session is signed out
     * (credentialsChangedAt), and this one gets a fresh token so it carries on.
     */
    @PostMapping("/change-password")
    public ResponseEntity<AuthResponse> changePassword(@Valid @RequestBody ChangePasswordRequest request,
                                                       Authentication authentication) {
        User current = currentUser(authentication);

        if (!this.passwordEncoder.matches(request.currentPassword(), current.getPasswordHash())) {
            throw new IllegalArgumentException("Your current password is not correct.");
        }
        if (request.currentPassword().equals(request.newPassword())) {
            throw new IllegalArgumentException("Choose a password you have not used just now.");
        }

        User updated = this.userService.update(UserFactory.changePassword(
                current, this.passwordEncoder.encode(request.newPassword())));

        SessionMode mode = authentication.getPrincipal() instanceof AuthenticatedUser principal
                ? principal.getMode()
                : SessionMode.STANDARD;
        boolean remembered = Boolean.TRUE.equals(request.rememberMe()) && mode == SessionMode.STANDARD;

        return ResponseEntity.ok(tokenFor(updated, rolesFor(updated), remembered, null, mode));
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

                    It expires in %d minutes.

                    If you did not sign up for UniExchange or try to sign in just
                    now, you can ignore this email - someone may have typed your
                    address by mistake. Nobody can get into your account with this
                    code alone; your password is still needed.

                    - The UniExchange team
                    """.formatted(user.getFirstName(), code, this.otpService.getTtlMinutes()));
        }
        catch (MailException ex) {
            log.error("Could not deliver the verification code to {}", user.getEmail(), ex);
            throw new ServiceUnavailableException(
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

    private static User currentUser(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUser principal)) {
            throw new BadCredentialsException("Not signed in");
        }
        return principal.getUser();
    }

    /*
     Refuses an elevated mode the account does not hold with the SAME error as a
     wrong password, so the hidden sign-in cannot be used to discover who the
     moderators are.
    */
    private SessionMode requireModeAllowed(User user, String requested) {
        SessionMode mode = SessionMode.parse(requested);
        if (!mode.permittedFor(this.roleAssignments.rolesOf(user.getUserId()))) {
            log.warn("Refused {} sign-in for userId {} - role not held", mode, user.getUserId());
            throw new BadCredentialsException("Role not held");
        }
        return mode;
    }

    /**
     * Builds the signed-in response.
     *
     * @param remembered  "Remember me" was ticked, so the session lasts weeks
     *                    rather than an hour. Without this the checkbox would
     *                    only skip the code and still sign the student out
     *                    hourly, since there is no refresh endpoint.
     * @param deviceToken the freshly minted device token, or null when the
     *                    browser already holds one.
     */
    private AuthResponse tokenFor(User user, List<String> roles,
                                  boolean remembered, String deviceToken, SessionMode mode) {
        long ttlSeconds = mode == SessionMode.STANDARD
                ? this.jwtService.ttlSecondsFor(remembered)
                : this.jwtService.getElevatedTtlSeconds();

        String token = this.jwtService.generateToken(user.getEmail(), Map.of(
                "uid", user.getUserId(),
                "roles", roles,
                "mode", mode.name()), ttlSeconds);

        return new AuthResponse(
                token,
                "Bearer",
                ttlSeconds,
                user.getUserId(),
                user.getEmail(),
                roles,
                deviceToken,
                mode.name());
    }

    /** Student addresses are case-insensitive; store and compare them lowercased. */
    private static String normalise(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

}
