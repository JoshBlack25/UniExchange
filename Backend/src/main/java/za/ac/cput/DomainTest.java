/*
 DomainTest.java

 DomainTest runner - builds every domain entity and validates it with Helper

 Author: <Your Full Name> (<Student Number>)
 Date: 04 September 2026
*/

package za.ac.cput;

import za.ac.cput.domain.admin.AuditLog;
import za.ac.cput.domain.communication.Conversation;
import za.ac.cput.domain.communication.ConversationParticipant;
import za.ac.cput.domain.communication.Message;
import za.ac.cput.domain.communication.Notification;
import za.ac.cput.domain.community.BulletinPost;
import za.ac.cput.domain.enums.AccountStatus;
import za.ac.cput.domain.enums.BulletinPostStatus;
import za.ac.cput.domain.enums.ListingStatus;
import za.ac.cput.domain.enums.NotificationType;
import za.ac.cput.domain.enums.PaymentMethod;
import za.ac.cput.domain.enums.PaymentStatus;
import za.ac.cput.domain.enums.ReportStatus;
import za.ac.cput.domain.enums.ReportTargetType;
import za.ac.cput.domain.enums.RoleType;
import za.ac.cput.domain.enums.TransactionStatus;
import za.ac.cput.domain.enums.VendorApplicationStatus;
import za.ac.cput.domain.enums.VerificationType;
import za.ac.cput.domain.enums.WalletTransactionType;
import za.ac.cput.domain.identity.Campus;
import za.ac.cput.domain.identity.Role;
import za.ac.cput.domain.identity.User;
import za.ac.cput.domain.identity.UserRole;
import za.ac.cput.domain.identity.Verification;
import za.ac.cput.domain.marketplace.Category;
import za.ac.cput.domain.marketplace.Listing;
import za.ac.cput.domain.marketplace.ListingImage;
import za.ac.cput.domain.transactions.Payment;
import za.ac.cput.domain.transactions.Transaction;
import za.ac.cput.domain.transactions.Wallet;
import za.ac.cput.domain.transactions.WalletTransaction;
import za.ac.cput.domain.trust.Report;
import za.ac.cput.domain.trust.Review;
import za.ac.cput.domain.trust.TrustedSellerBadge;
import za.ac.cput.domain.trust.VendorApplication;
import za.ac.cput.util.Helper;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class DomainTest {

    private static int passed = 0;
    private static int total = 0;

    public static void main(String[] args) {
        LocalDateTime now = LocalDateTime.now();

        section("1. IDENTITY");

        Campus campus = new Campus.Builder()
                .setCampusId(1)
                .setName("CPUT Bellville")
                .setCity("Cape Town")
                .setAddress("Symphony Way, Bellville")
                .build();
        print("Campus", campus);

        Role role = new Role.Builder()
                .setRoleId(1)
                .setName(RoleType.STUDENT)
                .setDescription("Registered student")
                .build();
        print("Role", role);

        User user = new User.Builder()
                .setUserId(1)
                .setEmail("student@mycput.ac.za")
                .setFirstName("John")
                .setMiddleName("David")
                .setLastName("Doe")
                .setCellPhone("0721234567")
                .setPasswordHash("$2a$10$abcdefghijklmnopqrstuv")
                .setDateOfBirth(LocalDate.of(2002, 5, 12))
                .setAccountStatus(AccountStatus.ACTIVE)
                .setEmailVerifiedAt(now)
                .setCampusId(1L)
                .setCreatedAt(now)
                .setUpdatedAt(now)
                .build();
        print("User", user);

        // Demonstrate copy() then modify
        User userCopy = new User.Builder().copy(user).setEmail("copy@mycput.ac.za").build();
        print("User (copied)", userCopy);

        UserRole userRole = new UserRole.Builder()
                .setUserRoleId(1)
                .setUserId(1)
                .setRoleId(1)
                .setAssignedAt(now)
                .build();
        print("UserRole", userRole);

        Verification verification = new Verification.Builder()
                .setVerificationId(1)
                .setUserId(1)
                .setVerificationType(VerificationType.EMAIL)
                .setToken("hashed-token-abc123")
                .setExpiresAt(now.plusDays(1))
                .setVerifiedAt(now)
                .setCreatedAt(now)
                .build();
        print("Verification", verification);

        section("2. MARKETPLACE");

        Category category = new Category.Builder()
                .setCategoryId(1)
                .setName("Textbooks")
                .setDescription("Second-hand textbooks")
                .build();
        print("Category", category);

        Listing listing = new Listing.Builder()
                .setListingId(1)
                .setSellerId(1)
                .setCategoryId(1)
                .setCampusId(1)
                .setTitle("Calculus Textbook")
                .setDescription("Good condition, some highlighting")
                .setPrice(new BigDecimal("150.00"))
                .setStatus(ListingStatus.ACTIVE)
                .setCreatedAt(now)
                .setUpdatedAt(now)
                .build();
        print("Listing", listing);

        ListingImage listingImage = new ListingImage.Builder()
                .setImageId(1)
                .setListingId(1)
                .setImageUrl("https://example.com/calculus.jpg")
                .setPosition(1)
                .setPrimary(true)
                .build();
        print("ListingImage", listingImage);

        section("3. COMMUNICATION");

        Conversation conversation = new Conversation.Builder()
                .setConversationId(1)
                .setCreatedAt(now)
                .build();
        print("Conversation", conversation);

        ConversationParticipant participant = new ConversationParticipant.Builder()
                .setParticipantId(1)
                .setConversationId(1)
                .setUserId(2)
                .setJoinedAt(now)
                .setLastReadAt(now)
                .build();
        print("ConversationParticipant", participant);

        Message message = new Message.Builder()
                .setMessageId(1)
                .setConversationId(1)
                .setSenderId(1)
                .setContent("Hi, is the textbook still available?")
                .setSentAt(now)
                .build();
        print("Message", message);

        Notification notification = new Notification.Builder()
                .setNotificationId(1)
                .setUserId(1)
                .setType(NotificationType.MESSAGE)
                .setTitle("New message")
                .setContent("You have a new message in conversation 1")
                .setEntityType("MESSAGE")
                .setEntityId(1L)
                .setRead(false)
                .setCreatedAt(now)
                .build();
        print("Notification", notification);

        section("4. TRUST");

        Review review = new Review.Builder()
                .setReviewId(1)
                .setTransactionId(1)
                .setReviewerId(2)
                .setRevieweeId(1)
                .setRating(5)
                .setComment("Great seller, item exactly as described")
                .setCreatedAt(now)
                .build();
        print("Review", review);

        Report report = new Report.Builder()
                .setReportId(1)
                .setReporterId(3)
                .setTargetType(ReportTargetType.LISTING)
                .setTargetId(1)
                .setReason("Prohibited item")
                .setStatus(ReportStatus.PENDING)
                .setCreatedAt(now)
                .build();
        print("Report", report);

        VendorApplication vendorApplication = new VendorApplication.Builder()
                .setVendorApplicationId(1)
                .setApplicantId(2)
                .setBusinessName("Mokoena Tech")
                .setBusinessDescription("Laptop and phone repairs")
                .setStatus(VendorApplicationStatus.PENDING)
                .setCreatedAt(now)
                .build();
        print("VendorApplication", vendorApplication);

        TrustedSellerBadge badge = new TrustedSellerBadge.Builder()
                .setTrustedSellerBadgeId(1)
                .setUserId(1)
                .setEarnedAt(now)
                .build();
        print("TrustedSellerBadge", badge);

        section("5. TRANSACTIONS");

        Transaction transaction = new Transaction.Builder()
                .setTransactionId(1)
                .setBuyerId(2)
                .setSellerId(1)
                .setListingId(1)
                .setAmount(new BigDecimal("150.00"))
                .setPaymentMethod(PaymentMethod.WALLET)
                .setStatus(TransactionStatus.COMPLETED)
                .setCreatedAt(now)
                .setCompletedAt(now)
                .build();
        print("Transaction", transaction);

        Payment payment = new Payment.Builder()
                .setPaymentId(1)
                .setTransactionId(1)
                .setAmount(new BigDecimal("150.00"))
                .setMethod(PaymentMethod.WALLET)
                .setStatus(PaymentStatus.COMPLETED)
                .setExternalReference("WLT-0001")
                .setPaidAt(now)
                .setCreatedAt(now)
                .build();
        print("Payment", payment);

        Wallet wallet = new Wallet.Builder()
                .setWalletId(1)
                .setUserId(1)
                .setBalance(new BigDecimal("250.00"))
                .setCurrency("ZAR")
                .setCreatedAt(now)
                .setUpdatedAt(now)
                .build();
        print("Wallet", wallet);

        WalletTransaction walletTransaction = new WalletTransaction.Builder()
                .setWalletTransactionId(1)
                .setWalletId(1)
                .setType(WalletTransactionType.CREDIT)
                .setAmount(new BigDecimal("100.00"))
                .setBalanceAfter(new BigDecimal("250.00"))
                .setReferenceType("TRANSACTION")
                .setReferenceId(1L)
                .setDescription("Wallet top-up")
                .setCreatedAt(now)
                .build();
        print("WalletTransaction", walletTransaction);

        section("6. COMMUNITY");

        BulletinPost bulletinPost = new BulletinPost.Builder()
                .setBulletinPostId(1)
                .setAuthorId(4)
                .setTitle("Exam timetables released")
                .setContent("The November exam timetable is now available on the portal.")
                .setStatus(BulletinPostStatus.PUBLISHED)
                .setFacultyAnnouncement(true)
                .setCreatedAt(now)
                .setUpdatedAt(now)
                .build();
        print("BulletinPost", bulletinPost);

        section("7. ADMIN");

        AuditLog auditLog = new AuditLog.Builder()
                .setAuditLogId(1)
                .setAdminId(4L)
                .setAction("APPROVE_VENDOR_APPLICATION")
                .setTargetType("VENDOR_APPLICATION")
                .setTargetId(1L)
                .setDetails("Approved Mokoena Tech after document check")
                .setCreatedAt(now)
                .build();
        print("AuditLog", auditLog);

        section("8. HELPER VALIDATION");

        // Positive cases
        check("isValidEmail('student@mycput.ac.za')", Helper.isValidEmail(user.getEmail()));
        check("isValidMobileNumber('0721234567')", Helper.isValidMobileNumber(user.getCellPhone()));
        check("isValidPassword('$2a$10$...')", Helper.isValidPassword(user.getPasswordHash()));
        check("isValidId(userId=1)", Helper.isValidId(user.getUserId()));
        check("isValidObject(accountStatus=ACTIVE)", Helper.isValidObject(user.getAccountStatus()));
        check("isValidBigDecimal(price=150.00)", Helper.isValidBigDecimal(listing.getPrice()));
        check("isValidRating(rating=5)", Helper.isValidRating(review.getRating()));
        check("isValidCurrency('ZAR')", Helper.isValidCurrency(wallet.getCurrency()));
        check("isValidUrl(imageUrl)", Helper.isValidUrl(listingImage.getImageUrl()));

        // Negative cases (validators should reject)
        check("isValidEmail('bad-email') -> false", !Helper.isValidEmail("bad-email"));
        check("isValidMobileNumber('0721') -> false", !Helper.isValidMobileNumber("0721"));
        check("isValidPassword('short') -> false", !Helper.isValidPassword("short"));
        check("isValidId(0) -> false", !Helper.isValidId(0));
        check("isValidBigDecimal(-5.00) -> false", !Helper.isValidBigDecimal(new BigDecimal("-5.00")));
        check("isValidRating(0) -> false", !Helper.isValidRating(0));
        check("isValidRating(6) -> false", !Helper.isValidRating(6));
        check("isValidCurrency('zar') -> false", !Helper.isValidCurrency("zar"));
        check("isValidUrl('not-a-url') -> false", !Helper.isValidUrl("not-a-url"));
        check("isNullOrEmpty('') -> true", Helper.isNullOrEmpty(""));

        summary();
    }

    //  Print a section header
    private static void section(String title) {
        System.out.println("\n========================================");
        System.out.println("  " + title);
        System.out.println("========================================");
    }

    //  Print one entity
    private static void print(String label, Object entity) {
        System.out.println("--- " + label + " ---");
        System.out.println("  " + entity);
    }

    //  Run one validation check
    private static void check(String label, boolean ok) {
        total++;
        if (ok) passed++;
        System.out.printf("  [%s] %s%n", ok ? "PASS" : "FAIL", label);
    }

    //  Print the test summary
    private static void summary() {
        System.out.println("\n========================================");
        System.out.printf("  RESULT: %d/%d checks passed%n", passed, total);
        System.out.println("========================================");
    }
}