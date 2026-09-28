/*
 ModerationAnalyticsTest.java

 The dashboard chart data: bucket sizes per range, that fresh activity lands in
 the newest bucket, and who may see what - moderators get no money series,
 admins do, and students get nothing at all.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 25 September 2026
*/

package za.ac.cput.service.moderation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import za.ac.cput.domain.enums.AccountStatus;
import za.ac.cput.domain.enums.RoleType;
import za.ac.cput.domain.identity.User;
import za.ac.cput.dto.moderation.AnalyticsDtos.Analytics;
import za.ac.cput.dto.moderation.AnalyticsDtos.Bucket;
import za.ac.cput.dto.moderation.AnalyticsDtos.Range;
import za.ac.cput.dto.moderation.AnalyticsDtos.Series;
import za.ac.cput.factory.identity.UserFactory;
import za.ac.cput.mail.EmailSender;
import za.ac.cput.repository.identity.UserRepository;
import za.ac.cput.security.JwtService;
import za.ac.cput.security.SessionMode;
import za.ac.cput.service.identity.RoleAssignmentService;

@SpringBootTest
class ModerationAnalyticsTest {

    private static final AtomicInteger NEXT = new AtomicInteger(900_000);

    @Autowired private WebApplicationContext context;
    @Autowired private ModerationAnalyticsService analytics;
    @Autowired private UserRepository users;
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

    private User user(String email, RoleType... grants) {
        User saved = this.users.save(UserFactory.createUser(
                email, "Test", null, "User", null, this.passwordEncoder.encode("correct-horse-battery"),
                LocalDate.of(2000, 1, 1), AccountStatus.ACTIVE, null));
        this.roles.grant(saved.getUserId(), RoleType.STUDENT);
        for (RoleType role : grants) {
            this.roles.grant(saved.getUserId(), role);
        }
        return saved;
    }

    private User student(RoleType... grants) {
        return user(NEXT.incrementAndGet() + "@mycput.ac.za", grants);
    }

    private String token(User user, SessionMode mode) {
        return "Bearer " + this.jwtService.generateToken(user.getEmail(), Map.of("mode", mode.name()));
    }

    @Test
    void eachRangeHasTheRightNumberOfBuckets() {
        Map<Range, Integer> expected = Map.of(
                Range.D1, 24, Range.D3, 72, Range.W1, 7, Range.M1, 30, Range.M3, 90,
                Range.M6, 26, Range.Y1, 52);
        expected.forEach((range, size) -> {
            Analytics result = this.analytics.analytics(range, false);
            assertEquals(size, result.buckets().size(), range.code());
            result.series().values().forEach(series -> assertEquals(size, series.values().size(), range.code()));
        });
        assertEquals(Bucket.HOUR, this.analytics.analytics(Range.D2, false).bucket());
        assertEquals(Bucket.WEEK, this.analytics.analytics(Range.Y1, false).bucket());
    }

    @Test
    void weeklyBucketsStartOnMonday() {
        Analytics result = this.analytics.analytics(Range.M6, false, LocalDateTime.of(2026, 9, 25, 14, 30));
        result.buckets().forEach(start -> assertEquals(java.time.DayOfWeek.MONDAY, start.getDayOfWeek()));
        assertEquals(LocalDateTime.of(2026, 9, 28, 0, 0), result.to());
    }

    @Test
    void aNewSignupLandsInTheNewestBucket() {
        double before = newest(this.analytics.analytics(Range.D1, false).series().get("signups"));
        student();
        user("lecturer" + NEXT.incrementAndGet() + "@cput.ac.za");

        Analytics after = this.analytics.analytics(Range.D1, false);
        assertEquals(before + 2, newest(after.series().get("signups")));
        assertTrue(newest(after.series().get("signupsStaff")) >= 1);
    }

    @Test
    void moneyIsForAdminSessionsOnly() throws Exception {
        User moderator = student(RoleType.MODERATOR);
        User admin = student(RoleType.ADMIN);

        this.mvc.perform(get("/api/moderation/analytics").param("range", "1m")
                        .header("Authorization", token(moderator, SessionMode.MODERATOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.series.signups").exists())
                .andExpect(jsonPath("$.series.banRate").exists())
                .andExpect(jsonPath("$.series.salesVolume").doesNotExist())
                .andExpect(jsonPath("$.series.topUpVolume").doesNotExist());

        this.mvc.perform(get("/api/moderation/analytics").param("range", "1m")
                        .header("Authorization", token(admin, SessionMode.ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.series.salesVolume").exists())
                .andExpect(jsonPath("$.series.topUpVolume").exists());
    }

    @Test
    void studentsAndUnknownRangesAreRefused() throws Exception {
        User student = student();
        User moderator = student(RoleType.MODERATOR);

        this.mvc.perform(get("/api/moderation/analytics").header("Authorization", token(student, SessionMode.STANDARD)))
                .andExpect(status().isForbidden());
        this.mvc.perform(get("/api/moderation/analytics").param("range", "5y")
                        .header("Authorization", token(moderator, SessionMode.MODERATOR)))
                .andExpect(status().isBadRequest());
    }

    private static double newest(Series series) {
        List<Double> values = series.values();
        return values.get(values.size() - 1);
    }

}
