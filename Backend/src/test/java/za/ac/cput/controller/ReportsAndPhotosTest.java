/*
 ReportsAndPhotosTest.java

 End to end through the real security chain:

   - suspending, deleting or removing needs a written report with a reason;
   - removal reports are saved AND sent to the owner (notification + email);
     suspension/deletion reports are saved and keep the real name after the
     account is anonymised;
   - users can report listings/posts/profiles, not their own, not twice;
     moderator action answers those reports and tells the reporter;
   - profile photos: only real image bytes are accepted, served publicly;
   - listing cards carry the cover photo.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 25 September 2026
*/

package za.ac.cput.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import za.ac.cput.domain.admin.ModerationReport;
import za.ac.cput.domain.enums.AccountStatus;
import za.ac.cput.domain.enums.ListingStatus;
import za.ac.cput.domain.enums.ModerationAction;
import za.ac.cput.domain.enums.ReportStatus;
import za.ac.cput.domain.enums.RoleType;
import za.ac.cput.domain.identity.User;
import za.ac.cput.domain.marketplace.Listing;
import za.ac.cput.domain.marketplace.ListingImage;
import za.ac.cput.factory.identity.UserFactory;
import za.ac.cput.factory.marketplace.ListingFactory;
import za.ac.cput.mail.EmailSender;
import za.ac.cput.repository.admin.ModerationReportRepository;
import za.ac.cput.repository.communication.NotificationRepository;
import za.ac.cput.repository.identity.UserRepository;
import za.ac.cput.repository.marketplace.ListingImageRepository;
import za.ac.cput.repository.marketplace.ListingRepository;
import za.ac.cput.repository.trust.ReportRepository;
import za.ac.cput.security.JwtService;
import za.ac.cput.security.SessionMode;
import za.ac.cput.service.identity.RoleAssignmentService;

@SpringBootTest
class ReportsAndPhotosTest {

    private static final AtomicInteger NEXT = new AtomicInteger(950_000);
    private static final String REPORT =
            "{\"reason\":\"%s\",\"details\":\"Clear breach of the marketplace rules, see the listing photos.\"%s}";

