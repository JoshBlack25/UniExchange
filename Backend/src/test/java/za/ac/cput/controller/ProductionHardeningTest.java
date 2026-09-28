/*
 ProductionHardeningTest.java

 The authorization, upload and money-cap fixes from the production hardening
 pass, exercised through the real filter chain:

   - reference data (campuses) is admin-only to change
   - vendor applications: the applicant is the caller, deciding is moderator work
   - the audit log is append-only
   - an image cannot be moved onto someone else's listing, nor point at a file
     the caller did not upload (or at a javascript: URL)
   - an upload must really be an image, whatever it claims to be
   - GET /api/users/{id} hides contact details from other students
   - wallet caps turn an oversized transfer or top-up into a 400
   - the security headers are on every response

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 25 September 2026
*/

package za.ac.cput.controller;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDate;
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

import za.ac.cput.domain.admin.AuditLog;
import za.ac.cput.domain.enums.AccountStatus;
import za.ac.cput.domain.enums.ListingStatus;
import za.ac.cput.domain.enums.RoleType;
import za.ac.cput.domain.identity.User;
import za.ac.cput.domain.marketplace.Listing;
import za.ac.cput.domain.marketplace.ListingImage;
import za.ac.cput.factory.admin.AuditLogFactory;
import za.ac.cput.factory.identity.UserFactory;
import za.ac.cput.factory.marketplace.ListingFactory;
import za.ac.cput.factory.marketplace.ListingImageFactory;
import za.ac.cput.mail.EmailSender;
import za.ac.cput.repository.admin.AuditLogRepository;
import za.ac.cput.repository.identity.UserRepository;
import za.ac.cput.repository.marketplace.ListingImageRepository;
import za.ac.cput.repository.marketplace.ListingRepository;
import za.ac.cput.security.JwtService;
import za.ac.cput.security.SessionMode;
import za.ac.cput.service.identity.RoleAssignmentService;
import za.ac.cput.service.transactions.IWalletService;

@SpringBootTest(properties = {
        "app.uploads.dir=target/test-uploads",
        "app.wallet.max-transfer=100.00",
        "app.wallet.max-topup=100.00"})
class ProductionHardeningTest {

    private static final AtomicInteger NEXT = new AtomicInteger(900_000);

