/*
 DevDataSeeder.java

 Fills a development database with enough people and content to try every
 moderator and admin feature. Only runs with the "seed" profile, so it can never
 touch a database by accident:

   ./mvnw spring-boot:run \
       -Dspring-boot.run.profiles=local,seed \
       -Dspring-boot.run.arguments=--spring.mail.host=false

 Keep "local" in the list - it holds your DB password. spring.mail.host=false
 switches off SMTP so sign-in codes for the seeded accounts are printed in the
 backend console instead of being emailed to addresses nobody owns.

 Runs once: if the seeded accounts already exist it logs that and does nothing.
 It also loads db/seed-reference-data.sql (campuses and categories), which is
 itself safe to repeat.

 Every seeded account's password is SEED_PASSWORD below.

   Who                                   Role(s)             State
   240453182@mycput.ac.za                ADMIN (bootstrap)   left alone if it already exists
   999000009@mycput.ac.za  Nadia Admin   ADMIN               a second admin, so "last admin" can be tested
   999000002@mycput.ac.za  Musa Mod      MODERATOR
   999000003..5@mycput.ac.za             students            active, with listings, posts, wallets
   999000006@mycput.ac.za  Sipho Banned  student             SUSPENDED
   999000007@mycput.ac.za  Una Verified  student             PENDING_VERIFICATION
   seed.lecturer@cput.ac.za              FACULTY             CPUT staff seller

 Content: listings in every status (one staff listing), four completed trades
 with reviews rated 5, 4, 2 and 1 (the last two land in Flagged reviews),
 student posts (one already removed), two campus announcements, a chat, wallet
 balances, notifications and one open report.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 25 September 2026
*/

package za.ac.cput.config;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.List;

import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import za.ac.cput.domain.enums.RoleType;
import za.ac.cput.service.identity.RoleAssignmentService;

