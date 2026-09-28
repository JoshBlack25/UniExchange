/*
 ModerationSecurityTest.java

 Moderator / admin access end to end: real JWTs through the real
 JwtAuthenticationFilter and SecurityConfig, so the tests prove what a request
 can actually do, not what a mocked principal claims.

 The rules under test:
   - a student cannot reach moderation, admin or the generic identity CRUD;
   - holding the MODERATOR role is not enough - the session must be opened in
     moderator mode (hidden sign-in or /elevate);
   - a moderator session cannot do admin things, or act on admin accounts;
   - suspending a user or resetting their password ends their existing sessions;
   - low reviews alert every moderator and land in the flagged queue;
   - removed content disappears from public reads and can be restored;
   - staff (@cput.ac.za) register as FACULTY with a STAFF affiliation.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 24 September 2026
*/

package za.ac.cput.controller;

import static org.hamcrest.Matchers.hasItem;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
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

import za.ac.cput.domain.communication.Notification;
import za.ac.cput.domain.enums.AccountStatus;
import za.ac.cput.domain.enums.BulletinPostStatus;
import za.ac.cput.domain.enums.ListingStatus;
import za.ac.cput.domain.enums.PaymentMethod;
import za.ac.cput.domain.enums.RoleType;
import za.ac.cput.domain.enums.TransactionStatus;
import za.ac.cput.domain.identity.User;
import za.ac.cput.domain.marketplace.Listing;
import za.ac.cput.factory.identity.UserFactory;
import za.ac.cput.factory.marketplace.ListingFactory;
import za.ac.cput.factory.transactions.TransactionFactory;
import za.ac.cput.mail.EmailSender;
import za.ac.cput.repository.communication.NotificationRepository;
import za.ac.cput.repository.community.BulletinPostRepository;
import za.ac.cput.repository.identity.UserRepository;
import za.ac.cput.repository.marketplace.ListingRepository;
import za.ac.cput.repository.transactions.TransactionRepository;
import za.ac.cput.security.JwtService;
import za.ac.cput.security.SessionMode;
import za.ac.cput.service.identity.RoleAssignmentService;
import za.ac.cput.service.trust.ReviewSubmissionService;

@SpringBootTest
class ModerationSecurityTest {

    private static final AtomicInteger NEXT = new AtomicInteger(700_000);
    private static final String PASSWORD = "correct-horse-battery";

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository users;
    @Autowired private ListingRepository listings;
    @Autowired private BulletinPostRepository posts;
    @Autowired private TransactionRepository transactions;
    @Autowired private NotificationRepository notifications;
    @Autowired private RoleAssignmentService roles;
    @Autowired private ReviewSubmissionService reviewSubmission;
    @Autowired private JwtService jwtService;
    @Autowired private PasswordEncoder passwordEncoder;