    // Smallest valid PNG signature + header bytes; detection only reads the first 8.
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D};

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository users;
    @Autowired private ListingRepository listings;
    @Autowired private ListingImageRepository listingImages;
    @Autowired private ModerationReportRepository actionReports;
    @Autowired private ReportRepository userReports;
    @Autowired private NotificationRepository notifications;
    @Autowired private RoleAssignmentService roles;
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
                n + "@mycput.ac.za", "Person", null, "Number" + n, null,
                this.passwordEncoder.encode("correct-horse-battery"), LocalDate.of(2000, 1, 1),
                AccountStatus.ACTIVE, null));
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
                seller.getUserId(), 1, 1, "Graphing calculator", "Works perfectly",
                new BigDecimal("300.00"), ListingStatus.ACTIVE));
    }

    // ---- action reports

    @Test
    void actionsNeedAReasonAndAWrittenReport() throws Exception {
        String moderator = token(user(RoleType.MODERATOR), SessionMode.MODERATOR);
        User student = user();

        this.mvc.perform(post("/api/moderation/users/" + student.getUserId() + "/suspend").header("Authorization", moderator))
                .andExpect(status().isBadRequest());
        this.mvc.perform(post("/api/moderation/users/" + student.getUserId() + "/suspend").header("Authorization", moderator)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"SPAM\",\"details\":\"too short\"}"))
                .andExpect(status().isBadRequest());
        this.mvc.perform(post("/api/moderation/users/" + student.getUserId() + "/suspend").header("Authorization", moderator)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"details\":\"A long enough report but with no reason chosen.\"}"))
                .andExpect(status().isBadRequest());

        assertEquals(AccountStatus.ACTIVE, this.users.findById(student.getUserId()).orElseThrow().getAccountStatus());
    }

    @Test
    void aRemovalReportIsSavedAndSentToTheSeller() throws Exception {
        String moderator = token(user(RoleType.MODERATOR), SessionMode.MODERATOR);
        User seller = user();
        Listing listing = listing(seller);

        this.mvc.perform(post("/api/moderation/listings/" + listing.getListingId() + "/remove")
                        .header("Authorization", moderator).contentType(MediaType.APPLICATION_JSON)
                        .content(REPORT.formatted("PROHIBITED_ITEM", "")))
                .andExpect(status().isOk());

        ModerationReport report = this.actionReports.findBySubjectUserIdOrderByCreatedAtDesc(seller.getUserId()).get(0);
        assertEquals(ModerationAction.LISTING_REMOVED, report.getAction());
        assertEquals("Graphing calculator", report.getTargetTitle());
        assertTrue(report.isSentToUser());
        assertNotNull(report.getEmailedAt());

        verify(this.emailSender).send(eq(seller.getEmail()), eq("Your UniExchange listing was removed"),
                contains("Clear breach of the marketplace rules"));
        assertTrue(this.notifications.findByUserIdOrderByCreatedAtDesc(seller.getUserId()).stream()
                .anyMatch(n -> n.getContent().contains("MR-" + report.getModerationReportId())));
    }

    @Test
    void aDeletionReportKeepsTheRealNameAfterAnonymising() throws Exception {
        String moderator = token(user(RoleType.MODERATOR), SessionMode.MODERATOR);
        User student = user();
        String email = student.getEmail();

        this.mvc.perform(delete("/api/moderation/users/" + student.getUserId())
                        .header("Authorization", moderator).contentType(MediaType.APPLICATION_JSON)
                        .content(REPORT.formatted("FAKE_ACCOUNT", "")))
                .andExpect(status().isNoContent());

        ModerationReport report = this.actionReports.findBySubjectUserIdOrderByCreatedAtDesc(student.getUserId()).get(0);
        assertEquals(ModerationAction.ACCOUNT_DELETED, report.getAction());
        assertEquals(email, report.getSubjectEmail());
        assertFalse(report.isSentToUser());
        assertTrue(this.users.findById(student.getUserId()).orElseThrow().getEmail().endsWith("@removed.invalid"));

        this.mvc.perform(get("/api/moderation/action-reports/" + report.getModerationReportId())
                        .header("Authorization", moderator))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subjectEmail").value(email));
    }

    // ---- user reports

    @Test
    void usersReportThingsAndModeratorActionAnswersThem() throws Exception {
        User moderatorUser = user(RoleType.MODERATOR);
        String moderator = token(moderatorUser, SessionMode.MODERATOR);
        User seller = user();
        User reporter = user();
        Listing listing = listing(seller);
        String reporterToken = token(reporter, SessionMode.STANDARD);
        String body = "{\"targetType\":\"LISTING\",\"targetId\":%d,\"category\":\"SCAM_OR_FRAUD\",\"details\":\"Asked me to pay outside the app\"}"
                .formatted(listing.getListingId());

        String created = this.mvc.perform(post("/api/reports").header("Authorization", reporterToken)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.category").value("SCAM_OR_FRAUD"))
                .andReturn().getResponse().getContentAsString();
        long reportId = ((Number) JsonPath.read(created, "$.reportId")).longValue();

        // Not twice, and not your own listing.
        this.mvc.perform(post("/api/reports").header("Authorization", reporterToken)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
        this.mvc.perform(post("/api/reports").header("Authorization", token(seller, SessionMode.STANDARD))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());

        assertTrue(this.notifications.findByUserIdOrderByCreatedAtDesc(moderatorUser.getUserId()).stream()
                .anyMatch(n -> "USER_REPORT".equals(n.getEntityType()) && n.getEntityId() == reportId));

        this.mvc.perform(get("/api/moderation/user-reports").param("status", "PENDING").header("Authorization", moderator))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.reportId == " + reportId + ")].targetTitle").value("Graphing calculator"));

        this.mvc.perform(post("/api/moderation/listings/" + listing.getListingId() + "/remove")
                        .header("Authorization", moderator).contentType(MediaType.APPLICATION_JSON)
                        .content(REPORT.formatted("SCAM_OR_FRAUD", ",\"userReportId\":" + reportId)))
                .andExpect(status().isOk());

        assertEquals(ReportStatus.RESOLVED, this.userReports.findById(reportId).orElseThrow().getStatus());
        assertTrue(this.notifications.findByUserIdOrderByCreatedAtDesc(reporter.getUserId()).stream()
                .anyMatch(n -> n.getTitle().startsWith("Thanks")));
    }

    @Test
    void aModeratorCanDismissAUserReport() throws Exception {
        String moderator = token(user(RoleType.MODERATOR), SessionMode.MODERATOR);
        User target = user();
        User reporter = user();

        String created = this.mvc.perform(post("/api/reports").header("Authorization", token(reporter, SessionMode.STANDARD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetType\":\"USER\",\"targetId\":%d,\"category\":\"HARASSMENT_OR_BULLYING\"}"
                                .formatted(target.getUserId())))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long reportId = ((Number) JsonPath.read(created, "$.reportId")).longValue();

        this.mvc.perform(post("/api/moderation/user-reports/" + reportId + "/dismiss").header("Authorization", moderator)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Friendly banter\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DISMISSED"));
    }

    // ---- profile photos

    @Test
    void profilePhotosAcceptRealImagesOnly() throws Exception {
        User student = user();
        String auth = token(student, SessionMode.STANDARD);

        String body = this.mvc.perform(multipart("/api/profile-photos/me")
                        .file(new MockMultipartFile("file", "me.png", "image/png", PNG))
                        .header("Authorization", auth))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String url = JsonPath.read(body, "$.profilePhotoUrl");
        assertTrue(url.startsWith("/api/profile-photos/" + student.getUserId() + "?v="));

        this.mvc.perform(get("/api/profile-photos/" + student.getUserId()))
                .andExpect(status().isOk())
                .andExpect(content().contentType("image/png"))
                .andExpect(content().bytes(PNG));

        // HTML wearing an image/png label is refused.
        this.mvc.perform(multipart("/api/profile-photos/me")
                        .file(new MockMultipartFile("file", "x.png", "image/png", "<script>alert(1)</script>".getBytes()))
                        .header("Authorization", auth))
                .andExpect(status().isBadRequest());

        this.mvc.perform(delete("/api/profile-photos/me").header("Authorization", auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profilePhotoUrl").doesNotExist());
        this.mvc.perform(get("/api/profile-photos/" + student.getUserId())).andExpect(status().isNotFound());
        assertNull(this.users.findById(student.getUserId()).orElseThrow().getProfilePhotoUrl());
    }

    @Test
    void uploadingAPhotoNeedsASignIn() throws Exception {
        this.mvc.perform(multipart("/api/profile-photos/me")
                        .file(new MockMultipartFile("file", "me.png", "image/png", PNG)))
                .andExpect(status().isUnauthorized());
    }

    // ---- listing covers

    @Test
    void listingCardsCarryTheirCoverPhoto() throws Exception {
        Listing listing = listing(user());
        this.listingImages.save(new ListingImage.Builder().setListingId(listing.getListingId())
                .setImageUrl("http://localhost/api/listing-images/files/second.png").setPosition(1).setPrimary(false).build());
        this.listingImages.save(new ListingImage.Builder().setListingId(listing.getListingId())
                .setImageUrl("http://localhost/api/listing-images/files/cover.png").setPosition(2).setPrimary(true).build());

        this.mvc.perform(get("/api/listings/" + listing.getListingId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coverImageUrl").value("http://localhost/api/listing-images/files/cover.png"));

        List<Object> all = JsonPath.read(this.mvc.perform(get("/api/listings/search"))
                .andReturn().getResponse().getContentAsString(),
                "$[?(@.listingId == " + listing.getListingId() + ")].coverImageUrl");
        assertEquals(List.of("http://localhost/api/listing-images/files/cover.png"), all);
    }

}