@Component
@Profile("seed")
@Order(3)
public class DevDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DevDataSeeder.class);

    public static final String SEED_PASSWORD = "Password123!";

    private static final String BOOTSTRAP_ADMIN = "240453182@mycput.ac.za";
    private static final String MARKER_EMAIL = "999000003@mycput.ac.za";

    private final JdbcTemplate jdbc;
    private final DataSource dataSource;
    private final PasswordEncoder passwordEncoder;
    private final RoleAssignmentService roles;

    private final LocalDateTime now = LocalDateTime.now();

    public DevDataSeeder(JdbcTemplate jdbc, DataSource dataSource, PasswordEncoder passwordEncoder,
                         RoleAssignmentService roles) {
        this.jdbc = jdbc;
        this.dataSource = dataSource;
        this.passwordEncoder = passwordEncoder;
        this.roles = roles;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        new ResourceDatabasePopulator(new ClassPathResource("db/seed-reference-data.sql")).execute(this.dataSource);

        if (userId(MARKER_EMAIL) != null) {
            log.info("Seed: already seeded ({} exists) - nothing to do", MARKER_EMAIL);
            return;
        }

        List<Long> campuses = this.jdbc.queryForList("SELECT campus_id FROM campus ORDER BY campus_id", Long.class);
        List<Long> categories = this.jdbc.queryForList("SELECT category_id FROM category ORDER BY category_id", Long.class);
        long capeTown = campuses.get(0);
        long bellville = campuses.get(Math.min(1, campuses.size() - 1));
        long books = categories.get(0);
        long electronics = categories.get(Math.min(1, categories.size() - 1));
        long other = categories.get(categories.size() - 1);

        String hash = this.passwordEncoder.encode(SEED_PASSWORD);

        // ---- people
        Long existingAdmin = userId(BOOTSTRAP_ADMIN);
        long admin = existingAdmin != null ? existingAdmin
                : user(BOOTSTRAP_ADMIN, "Yaseen", "Kannemeyer", hash, "ACTIVE", capeTown);
        long admin2 = user("999000009@mycput.ac.za", "Nadia", "Admin", hash, "ACTIVE", capeTown);
        long mod = user("999000002@mycput.ac.za", "Musa", "Moderator", hash, "ACTIVE", bellville);
        long amy = user("999000003@mycput.ac.za", "Amy", "Jacobs", hash, "ACTIVE", capeTown);
        long ben = user("999000004@mycput.ac.za", "Ben", "Petersen", hash, "ACTIVE", bellville);
        long cara = user("999000005@mycput.ac.za", "Cara", "Daniels", hash, "ACTIVE", capeTown);
        long sipho = user("999000006@mycput.ac.za", "Sipho", "Banned", hash, "SUSPENDED", bellville);
        long una = user("999000007@mycput.ac.za", "Una", "Verified", hash, "PENDING_VERIFICATION", capeTown);
        long lecturer = user("seed.lecturer@cput.ac.za", "Grace", "Lecturer", hash, "ACTIVE", capeTown);

        for (long id : List.of(admin, admin2, mod, amy, ben, cara, sipho, una)) {
            this.roles.grant(id, RoleType.STUDENT);
        }
        this.roles.grant(lecturer, RoleType.FACULTY);
        this.roles.grant(admin, RoleType.ADMIN);
        this.roles.grant(admin2, RoleType.ADMIN);
        this.roles.grant(mod, RoleType.MODERATOR);

        // ---- listings
        listing(amy, books, capeTown, "Calculus: Early Transcendentals (8th ed.)", "Barely used, no highlighting.", "450.00", "ACTIVE", 2);
        listing(ben, electronics, bellville, "Casio fx-991EX calculator", "Works perfectly, comes with cover.", "280.00", "ACTIVE", 1);
        listing(cara, other, capeTown, "Desk lamp", "LED, three brightness levels.", "150.00", "ACTIVE", 5);
        listing(lecturer, books, capeTown, "Engineering Drawing past papers bundle", "Printed and bound, 2019-2025.", "60.00", "ACTIVE", 3);
        listing(sipho, electronics, bellville, "iPhone 15 Pro - R500 !!!", "DM me, pay upfront only.", "500.00", "ACTIVE", 1);
        listing(ben, other, bellville, "Selling exam answers", "Guaranteed pass, message me.", "200.00", "REMOVED", 6);
        listing(cara, books, capeTown, "Old lab coat", "Deleted by the seller.", "80.00", "DELETED", 20);

        // ---- completed trades, each reviewed once by the buyer
        trade(amy, ben, books, capeTown, "Physics 1 textbook", "300.00", 5, "Great seller, item exactly as described.");
        trade(ben, cara, electronics, capeTown, "Wireless mouse", "120.00", 4, "Good, a bit late to the meet-up.");
        trade(cara, amy, other, capeTown, "Stats notes", "90.00", 2, "Notes were incomplete, half the chapters missing.");
        trade(amy, sipho, electronics, bellville, "Bluetooth earphones", "250.00", 1, "Scam. Earphones were broken and he blocked me.");

        // ---- bulletin
        post(amy, "Study group for MAT1 exam", "Library level 3, Thursdays 14:00. All welcome.", "STUDY_GROUP", "PUBLISHED", false, 2);
        post(ben, "Lost: black backpack", "Left it in the D6 lecture hall on Monday. Reward offered.", "LOST_AND_FOUND", "PUBLISHED", false, 1);
        post(cara, "Braai this Friday", "Res courtyard, bring your own meat.", "EVENT", "PUBLISHED", false, 3);
        post(sipho, "Easy money!!!", "Send R100 and get R1000 back, guaranteed.", "GENERAL", "PUBLISHED", false, 0);
        post(ben, "Selling exam answers", "DM me.", "GENERAL", "REMOVED", false, 4);
        post(admin, "Library hours extended for exams", "The Cape Town library is open until 22:00 from 1 October.", "GENERAL", "PUBLISHED", true, 1);
        post(mod, "Safe trading reminder", "Meet in public places on campus and use the wallet for payment.", "GENERAL", "PUBLISHED", true, 5);

        // ---- wallets
        for (long id : List.of(admin, admin2, mod, amy, ben, cara, sipho, lecturer)) {
            wallet(id, "500.00");
        }

        // ---- a chat between Amy and Ben
        long conversation = insert("INSERT INTO conversation (listing_id, created_at) VALUES (?, ?)", null, this.now.minusDays(1));
        insert("INSERT INTO conversation_participant (conversation_id, user_id, joined_at, last_read_at) VALUES (?, ?, ?, ?)",
                conversation, amy, this.now.minusDays(1), this.now);
        insert("INSERT INTO conversation_participant (conversation_id, user_id, joined_at, last_read_at) VALUES (?, ?, ?, ?)",
                conversation, ben, this.now.minusDays(1), null);
        insert("INSERT INTO message (conversation_id, sender_id, content, sent_at) VALUES (?, ?, ?, ?)",
                conversation, amy, "Hi! Is the calculator still available?", this.now.minusHours(20));
        insert("INSERT INTO message (conversation_id, sender_id, content, sent_at) VALUES (?, ?, ?, ?)",
                conversation, ben, "Yes, want to meet at the library tomorrow?", this.now.minusHours(19));

        // ---- notifications and an open report
        notification(amy, "SYSTEM", "Welcome to UniExchange", "Your account is ready.");
        notification(ben, "MESSAGE", "New message from Amy", "Hi! Is the calculator still available?");
        insert("INSERT INTO report (reporter_id, target_type, target_id, reason, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                cara, "USER", sipho, "Posting scam listings and asking for money upfront.", "PENDING", this.now.minusHours(6));

        log.info("Seed: done. Every seeded account's password is {}", SEED_PASSWORD);
    }

    // ------------------------------------------------------------------ helpers

    private Long userId(String email) {
        List<Long> ids = this.jdbc.queryForList("SELECT user_id FROM `user` WHERE email = ?", Long.class, email);
        return ids.isEmpty() ? null : ids.get(0);
    }

    private long user(String email, String first, String last, String hash, String status, long campusId) {
        LocalDateTime created = this.now.minusDays(30);
        LocalDateTime verified = "PENDING_VERIFICATION".equals(status) ? null : created;
        return insert("INSERT INTO `user` (email, first_name, last_name, password_hash, account_status, "
                        + "email_verified_at, campus_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                email, first, last, hash, status, verified, campusId, created, created);
    }

    private long listing(long seller, long category, long campus, String title, String description,
                         String price, String status, int daysAgo) {
        LocalDateTime created = this.now.minusDays(daysAgo);
        LocalDateTime deleted = "DELETED".equals(status) ? this.now.minusDays(1) : null;
        return insert("INSERT INTO listing (seller_id, category_id, campus_id, title, description, price, status, "
                        + "created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                seller, category, campus, title, description, new BigDecimal(price), status, created, created, deleted);
    }

    /** A SOLD listing, the completed wallet trade for it, and the buyer's review of the seller. */
    private void trade(long buyer, long seller, long category, long campus, String title, String price,
                       int rating, String comment) {
        long listing = listing(seller, category, campus, title, "Sold on UniExchange.", price, "SOLD", 10);
        long txn = insert("INSERT INTO `transaction` (buyer_id, seller_id, listing_id, amount, payment_method, status, "
                        + "created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                buyer, seller, listing, new BigDecimal(price), "WALLET", "COMPLETED",
                this.now.minusDays(8), this.now.minusDays(7));
        insert("INSERT INTO review (transaction_id, reviewer_id, reviewee_id, rating, comment, created_at) "
                        + "VALUES (?, ?, ?, ?, ?, ?)",
                txn, buyer, seller, rating, comment, this.now.minusDays(6));
    }

    private void post(long author, String title, String content, String category, String status,
                      boolean announcement, int daysAgo) {
        LocalDateTime created = this.now.minusDays(daysAgo).minusHours(2);
        LocalDateTime removed = "REMOVED".equals(status) ? this.now.minusDays(1) : null;
        insert("INSERT INTO bulletin_post (author_id, title, content, status, is_faculty_announcement, category, "
                        + "created_at, updated_at, removed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                author, title, content, status, announcement, category, created, created, removed);
    }

    /** Skipped for anyone who already has a wallet, e.g. an admin account that existed before seeding. */
    private void wallet(long userId, String balance) {
        Integer existing = this.jdbc.queryForObject("SELECT COUNT(*) FROM wallet WHERE user_id = ?", Integer.class, userId);
        if (existing != null && existing > 0) {
            return;
        }
        BigDecimal amount = new BigDecimal(balance);
        long wallet = insert("INSERT INTO wallet (user_id, balance, currency, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                userId, amount, "ZAR", this.now.minusDays(30), this.now.minusDays(30));
        insert("INSERT INTO wallet_transaction (wallet_id, type, amount, balance_after, description, created_at) "
                        + "VALUES (?, ?, ?, ?, ?, ?)",
                wallet, "ADJUSTMENT", amount, amount, "Seed opening balance", this.now.minusDays(30));
    }

    private void notification(long userId, String type, String title, String content) {
        insert("INSERT INTO notification (user_id, type, title, content, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                userId, type, title, content, false, this.now.minusHours(3));
    }

    /** Runs an INSERT and returns the generated id. */
    private long insert(String sql, Object... values) {
        KeyHolder keys = new GeneratedKeyHolder();
        this.jdbc.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            for (int i = 0; i < values.length; i++) {
                statement.setObject(i + 1, values[i]);
            }
            return statement;
        }, keys);
        Number key = keys.getKey();
        return key == null ? 0 : key.longValue();
    }

}