    /* The smallest byte strings ImageTypeDetector accepts as each type. */
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0};

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository users;
    @Autowired private RoleAssignmentService roles;
    @Autowired private JwtService jwtService;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private ListingRepository listings;
    @Autowired private ListingImageRepository listingImages;
    @Autowired private AuditLogRepository auditLogs;
    @Autowired private IWalletService walletService;

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
                n + "@mycput.ac.za", "Test", null, "User" + n, "0820000000",
                this.passwordEncoder.encode("irrelevant-password"), LocalDate.of(2000, 1, 1),
                AccountStatus.ACTIVE, null));
        this.roles.grant(saved.getUserId(), RoleType.STUDENT);
        for (RoleType role : grants) {
            this.roles.grant(saved.getUserId(), role);
        }
        return saved;
    }

    private String token(User user, SessionMode mode) {
        return "Bearer " + this.jwtService.generateToken(user.getEmail(),
                Map.of("uid", user.getUserId(), "mode", mode.name()));
    }

    private String student(User user) {
        return token(user, SessionMode.STANDARD);
    }

    private Listing listingOf(User seller) {
        return this.listings.save(ListingFactory.createListing(seller.getUserId(), 1, 1,
                "Calculus textbook", "Barely used", new BigDecimal("150.00"), ListingStatus.ACTIVE));
    }

    private String upload(User owner, byte[] bytes, String filename, String declaredType) throws Exception {
        String body = this.mvc.perform(multipart("/api/uploads")
                        .file(new MockMultipartFile("file", filename, declaredType, bytes))
                        .header("Authorization", student(owner)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.url");
    }

    private static String imageBody(long listingId, String url) {
        return "{\"listingId\":%d,\"imageUrl\":\"%s\",\"position\":0,\"isPrimary\":true}".formatted(listingId, url);
    }

    // ---- Reference data, vendor applications, audit log

    @Test
    void onlyAnAdminMayChangeCampuses() throws Exception {
        String body = "{\"name\":\"New Campus\",\"city\":\"Cape Town\",\"address\":null}";
        this.mvc.perform(post("/api/campuses").header("Authorization", student(user()))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());
        this.mvc.perform(get("/api/campuses")).andExpect(status().isOk());
    }

    @Test
    void aVendorApplicationIsAlwaysTheCallersAndStartsPending() throws Exception {
        User applicant = user();
        User victim = user();

        String created = this.mvc.perform(post("/api/vendor-applications")
                        .header("Authorization", student(applicant))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"applicantId\":%d,\"businessName\":\"Books\",\"businessDescription\":null,\"status\":\"APPROVED\"}"
                                .formatted(victim.getUserId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.applicantId").value(applicant.getUserId()))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn().getResponse().getContentAsString();
        long id = ((Number) JsonPath.read(created, "$.vendorApplicationId")).longValue();

        // Nobody else can see it, list them all, or approve their own.
        this.mvc.perform(get("/api/vendor-applications/" + id).header("Authorization", student(victim)))
                .andExpect(status().isNotFound());
        this.mvc.perform(get("/api/vendor-applications").header("Authorization", student(applicant)))
                .andExpect(status().isForbidden());
        this.mvc.perform(patch("/api/vendor-applications/" + id + "/approve")
                        .param("reviewedBy", String.valueOf(applicant.getUserId()))
                        .header("Authorization", student(applicant)))
                .andExpect(status().isForbidden());

        // A moderator's decision records the moderator, not the reviewedBy parameter.
        User moderator = user(RoleType.MODERATOR);
        this.mvc.perform(patch("/api/vendor-applications/" + id + "/approve")
                        .param("reviewedBy", String.valueOf(victim.getUserId()))
                        .header("Authorization", token(moderator, SessionMode.MODERATOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewedBy").value(moderator.getUserId()));
    }

    @Test
    void theAuditLogIsAppendOnlyEvenForAnAdmin() throws Exception {
        User admin = user(RoleType.ADMIN);
        AuditLog entry = this.auditLogs.save(AuditLogFactory.createAuditLog(
                admin.getUserId(), "TEST", "USER", 1L, null));

        this.mvc.perform(delete("/api/audit-logs/" + entry.getAuditLogId())
                        .header("Authorization", token(admin, SessionMode.ADMIN)))
                .andExpect(status().isForbidden());
    }

    // ---- Images and uploads

    @Test
    void anImageCannotBeMovedOntoSomeoneElsesListing() throws Exception {
        User owner = user();
        User other = user();
        Listing mine = listingOf(owner);
        Listing theirs = listingOf(other);
        String url = upload(owner, PNG, "a.png", "image/png");
        ListingImage image = this.listingImages.save(
                ListingImageFactory.createListingImage(mine.getListingId(), url, 0, true));

        this.mvc.perform(put("/api/listing-images/" + image.getImageId())
                        .header("Authorization", student(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(imageBody(theirs.getListingId(), url)))
                .andExpect(status().isForbidden());
    }

    @Test
    void anImageUrlMustBeTheCallersOwnUpload() throws Exception {
        User owner = user();
        User other = user();
        Listing mine = listingOf(owner);
        String othersFile = upload(other, PNG, "b.png", "image/png");

        for (String url : new String[] {othersFile, "javascript:alert(1)", "https://evil.example/x.png"}) {
            this.mvc.perform(post("/api/listing-images").header("Authorization", student(owner))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(imageBody(mine.getListingId(), url)))
                    .andExpect(status().isBadRequest());
        }

        String myFile = upload(owner, PNG, "c.png", "image/png");
        this.mvc.perform(post("/api/listing-images").header("Authorization", student(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(imageBody(mine.getListingId(), myFile)))
                .andExpect(status().isCreated());
    }

    @Test
    void aFileThatIsNotReallyAnImageIsRejected() throws Exception {
        byte[] html = "<html><script>alert(1)</script></html>".getBytes();
        this.mvc.perform(multipart("/api/uploads")
                        .file(new MockMultipartFile("file", "cat.png", "image/png", html))
                        .header("Authorization", student(user())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("images are allowed")));
    }

    @Test
    void theStoredExtensionComesFromTheBytesNotTheClaim() throws Exception {
        // Real PNG bytes declared as a GIF: stored (and so served) as .png.
        String url = upload(user(), PNG, "x.gif", "image/gif");
        assertEquals(true, url.endsWith(".png"), url);
    }

    // ---- Profiles

    @Test
    void anotherStudentSeesOnlyThePublicProfile() throws Exception {
        User viewer = user();
        User subject = user();

        this.mvc.perform(get("/api/users/" + subject.getUserId()).header("Authorization", student(viewer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Test"))
                .andExpect(jsonPath("$.email").doesNotExist())
                .andExpect(jsonPath("$.cellPhone").doesNotExist())
                .andExpect(jsonPath("$.dateOfBirth").doesNotExist());

        User moderator = user(RoleType.MODERATOR);
        this.mvc.perform(get("/api/users/" + subject.getUserId())
                        .header("Authorization", token(moderator, SessionMode.MODERATOR)))
                .andExpect(jsonPath("$.email").value(subject.getEmail()));
    }

    // ---- Money

    @Test
    void anOversizedTransferIsA400() throws Exception {
        User sender = user();
        User recipient = user();
        this.walletService.credit(sender.getUserId(), new BigDecimal("500.00"), "TEST", null, "seed");

        this.mvc.perform(post("/api/wallet/transfer").header("Authorization", student(sender))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"recipientEmail\":\"%s\",\"amount\":150.00}".formatted(recipient.getEmail())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("at most R100.00")));
    }

    @Test
    void anOversizedTopUpIsA400() throws Exception {
        this.mvc.perform(post("/api/wallet/topup").header("Authorization", student(user()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":150.00}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("at most R100.00")));
    }

    // ---- Headers

    @Test
    void securityHeadersAreOnEveryResponse() throws Exception {
        this.mvc.perform(get("/api/campuses").secure(true))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().string("Referrer-Policy", "strict-origin-when-cross-origin"))
                .andExpect(header().string("Permissions-Policy", "camera=(), microphone=(), geolocation=()"))
                .andExpect(header().string("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'"))
                .andExpect(header().string("Strict-Transport-Security", "max-age=31536000 ; includeSubDomains"));
    }

}
