/*
 SecurityHardeningTest.java

 Regression tests for holes found in the moderator/admin security review:

   - the generic /api/verifications CRUD let any student plant an OTP for any
     account (including an admin) and then sign in as them;
   - /verify-otp opened an elevated session from the emailed code alone, with no
     proof the password had been checked;
   - /api/reports writes were open, so a reported student could delete or
     "resolve" the report against them in a moderator's name;
   - a moderator could rename an account onto a bootstrap admin address.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 25 September 2026
*/

package za.ac.cput.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import com.jayway.jsonpath.JsonPath;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import za.ac.cput.domain.enums.AccountStatus;
import za.ac.cput.domain.enums.ReportStatus;
import za.ac.cput.domain.enums.ReportTargetType;
import za.ac.cput.domain.enums.RoleType;
import za.ac.cput.domain.identity.User;
import za.ac.cput.domain.trust.Report;
import za.ac.cput.factory.identity.UserFactory;
import za.ac.cput.factory.trust.ReportFactory;
import za.ac.cput.mail.EmailSender;
import za.ac.cput.repository.identity.UserRepository;
import za.ac.cput.repository.trust.ReportRepository;
import za.ac.cput.security.JwtService;
import za.ac.cput.security.SessionMode;
import za.ac.cput.service.identity.OtpService;
import za.ac.cput.service.identity.RoleAssignmentService;

@SpringBootTest(properties = "app.bootstrap.admins=reserved.admin@cput.ac.za")
class SecurityHardeningTest {

    private static final AtomicInteger NEXT = new AtomicInteger(800_000);
    private static final String PASSWORD = "correct-horse-battery";

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository users;
    @Autowired private ReportRepository reports;
    @Autowired private RoleAssignmentService roles;
    @Autowired private OtpService otpService;
    @Autowired private JwtService jwtService;
    @Autowired private PasswordEncoder passwordEncoder;