    @MockitoBean
    private EmailSender emailSender;

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        this.mvc = MockMvcBuilders.webAppContextSetup(this.context).apply(springSecurity()).build();
    }

    // ---- fixtures

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

    private Listing listing(User seller) {
        return this.listings.save(ListingFactory.createListing(
                seller.getUserId(), 1, 1, "Calculus textbook", "Barely used",
                new BigDecimal("150.00"), ListingStatus.ACTIVE));
    }

    // ---- who can reach what

    @Test
    void aStudentCannotReachModerationAdminOrIdentityCrud() throws Exception {
        String student = token(user(), SessionMode.STANDARD);

        this.mvc.perform(get("/api/moderation/overview").header("Authorization", student))
                .andExpect(status().isForbidden());
        this.mvc.perform(get("/api/admin/staff").header("Authorization", student))
                .andExpect(status().isForbidden());
        this.mvc.perform(post("/api/user-roles/assign").param("userId", "1").param("roleId", "1")
                        .header("Authorization", student))
                .andExpect(status().isForbidden());
        this.mvc.perform(put("/api/users/1").header("Authorization", student)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
        this.mvc.perform(get("/api/users").header("Authorization", student))
                .andExpect(status().isForbidden());
    }

    @Test
    void asksForModeEvenFromATokenThatClaimsIt() throws Exception {
        // A student forging mode=ADMIN in a token they could never mint anyway:
        // the database role is still required.
        String forged = token(user(), SessionMode.ADMIN);
        this.mvc.perform(get("/api/moderation/overview").header("Authorization", forged))
                .andExpect(status().isForbidden());
    }

    @Test
    void theModeratorRoleAloneIsNotEnough_theSessionMustBeElevated() throws Exception {
        User moderator = user(RoleType.MODERATOR);
        String standard = token(moderator, SessionMode.STANDARD);

        this.mvc.perform(get("/api/moderation/overview").header("Authorization", standard))
                .andExpect(status().isForbidden());

        String body = this.mvc.perform(post("/api/auth/elevate").header("Authorization", standard)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"" + PASSWORD + "\",\"mode\":\"MODERATOR\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("MODERATOR"))
                .andReturn().getResponse().getContentAsString();
        String elevated = "Bearer " + JsonPath.<String>read(body, "$.token");

        this.mvc.perform(get("/api/moderation/overview").header("Authorization", elevated))
                .andExpect(status().isOk());
        // Moderator mode is not admin mode.
        this.mvc.perform(get("/api/admin/staff").header("Authorization", elevated))
                .andExpect(status().isForbidden());
    }

    @Test
    void elevationRefusesAWrongPasswordOrAMissingRole() throws Exception {
        User moderator = user(RoleType.MODERATOR);
        this.mvc.perform(post("/api/auth/elevate").header("Authorization", token(moderator, SessionMode.STANDARD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"wrong-password\",\"mode\":\"MODERATOR\"}"))
                .andExpect(status().isBadRequest());

        // Right password, but a moderator asking for admin mode.
        this.mvc.perform(post("/api/auth/elevate").header("Authorization", token(moderator, SessionMode.STANDARD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"" + PASSWORD + "\",\"mode\":\"ADMIN\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void theHiddenSignInRefusesAccountsWithoutTheRole_likeAWrongPassword() throws Exception {
        User student = user();
        this.mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + student.getEmail() + "\",\"password\":\"" + PASSWORD
                                + "\",\"rememberMe\":false,\"mode\":\"MODERATOR\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
    }

    @Test
    void anAdminSessionCanDoBoth() throws Exception {
        String admin = token(user(RoleType.ADMIN), SessionMode.ADMIN);
        this.mvc.perform(get("/api/moderation/overview").header("Authorization", admin))
                .andExpect(status().isOk());
        this.mvc.perform(get("/api/admin/staff").header("Authorization", admin))
                .andExpect(status().isOk());
    }

    // ---- bans and resets end sessions

    @Test
    void suspendingAUserEndsTheirExistingSession() throws Exception {
        String moderator = token(user(RoleType.MODERATOR), SessionMode.MODERATOR);
        User student = user();
        String studentToken = token(student, SessionMode.STANDARD);

        this.mvc.perform(get("/api/auth/me").header("Authorization", studentToken)).andExpect(status().isOk());

        this.mvc.perform(post("/api/moderation/users/" + student.getUserId() + "/suspend")
                        .header("Authorization", moderator)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"SCAM_OR_FRAUD\",\"details\":\"Posted three fake laptop listings and took deposits.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accountStatus").value("SUSPENDED"));

        this.mvc.perform(get("/api/auth/me").header("Authorization", studentToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCOUNT_SUSPENDED"));

        // And they cannot sign back in.
        this.mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + student.getEmail() + "\",\"password\":\"" + PASSWORD + "\",\"rememberMe\":false}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCOUNT_SUSPENDED"));
    }

    @Test
    void resettingAPasswordEmailsItAndEndsExistingSessions() throws Exception {
        String moderator = token(user(RoleType.MODERATOR), SessionMode.MODERATOR);
        User student = user();
        String studentToken = token(student, SessionMode.STANDARD);

        this.mvc.perform(post("/api/moderation/users/" + student.getUserId() + "/reset-password")
                        .header("Authorization", moderator))
                .andExpect(status().isNoContent());

        verify(this.emailSender).send(eq(student.getEmail()), eq("Your UniExchange password was reset"), anyString());
        this.mvc.perform(get("/api/auth/me").header("Authorization", studentToken))
                .andExpect(status().isUnauthorized());
        User reloaded = this.users.findById(student.getUserId()).orElseThrow();
        assertFalse(this.passwordEncoder.matches(PASSWORD, reloaded.getPasswordHash()));
    }

    @Test
    void changingYourOwnPasswordKeepsThisSessionButEndsOldOnes() throws Exception {
        User student = user();
        String old = token(student, SessionMode.STANDARD);

        String body = this.mvc.perform(post("/api/auth/change-password").header("Authorization", old)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"" + PASSWORD + "\",\"newPassword\":\"a-brand-new-one\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String fresh = "Bearer " + JsonPath.<String>read(body, "$.token");

        this.mvc.perform(get("/api/auth/me").header("Authorization", fresh)).andExpect(status().isOk());
        this.mvc.perform(get("/api/auth/me").header("Authorization", old)).andExpect(status().isUnauthorized());
    }

    // ---- hierarchy

    @Test
    void aModeratorCannotActOnAnAdminOrThemselves() throws Exception {
        User moderator = user(RoleType.MODERATOR);
        String session = token(moderator, SessionMode.MODERATOR);
        User admin = user(RoleType.ADMIN);

        this.mvc.perform(post("/api/moderation/users/" + admin.getUserId() + "/suspend").header("Authorization", session))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Only an admin can act on a moderator or admin account."));
        this.mvc.perform(post("/api/moderation/users/" + moderator.getUserId() + "/suspend").header("Authorization", session))
                .andExpect(status().isForbidden());
    }

    @Test
    void anAdminManagesStaffButCannotRemoveThemselves() throws Exception {
        User admin = user(RoleType.ADMIN);
        String session = token(admin, SessionMode.ADMIN);
        User student = user();

        this.mvc.perform(post("/api/admin/users/" + student.getUserId() + "/moderator").header("Authorization", session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roles", hasItem("MODERATOR")));
        assertTrue(this.roles.has(student.getUserId(), RoleType.MODERATOR));

        this.mvc.perform(delete("/api/admin/users/" + student.getUserId() + "/moderator").header("Authorization", session))
                .andExpect(status().isOk());
        assertFalse(this.roles.has(student.getUserId(), RoleType.MODERATOR));

        this.mvc.perform(delete("/api/admin/users/" + admin.getUserId() + "/admin").header("Authorization", session))
                .andExpect(status().isForbidden());
    }

    // ---- content

    @Test
    void aRemovedListingIsHiddenUntilRestored() throws Exception {
        String moderator = token(user(RoleType.MODERATOR), SessionMode.MODERATOR);
        User seller = user();
        Listing listing = listing(seller);

        this.mvc.perform(post("/api/moderation/listings/" + listing.getListingId() + "/remove")
                        .header("Authorization", moderator)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"PROHIBITED_ITEM\",\"details\":\"Counterfeit branded sneakers, against marketplace rules.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REMOVED"));

        this.mvc.perform(get("/api/listings/" + listing.getListingId())).andExpect(status().isNotFound());
        // The owner cannot quietly put it back up.
        this.mvc.perform(put("/api/listings/" + listing.getListingId())
                        .header("Authorization", token(seller, SessionMode.STANDARD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sellerId\":" + seller.getUserId() + ",\"categoryId\":1,\"campusId\":1,\"title\":\"Back\",\"price\":10,\"status\":\"ACTIVE\"}"))
                .andExpect(status().isConflict());

        List<Notification> sellerNotifications = this.notifications.findByUserIdOrderByCreatedAtDesc(seller.getUserId());
        assertTrue(sellerNotifications.stream().anyMatch(n -> n.getContent().contains("Counterfeit")));

        this.mvc.perform(post("/api/moderation/listings/" + listing.getListingId() + "/restore")
                        .header("Authorization", moderator))
                .andExpect(status().isOk());
        this.mvc.perform(get("/api/listings/" + listing.getListingId())).andExpect(status().isOk());
    }

    @Test
    void studentsCannotPostAnnouncementsOrPostAsSomeoneElse() throws Exception {
        User student = user();
        User victim = user();

        String body = this.mvc.perform(post("/api/bulletin-posts").header("Authorization", token(student, SessionMode.STANDARD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"authorId\":" + victim.getUserId() + ",\"title\":\"Official\",\"content\":\"Exams cancelled\","
                                + "\"status\":\"PUBLISHED\",\"isFacultyAnnouncement\":true,\"category\":\"GENERAL\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        assertEquals(student.getUserId(), JsonPath.<Number>read(body, "$.authorId").longValue());
        assertFalse(JsonPath.<Boolean>read(body, "$.facultyAnnouncement"));
    }

    @Test
    void moderatorAnnouncementsReachCampusNews() throws Exception {
        String moderator = token(user(RoleType.MODERATOR), SessionMode.MODERATOR);

        String body = this.mvc.perform(post("/api/moderation/announcements").header("Authorization", moderator)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Library hours\",\"content\":\"Open until 22:00\",\"category\":\"EVENT\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long id = JsonPath.<Number>read(body, "$.bulletinPostId").longValue();

        this.mvc.perform(get("/api/bulletin-posts/announcements"))
                .andExpect(jsonPath("$[*].bulletinPostId", hasItem((int) id)));

        this.mvc.perform(delete("/api/moderation/announcements/" + id).header("Authorization", moderator))
                .andExpect(status().isNoContent());
        assertEquals(BulletinPostStatus.REMOVED, this.posts.findById(id).orElseThrow().getStatus());
    }

    // ---- reviews

    @Test
    void aLowReviewAlertsEveryModeratorAndCanBeDismissed() throws Exception {
        User moderator = user(RoleType.MODERATOR);
        User admin = user(RoleType.ADMIN);
        User buyer = user();
        User seller = user();
        Listing listing = listing(seller);
        long transactionId = this.transactions.save(TransactionFactory.createTransaction(
                buyer.getUserId(), seller.getUserId(), listing.getListingId(),
                new BigDecimal("150.00"), PaymentMethod.WALLET, TransactionStatus.COMPLETED)).getTransactionId();

        long reviewId = this.reviewSubmission.submit(buyer.getUserId(), transactionId, 1, "Never showed up").getReviewId();

        for (User staff : List.of(moderator, admin)) {
            assertTrue(this.notifications.findByUserIdOrderByCreatedAtDesc(staff.getUserId()).stream()
                    .anyMatch(n -> "REVIEW".equals(n.getEntityType()) && n.getEntityId() == reviewId));
        }

        String session = token(moderator, SessionMode.MODERATOR);
        this.mvc.perform(get("/api/moderation/reviews/flagged").header("Authorization", session))
                .andExpect(jsonPath("$[*].reviewId", hasItem((int) reviewId)));

        this.mvc.perform(post("/api/moderation/reviews/" + reviewId + "/dismiss").header("Authorization", session))
                .andExpect(status().isNoContent());

        String after = this.mvc.perform(get("/api/moderation/reviews/flagged").header("Authorization", session))
                .andReturn().getResponse().getContentAsString();
        assertFalse(after.contains("\"reviewId\":" + reviewId + ","));
    }

    // ---- staff accounts

    @Test
    void staffRegisterAsFacultyWithAStaffBadge() throws Exception {
        String email = "smithj" + NEXT.incrementAndGet() + "@cput.ac.za";
        this.mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"firstName\":\"John\",\"lastName\":\"Smith\","
                                + "\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isAccepted());

        User staff = this.users.findByEmail(email).orElseThrow();
        assertEquals("STAFF", staff.getAffiliation());
        assertTrue(this.roles.has(staff.getUserId(), RoleType.FACULTY));
        assertFalse(this.roles.has(staff.getUserId(), RoleType.STUDENT));
    }

    @Test
    void listingsSayWhenTheSellerIsStaff() throws Exception {
        int n = NEXT.incrementAndGet();
        User staff = this.users.save(UserFactory.createUser(
                "lecturer" + n + "@cput.ac.za", "Ann", null, "Lecturer", null,
                this.passwordEncoder.encode(PASSWORD), null, AccountStatus.ACTIVE, null));
        Listing listing = listing(staff);

        this.mvc.perform(get("/api/listings/" + listing.getListingId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sellerAffiliation").value("STAFF"))
                .andExpect(jsonPath("$.sellerName").value("Ann Lecturer"));
    }

    @Test
    void aNonCputAddressStillCannotRegister() throws Exception {
        this.mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"someone@gmail.com\",\"firstName\":\"A\",\"lastName\":\"B\","
                                + "\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isBadRequest());
    }

}