    @MockitoBean
    private EmailSender emailSender;

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        this.mvc = MockMvcBuilders.webAppContextSetup(this.context).apply(springSecurity()).build();
    }

    private User user(RoleType... grants) {
        int n = NEXT.incrementAndGet();
        User saved = this.users.save(UserFactory.createUser(
                n + "@mycput.ac.za", "Test", null, "User" + n, null,
                this.passwordEncoder.encode(PASSWORD), LocalDate.of(2000, 1, 1), AccountStatus.ACTIVE, null));
        this.roles.grant(saved.getUserId(), RoleType.STUDENT);
        for (RoleType role : grants) {
            this.roles.grant(saved.getUserId(), role);
        }
        return saved;
    }

    private String token(User user, SessionMode mode) {
        return "Bearer " + this.jwtService.generateToken(user.getEmail(), Map.of("mode", mode.name()));
    }

    private String verifyBody(User user, String code, String mode, String ticket) {
        return "{\"email\":\"%s\",\"code\":\"%s\",\"rememberMe\":false,\"mode\":%s,\"loginTicket\":%s}".formatted(
                user.getEmail(), code,
                mode == null ? "null" : "\"" + mode + "\"",
                ticket == null ? "null" : "\"" + ticket + "\"");
    }

    // ---- OTP planting

    @Test
    void theVerificationCrudIsGone() throws Exception {
        User student = user();
        User admin = user(RoleType.ADMIN);

        this.mvc.perform(post("/api/verifications").header("Authorization", token(student, SessionMode.STANDARD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":%d,\"verificationType\":\"EMAIL\",\"token\":\"x\",\"expiresAt\":\"2099-01-01T00:00:00\"}"
                                .formatted(admin.getUserId())))
                .andExpect(status().isForbidden());
        this.mvc.perform(get("/api/verifications").header("Authorization", token(admin, SessionMode.ADMIN)))
                .andExpect(status().isForbidden());
    }

    // ---- elevated sign-in needs the password, not just the code

    @Test
    void aCodeAloneNeverOpensAnElevatedSession() throws Exception {
        User moderator = user(RoleType.MODERATOR);
        String code = this.otpService.issue(moderator.getUserId());

        this.mvc.perform(post("/api/auth/verify-otp").contentType(MediaType.APPLICATION_JSON)
                        .content(verifyBody(moderator, code, "MODERATOR", null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("STANDARD"));
    }

    @Test
    void aForgedOrForeignTicketIsIgnored() throws Exception {
        User moderator = user(RoleType.MODERATOR);
        User other = user(RoleType.MODERATOR);
        // A real ticket, but minted for someone else.
        String foreign = this.jwtService.mintLoginTicket(other.getEmail(), SessionMode.MODERATOR);
        // A bearer token is signed with a different key, so it is not a ticket.
        String bearer = this.jwtService.generateToken(moderator.getEmail(), Map.of("mode", "MODERATOR"));

        for (String ticket : new String[] {foreign, bearer}) {
            String code = this.otpService.issue(moderator.getUserId());
            this.mvc.perform(post("/api/auth/verify-otp").contentType(MediaType.APPLICATION_JSON)
                            .content(verifyBody(moderator, code, "MODERATOR", ticket)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.mode").value("STANDARD"));
        }
    }

    @Test
    void thePasswordCheckedLoginTicketCarriesTheModeThroughTheCode() throws Exception {
        User moderator = user(RoleType.MODERATOR);

        String body = this.mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"%s\",\"rememberMe\":false,\"mode\":\"MODERATOR\"}"
                                .formatted(moderator.getEmail(), PASSWORD)))
                .andExpect(status().isAccepted())
                .andReturn().getResponse().getContentAsString();
        String ticket = JsonPath.read(body, "$.loginTicket");
        assertNotNull(ticket);

        String code = this.otpService.issue(moderator.getUserId());
        this.mvc.perform(post("/api/auth/verify-otp").contentType(MediaType.APPLICATION_JSON)
                        .content(verifyBody(moderator, code, "MODERATOR", ticket)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("MODERATOR"));
    }

    @Test
    void anOrdinaryLoginGetsNoTicket() throws Exception {
        User student = user();
        this.mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"%s\",\"rememberMe\":false}"
                                .formatted(student.getEmail(), PASSWORD)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.loginTicket").doesNotExist());
    }

    // ---- reports

    @Test
    void aStudentCannotDeleteOrResolveReports() throws Exception {
        User reporter = user();
        User reported = user();
        User moderator = user(RoleType.MODERATOR);
        Report report = this.reports.save(ReportFactory.createReport(
                reporter.getUserId(), ReportTargetType.USER, reported.getUserId(), "Scam", ReportStatus.PENDING));
        String studentToken = token(reported, SessionMode.STANDARD);

        this.mvc.perform(delete("/api/reports/" + report.getReportId()).header("Authorization", studentToken))
                .andExpect(status().isForbidden());
        this.mvc.perform(patch("/api/reports/" + report.getReportId() + "/resolve")
                        .param("handledBy", String.valueOf(moderator.getUserId()))
                        .header("Authorization", studentToken))
                .andExpect(status().isForbidden());
        this.mvc.perform(get("/api/reports").header("Authorization", studentToken))
                .andExpect(status().isForbidden());

        // A moderator resolves it, and the resolution is recorded against them.
        this.mvc.perform(patch("/api/reports/" + report.getReportId() + "/resolve")
                        .param("handledBy", String.valueOf(reporter.getUserId()))
                        .header("Authorization", token(moderator, SessionMode.MODERATOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.handledBy").value(moderator.getUserId()));
    }

    @Test
    void aReportIsAlwaysFiledAsTheCaller() throws Exception {
        User reporter = user();
        User impersonated = user();

        String body = this.mvc.perform(post("/api/reports").header("Authorization", token(reporter, SessionMode.STANDARD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reporterId\":%d,\"targetType\":\"USER\",\"targetId\":%d,\"category\":\"SPAM\",\"status\":\"RESOLVED\"}"
                                .formatted(impersonated.getUserId(), impersonated.getUserId())))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        assertEquals(reporter.getUserId(), ((Number) JsonPath.read(body, "$.reporterId")).longValue());
        assertEquals("PENDING", JsonPath.read(body, "$.status"));
    }

    // ---- bootstrap addresses

    @Test
    void aModeratorCannotRenameAnAccountOntoABootstrapAddress() throws Exception {
        User moderator = user(RoleType.MODERATOR);
        User accomplice = user();

        this.mvc.perform(patch("/api/moderation/users/" + accomplice.getUserId())
                        .header("Authorization", token(moderator, SessionMode.MODERATOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"reserved.admin@cput.ac.za\"}"))
                .andExpect(status().isForbidden());

        assertFalse(this.roles.has(accomplice.getUserId(), RoleType.ADMIN));
    }

    @Test
    void bootstrapNeedsAVerifiedAddress() {
        User unverified = this.users.save(UserFactory.createUser(
                "reserved.admin@cput.ac.za", "Res", null, "Erved", null,
                this.passwordEncoder.encode(PASSWORD), null, AccountStatus.ACTIVE, null));

        this.roles.applyBootstrap(unverified);
        assertFalse(this.roles.has(unverified.getUserId(), RoleType.ADMIN));

        User verified = this.users.save(UserFactory.verifyEmail(unverified));
        this.roles.applyBootstrap(verified);
        assertTrue(this.roles.has(verified.getUserId(), RoleType.ADMIN));
    }

}
