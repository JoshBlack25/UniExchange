/*
 ModerationService.java

 Everything a moderator (and an admin) can do, in one place, with the rules that
 keep it safe:

   - Nothing is hard-deleted. Listings and posts become REMOVED and can be
     restored; a banned user is SUSPENDED; a "deleted" user is DEACTIVATED and
     anonymised, so wallets, purchases, reviews and chats that reference the id
     keep making sense. The one exception is a flagged review, which is deleted
     through the same path the old ADMIN-only endpoint used.
   - Hierarchy: nobody acts on their own account; only an admin acts on a
     moderator or admin account; the last admin can never be removed.
   - Every action is written to the audit log with the acting moderator's id.

 Role grants and revokes (the admin-only part) live here too, so the hierarchy
 rules are enforced in exactly one place.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 24 September 2026
*/

package za.ac.cput.service.moderation;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import za.ac.cput.domain.admin.AuditLog;
import za.ac.cput.domain.community.BulletinPost;
import za.ac.cput.domain.enums.AccountStatus;
import za.ac.cput.domain.enums.BulletinPostCategory;
import za.ac.cput.domain.enums.BulletinPostStatus;
import za.ac.cput.domain.enums.ListingStatus;
import za.ac.cput.domain.enums.ReportStatus;
import za.ac.cput.domain.enums.RoleType;
import za.ac.cput.domain.identity.User;
import za.ac.cput.domain.marketplace.Listing;
import za.ac.cput.domain.trust.Review;
import za.ac.cput.dto.marketplace.ListingDtos.ListingResponse;
import za.ac.cput.dto.moderation.ModerationDtos.AnnouncementRequest;
import za.ac.cput.dto.moderation.ModerationDtos.AuditEntry;
import za.ac.cput.dto.moderation.ModerationDtos.FlaggedReview;
import za.ac.cput.dto.moderation.ModerationDtos.ModeratedPost;
import za.ac.cput.dto.moderation.ModerationDtos.ModeratedUser;
import za.ac.cput.dto.moderation.ModerationDtos.Overview;
import za.ac.cput.dto.moderation.ModerationDtos.ActionReportRequest;
import za.ac.cput.dto.moderation.ModerationDtos.PageResponse;
import za.ac.cput.dto.moderation.ModerationDtos.UserReportView;
import za.ac.cput.dto.moderation.ModerationDtos.UpdateUserRequest;
import za.ac.cput.dto.moderation.ModerationDtos.UserSummary;
import za.ac.cput.domain.admin.ModerationReport;
import za.ac.cput.domain.enums.ModerationAction;
import za.ac.cput.domain.enums.ReportStatus;
import za.ac.cput.domain.enums.ReportTargetType;
import za.ac.cput.domain.trust.Report;
import za.ac.cput.exception.ModerationDeniedException;
import za.ac.cput.exception.ServiceUnavailableException;
import za.ac.cput.factory.admin.AuditLogFactory;
import za.ac.cput.factory.community.BulletinPostFactory;
import za.ac.cput.factory.identity.UserFactory;
import za.ac.cput.mail.EmailSender;
import za.ac.cput.repository.admin.AuditLogRepository;
import za.ac.cput.repository.community.BulletinPostRepository;
import za.ac.cput.repository.identity.ProfilePhotoRepository;
import za.ac.cput.repository.identity.UserRepository;
import za.ac.cput.repository.marketplace.ListingRepository;
import za.ac.cput.repository.trust.ReportRepository;
import za.ac.cput.repository.trust.ReviewRepository;
import za.ac.cput.security.UniExchangeUserDetailsService.AuthenticatedUser;
import za.ac.cput.service.marketplace.ListingCoverImages;
import za.ac.cput.service.communication.NotificationPublisher;
import za.ac.cput.service.identity.DeviceTrustService;
import za.ac.cput.service.identity.RoleAssignmentService;
import za.ac.cput.service.trust.TrustScoreService;
import za.ac.cput.util.Helper;

@Service
public class ModerationService {

    private static final Logger log = LoggerFactory.getLogger(ModerationService.class);

    static final String REVIEW = "REVIEW";
    static final String ACTION_REVIEW_DISMISSED = "REVIEW_DISMISSED";

    // No 0/O, 1/l/I: the temporary password is read off an email and typed in.
    private static final String PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    private static final int TEMP_PASSWORD_LENGTH = 12;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository users;
    private final ListingRepository listings;
    private final BulletinPostRepository posts;
    private final ReviewRepository reviews;
    private final ReportRepository reports;
    private final AuditLogRepository auditLogs;
    private final RoleAssignmentService roles;
    private final DeviceTrustService deviceTrust;
    private final PasswordEncoder passwordEncoder;
    private final EmailSender emailSender;
    private final NotificationPublisher notifications;
    private final TrustScoreService trustScore;
    private final ListingCoverImages covers;
    private final ModerationReportService actionReports;
    private final ProfilePhotoRepository profilePhotos;
    private final int badReviewThreshold;

    public ModerationService(UserRepository users,
                             ListingRepository listings,
                             BulletinPostRepository posts,
                             ReviewRepository reviews,
                             ReportRepository reports,
                             AuditLogRepository auditLogs,
                             RoleAssignmentService roles,
                             DeviceTrustService deviceTrust,
                             PasswordEncoder passwordEncoder,
                             EmailSender emailSender,
                             NotificationPublisher notifications,
                             TrustScoreService trustScore,
                             ListingCoverImages covers,
                             ModerationReportService actionReports,
                             ProfilePhotoRepository profilePhotos,
                             @Value("${app.moderation.bad-review-threshold:2}") int badReviewThreshold) {
        this.users = users;
        this.listings = listings;
        this.posts = posts;
        this.reviews = reviews;
        this.reports = reports;
        this.auditLogs = auditLogs;
        this.roles = roles;
        this.deviceTrust = deviceTrust;
        this.passwordEncoder = passwordEncoder;
        this.emailSender = emailSender;
        this.notifications = notifications;
        this.trustScore = trustScore;
        this.covers = covers;
        this.actionReports = actionReports;
        this.profilePhotos = profilePhotos;
        this.badReviewThreshold = badReviewThreshold;
    }

    // ------------------------------------------------------------------ overview

    public Overview overview() {
        LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);

        long removedListings = this.listings.findByStatus(ListingStatus.REMOVED).stream()
                .filter(listing -> listing.getDeletedAt() != null && listing.getDeletedAt().isAfter(weekAgo))
                .count();
        long removedPosts = this.posts.findByStatus(BulletinPostStatus.REMOVED).stream()
                .filter(post -> post.getRemovedAt() != null && post.getRemovedAt().isAfter(weekAgo))
                .count();

        return new Overview(
                flaggedReviews().size(),
                this.users.findByAccountStatus(AccountStatus.SUSPENDED).size(),
                removedListings + removedPosts,
                this.reports.findByStatus(ReportStatus.PENDING).size(),
                this.users.count(),
                this.listings.findByStatus(ListingStatus.ACTIVE).size(),
                auditLog(0, 8).items());
    }

    // --------------------------------------------------------------------- users

    public PageResponse<ModeratedUser> listUsers(String query, AccountStatus status, int page, int size) {
        String needle = Helper.isNullOrEmpty(query) ? null : query.trim().toLowerCase();

        List<ModeratedUser> matches = this.users.findAll().stream()
                .filter(user -> status == null || user.getAccountStatus() == status)
                .filter(user -> needle == null || matchesQuery(user, needle))
                .sorted(Comparator.comparing(User::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::view)
                .toList();
        return PageResponse.of(matches, page, size);
    }

    public ModeratedUser getUser(long userId) {
        return view(requireUser(userId));
    }

    @Transactional
    public ModeratedUser updateUser(AuthenticatedUser actor, long userId, UpdateUserRequest request) {
        User target = requireUser(userId);
        requireMayActOn(actor, target);

        String email = Helper.isNullOrEmpty(request.email())
                ? target.getEmail()
                : request.email().trim().toLowerCase();
        if (!email.equals(target.getEmail())) {
            if (!Helper.isValidStudentEmail(email) && !Helper.isStaffEmail(email)) {
                throw new IllegalArgumentException(
                        "Use a CPUT address: student number@mycput.ac.za or name@cput.ac.za");
            }
            // Bootstrap addresses are granted MODERATOR/ADMIN by email alone, so
            // moving an account onto one would be a promotion.
            if (this.roles.bootstrapEmails().contains(email)) {
                throw new ModerationDeniedException("That address is reserved and cannot be assigned.");
            }
            if (this.users.existsByEmail(email)) {
                throw new IllegalArgumentException("Another account already uses " + email);
            }
        }

        User updated = this.users.save(UserFactory.updateUser(
                target,
                email,
                valueOr(request.firstName(), target.getFirstName()),
                request.middleName() == null ? target.getMiddleName() : blankToNull(request.middleName()),
                valueOr(request.lastName(), target.getLastName()),
                request.cellPhone() == null ? target.getCellPhone() : blankToNull(request.cellPhone()),
                target.getPasswordHash(),
                target.getDateOfBirth(),
                target.getAccountStatus(),
                request.campusId() == null ? target.getCampusId() : request.campusId()));

        if (!email.equals(target.getEmail())) {
            // The new mailbox has not proved itself yet: forget every trusted
            // browser so the next sign-in has to pass a code sent to it.
            this.deviceTrust.revokeAll(userId);
        }

        audit(actor, "USER_UPDATED", "USER", userId, "Edited profile details");
        return view(updated);
    }

    @Transactional
    public ModeratedUser suspend(AuthenticatedUser actor, long userId, ActionReportRequest report) {
        User target = requireUser(userId);
        requireMayActOn(actor, target);
        requireNotLastAdmin(target);
        if (target.getAccountStatus() == AccountStatus.DEACTIVATED) {
            throw new IllegalArgumentException("This account has been deleted.");
        }
        if (target.getAccountStatus() == AccountStatus.SUSPENDED) {
            throw new IllegalArgumentException("This account is already suspended.");
        }
        ModerationReportService.requireValid(report);

        User suspended = this.users.save(UserFactory.changeStatus(target, AccountStatus.SUSPENDED));
        this.deviceTrust.revokeAll(userId);

        // Kept on file; the suspended user sees the "account suspended" notice at sign-in.
        ModerationReport filed = this.actionReports.file(actor, ModerationAction.ACCOUNT_SUSPENDED, report,
                target, "USER", userId, fullName(target), false);
        closeUserReports(actor, ReportTargetType.USER, userId, filed);

        audit(actor, AuditActions.USER_SUSPENDED, "USER", userId, summary(filed));
        return view(suspended);
    }

    @Transactional
    public ModeratedUser reinstate(AuthenticatedUser actor, long userId) {
        User target = requireUser(userId);
        requireMayActOn(actor, target);
        if (target.getAccountStatus() != AccountStatus.SUSPENDED) {
            throw new IllegalArgumentException("Only a suspended account can be reinstated.");
        }

        User active = this.users.save(UserFactory.changeStatus(target, AccountStatus.ACTIVE));
        audit(actor, "USER_REINSTATED", "USER", userId, null);
        return view(active);
    }

    /**
     * Emails the user a random temporary password. The moderator never sees it,
     * and every existing session for the account ends.
     */
    @Transactional
    public void resetPassword(AuthenticatedUser actor, long userId) {
        User target = requireUser(userId);
        requireMayActOn(actor, target);
        if (target.getAccountStatus() == AccountStatus.DEACTIVATED) {
            throw new IllegalArgumentException("This account has been deleted.");
        }

        String temporary = temporaryPassword();
        this.users.save(UserFactory.changePassword(target, this.passwordEncoder.encode(temporary)));
        this.deviceTrust.revokeAll(userId);

        try {
            this.emailSender.send(target.getEmail(), "Your UniExchange password was reset", """
                    Hi %s,

                    A UniExchange moderator has reset your password. Your temporary password is:

                        %s

                    Sign in with it, then change it straight away from your profile
                    (Profile -> Change password). You will be asked for a code
                    from this mailbox the first time you sign in on each device.

                    If you did not ask for this, reply to this email.

                    - The UniExchange team
                    """.formatted(target.getFirstName(), temporary));
        }
        catch (MailException ex) {
            // Rolls the whole reset back, so the old password still works and
            // the moderator can simply try again.
            log.error("Could not email the reset password to userId {}", userId, ex);
            throw new ServiceUnavailableException("The reset email could not be sent. Nothing was changed - try again.", ex);
        }

        this.notifications.passwordReset(userId);
        audit(actor, "USER_PASSWORD_RESET", "USER", userId, "Temporary password emailed");
    }

    /**
     * "Delete user": the account is closed and anonymised, its live listings and
     * posts are taken down, and any moderator/admin role is revoked. The row is
     * kept so money and chat history that points at it stays intact.
     */
    @Transactional
    public void deleteUser(AuthenticatedUser actor, long userId, ActionReportRequest report) {
        User target = requireUser(userId);
        requireMayActOn(actor, target);
        requireNotLastAdmin(target);
        if (target.getAccountStatus() == AccountStatus.DEACTIVATED) {
            throw new IllegalArgumentException("This account has already been deleted.");
        }
        ModerationReportService.requireValid(report);

        // Filed BEFORE anonymising, so the report keeps the real name and email.
        ModerationReport filed = this.actionReports.file(actor, ModerationAction.ACCOUNT_DELETED, report,
                target, "USER", userId, fullName(target), false);
        closeUserReports(actor, ReportTargetType.USER, userId, filed);

        String originalEmail = target.getEmail();
        this.profilePhotos.deleteById(userId);
        this.users.save(UserFactory.anonymise(target, this.passwordEncoder.encode(temporaryPassword())));
        this.deviceTrust.revokeAll(userId);
        this.roles.revoke(userId, RoleType.MODERATOR);
        this.roles.revoke(userId, RoleType.ADMIN);

        LocalDateTime now = LocalDateTime.now();
        for (Listing listing : this.listings.findBySellerId(userId)) {
            if (listing.getStatus() == ListingStatus.ACTIVE) {
                this.listings.save(withListingStatus(listing, ListingStatus.REMOVED, now));
            }
        }
        for (BulletinPost post : this.posts.findByAuthorId(userId)) {
            if (post.getStatus() != BulletinPostStatus.REMOVED) {
                this.posts.save(withPostStatus(post, BulletinPostStatus.REMOVED, now));
            }
        }

        audit(actor, "USER_DELETED", "USER", userId, "Was " + originalEmail + ". " + summary(filed));
    }

    // ------------------------------------------------------------------ listings

    public List<ListingResponse> listListings(ListingStatus status, String query) {
        String needle = Helper.isNullOrEmpty(query) ? null : query.trim().toLowerCase();
        List<Listing> matches = (status == null ? this.listings.findAll() : this.listings.findByStatus(status))
                .stream()
                .filter(listing -> needle == null
                        || (listing.getTitle() != null && listing.getTitle().toLowerCase().contains(needle)))
                .sorted(Comparator.comparing(Listing::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        Map<Long, User> sellers = usersById(matches.stream().map(Listing::getSellerId).toList());
        Map<Long, String> coverUrls = this.covers.forListings(matches.stream().map(Listing::getListingId).toList());
        return matches.stream()
                .map(listing -> ListingResponse.of(listing, sellers.get(listing.getSellerId()),
                        coverUrls.get(listing.getListingId())))
                .toList();
    }

    @Transactional
    public ListingResponse removeListing(AuthenticatedUser actor, long listingId, ActionReportRequest report) {
        Listing listing = requireListing(listingId);
        if (listing.getStatus() == ListingStatus.REMOVED) {
            throw new IllegalArgumentException("This listing has already been removed.");
        }
        /*
         SOLD listings have a purchase attached; removing one would break the
         buyer's Purchases page link. They are finished anyway.
        */
        if (listing.getStatus() == ListingStatus.SOLD) {
            throw new IllegalArgumentException("A sold listing cannot be removed.");
        }

        ModerationReportService.requireValid(report);

        Listing removed = this.listings.save(withListingStatus(listing, ListingStatus.REMOVED, LocalDateTime.now()));
        User seller = requireUser(listing.getSellerId());
        // Sent to the seller: notification plus email.
        ModerationReport filed = this.actionReports.file(actor, ModerationAction.LISTING_REMOVED, report,
                seller, "LISTING", listingId, listing.getTitle(), true);
        closeUserReports(actor, ReportTargetType.LISTING, listingId, filed);
        audit(actor, AuditActions.LISTING_REMOVED, "LISTING", listingId, summary(filed));
        return ListingResponse.of(removed, this.users.findById(removed.getSellerId()).orElse(null));
    }

    @Transactional
    public ListingResponse restoreListing(AuthenticatedUser actor, long listingId) {
        Listing listing = requireListing(listingId);
        if (listing.getStatus() != ListingStatus.REMOVED) {
            throw new IllegalArgumentException("Only a removed listing can be restored.");
        }

        Listing restored = this.listings.save(withListingStatus(listing, ListingStatus.ACTIVE, null));
        audit(actor, "LISTING_RESTORED", "LISTING", listingId, null);
        return ListingResponse.of(restored, this.users.findById(restored.getSellerId()).orElse(null));
    }

    // --------------------------------------------------------------------- posts

    public List<ModeratedPost> listPosts(BulletinPostStatus status, Boolean announcements) {
        List<BulletinPost> matches = (status == null ? this.posts.findAll() : this.posts.findByStatus(status))
                .stream()
                .filter(post -> announcements == null || post.isFacultyAnnouncement() == announcements)
                .sorted(Comparator.comparing(BulletinPost::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        Map<Long, User> authors = usersById(matches.stream().map(BulletinPost::getAuthorId).toList());
        return matches.stream()
                .map(post -> new ModeratedPost(post, UserSummary.of(authors.get(post.getAuthorId()))))
                .toList();
    }

    @Transactional
    public BulletinPost removePost(AuthenticatedUser actor, long postId, ActionReportRequest report) {
        BulletinPost post = requirePost(postId);
        if (post.getStatus() == BulletinPostStatus.REMOVED) {
            throw new IllegalArgumentException("This post has already been removed.");
        }
        ModerationReportService.requireValid(report);

        BulletinPost removed = this.posts.save(withPostStatus(post, BulletinPostStatus.REMOVED, LocalDateTime.now()));
        User author = requireUser(post.getAuthorId());
        boolean someoneElses = post.getAuthorId() != actor.getUser().getUserId();
        ModerationReport filed = this.actionReports.file(actor, ModerationAction.POST_REMOVED, report,
                author, "BULLETIN_POST", postId, post.getTitle(), someoneElses);
        closeUserReports(actor, ReportTargetType.BULLETIN_POST, postId, filed);
        audit(actor, post.isFacultyAnnouncement() ? AuditActions.ANNOUNCEMENT_REMOVED : AuditActions.POST_REMOVED,
                "BULLETIN_POST", postId, summary(filed));
        return removed;
    }

    /**
     * Deleting an announcement from the Announcements tab. Announcements are
     * moderator-authored notices, not a user's content, so no report is needed.
     */
    @Transactional
    public BulletinPost removeAnnouncement(AuthenticatedUser actor, long postId) {
        BulletinPost post = requirePost(postId);
        if (!post.isFacultyAnnouncement()) {
            throw new IllegalArgumentException("That is not an announcement.");
        }
        if (post.getStatus() == BulletinPostStatus.REMOVED) {
            throw new IllegalArgumentException("This announcement has already been removed.");
        }
        BulletinPost removed = this.posts.save(withPostStatus(post, BulletinPostStatus.REMOVED, LocalDateTime.now()));
        audit(actor, AuditActions.ANNOUNCEMENT_REMOVED, "BULLETIN_POST", postId, "Announcement deleted");
        return removed;
    }

    @Transactional
    public BulletinPost restorePost(AuthenticatedUser actor, long postId) {
        BulletinPost post = requirePost(postId);
        if (post.getStatus() != BulletinPostStatus.REMOVED) {
            throw new IllegalArgumentException("Only a removed post can be restored.");
        }

        BulletinPost restored = this.posts.save(withPostStatus(post, BulletinPostStatus.PUBLISHED, null));
        audit(actor, "POST_RESTORED", "BULLETIN_POST", postId, null);
        return restored;
    }

    // ------------------------------------------------------------- announcements

    @Transactional
    public BulletinPost createAnnouncement(AuthenticatedUser actor, AnnouncementRequest request) {
        BulletinPost created = this.posts.save(BulletinPostFactory.createBulletinPost(
                actor.getUser().getUserId(), request.title(), request.content(),
                BulletinPostStatus.PUBLISHED, true,
                request.category() == null ? BulletinPostCategory.GENERAL : request.category()));
        audit(actor, "ANNOUNCEMENT_CREATED", "BULLETIN_POST", created.getBulletinPostId(), created.getTitle());
        return created;
    }

    @Transactional
    public BulletinPost updateAnnouncement(AuthenticatedUser actor, long postId, AnnouncementRequest request) {
        BulletinPost existing = requirePost(postId);
        if (!existing.isFacultyAnnouncement()) {
            throw new IllegalArgumentException("That post is not a campus announcement.");
        }

        BulletinPost updated = this.posts.save(BulletinPostFactory.updateBulletinPost(
                existing, existing.getAuthorId(), request.title(), request.content(),
                existing.getStatus(), true,
                request.category() == null ? existing.getCategory() : request.category()));
        audit(actor, "ANNOUNCEMENT_UPDATED", "BULLETIN_POST", postId, updated.getTitle());
        return updated;
    }

    // ------------------------------------------------------------------- reviews

    /** Reviews at or below the threshold that no moderator has dismissed yet, newest first. */
    public List<FlaggedReview> flaggedReviews() {
        Set<Long> dismissed = this.auditLogs.findByTargetType(REVIEW).stream()
                .filter(entry -> ACTION_REVIEW_DISMISSED.equals(entry.getAction()))
                .map(AuditLog::getTargetId)
                .collect(Collectors.toSet());

        List<Review> flagged = this.reviews.findAll().stream()
                .filter(review -> review.getRating() <= this.badReviewThreshold)
                .filter(review -> !dismissed.contains(review.getReviewId()))
                .sorted(Comparator.comparing(Review::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        Map<Long, User> people = usersById(flagged.stream()
                .flatMap(review -> java.util.stream.Stream.of(review.getReviewerId(), review.getRevieweeId()))
                .toList());

        return flagged.stream()
                .map(review -> new FlaggedReview(
                        review.getReviewId(), review.getTransactionId(), review.getRating(), review.getComment(),
                        review.getCreatedAt(),
                        UserSummary.of(people.get(review.getReviewerId())),
                        UserSummary.of(people.get(review.getRevieweeId()))))
                .toList();
    }

    /** The review was fine after all: it stays, and leaves the queue. */
    @Transactional
    public void dismissReview(AuthenticatedUser actor, long reviewId, String note) {
        requireReview(reviewId);
        audit(actor, ACTION_REVIEW_DISMISSED, REVIEW, reviewId, reasonOrDefault(note));
    }

    /** The review was abusive or fake: it is deleted and the reviewee's badge re-evaluated. */
    @Transactional
    public void removeReview(AuthenticatedUser actor, long reviewId, String note) {
        Review review = requireReview(reviewId);
        this.reviews.delete(review);
        audit(actor, AuditActions.REVIEW_REMOVED, REVIEW, reviewId,
                review.getRating() + "-star review of userId " + review.getRevieweeId() + ". " + reasonOrDefault(note));

        try {
            this.trustScore.reevaluate(review.getRevieweeId());
        }
        catch (RuntimeException ex) {
            log.warn("Badge re-evaluation after removing review {} failed: {}", reviewId, ex.getMessage());
        }
    }

    // ----------------------------------------------------------------- audit log

    public PageResponse<AuditEntry> auditLog(int page, int size) {
        List<AuditLog> all = this.auditLogs.findAllByOrderByCreatedAtDesc();
        PageResponse<AuditLog> slice = PageResponse.of(all, page, size);

        Map<Long, User> actors = usersById(slice.items().stream().map(AuditLog::getAdminId).toList());
        List<AuditEntry> entries = slice.items().stream()
                .map(entry -> new AuditEntry(
                        entry.getAuditLogId(), entry.getAction(), entry.getTargetType(), entry.getTargetId(),
                        entry.getDetails(), entry.getCreatedAt(), UserSummary.of(actors.get(entry.getAdminId()))))
                .toList();
        return new PageResponse<>(entries, slice.page(), slice.size(), slice.total());
    }

    // --------------------------------------------------------- admin: staff roles

    public List<ModeratedUser> staff() {
        Set<Long> ids = new java.util.LinkedHashSet<>(this.roles.userIdsWith(RoleType.ADMIN));
        ids.addAll(this.roles.userIdsWith(RoleType.MODERATOR));
        return this.users.findAllById(ids).stream()
                .sorted(Comparator.comparing(User::getFirstName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .map(this::view)
                .toList();
    }

    @Transactional
    public ModeratedUser grantRole(AuthenticatedUser actor, long userId, RoleType role) {
        requireStaffRole(role);
        User target = requireUser(userId);
        if (target.getAccountStatus() != AccountStatus.ACTIVE) {
            throw new IllegalArgumentException("Only an active account can be given a staff role.");
        }

        this.roles.grant(userId, role);
        audit(actor, role.name() + "_GRANTED", "USER", userId, null);
        return view(target);
    }

    @Transactional
    public ModeratedUser revokeRole(AuthenticatedUser actor, long userId, RoleType role) {
        requireStaffRole(role);
        User target = requireUser(userId);
        if (role == RoleType.ADMIN) {
            if (target.getUserId() == actor.getUser().getUserId()) {
                throw new ModerationDeniedException("You cannot remove your own admin access.");
            }
            requireNotLastAdmin(target);
        }

        this.roles.revoke(userId, role);
        audit(actor, role.name() + "_REVOKED", "USER", userId, null);
        return view(target);
    }

    // ------------------------------------------------------------------- helpers

    /*
     Moderators look after ordinary accounts. Moderator and admin accounts can
     only be touched by an admin, and nobody may act on themselves - a moderator
     banning or resetting their own account is always a mistake.
    */
    private void requireMayActOn(AuthenticatedUser actor, User target) {
        if (target.getUserId() == actor.getUser().getUserId()) {
            throw new ModerationDeniedException("You cannot do that to your own account.");
        }
        Set<RoleType> targetRoles = this.roles.rolesOf(target.getUserId());
        boolean targetIsStaff = targetRoles.contains(RoleType.MODERATOR) || targetRoles.contains(RoleType.ADMIN);
        if (targetIsStaff && !actor.isAdministering()) {
            throw new ModerationDeniedException("Only an admin can act on a moderator or admin account.");
        }
    }

    private void requireNotLastAdmin(User target) {
        if (!this.roles.has(target.getUserId(), RoleType.ADMIN)) {
            return;
        }
        long activeAdmins = this.users.findAllById(this.roles.userIdsWith(RoleType.ADMIN)).stream()
                .filter(user -> user.getAccountStatus() == AccountStatus.ACTIVE)
                .count();
        if (activeAdmins <= 1) {
            throw new ModerationDeniedException("This is the last admin account, so it cannot be removed.");
        }
    }

    private static void requireStaffRole(RoleType role) {
        if (role != RoleType.MODERATOR && role != RoleType.ADMIN) {
            throw new IllegalArgumentException("Only MODERATOR and ADMIN are managed here.");
        }
    }

    private ModeratedUser view(User user) {
        List<String> roleNames = this.roles.rolesOf(user.getUserId()).stream()
                .map(RoleType::name)
                .sorted()
                .toList();
        return ModeratedUser.of(user, roleNames);
    }

    private Map<Long, User> usersById(List<Long> ids) {
        return this.users.findAllById(ids.stream().distinct().toList()).stream()
                .collect(Collectors.toMap(User::getUserId, Function.identity()));
    }

    private static boolean matchesQuery(User user, String needle) {
        String name = ((user.getFirstName() == null ? "" : user.getFirstName()) + " "
                + (user.getLastName() == null ? "" : user.getLastName())).toLowerCase();
        return name.contains(needle)
                || (user.getEmail() != null && user.getEmail().toLowerCase().contains(needle))
                || String.valueOf(user.getUserId()).equals(needle);
    }

    // --------------------------------------------------------------- user reports

    public List<UserReportView> userReports(ReportStatus status) {
        List<Report> matches = (status == null ? this.reports.findAll() : this.reports.findByStatus(status))
                .stream()
                .sorted(Comparator.comparing(Report::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
        Map<Long, User> reporters = usersById(matches.stream().map(Report::getReporterId).toList());
        return matches.stream().map(report -> userReportView(report, reporters.get(report.getReporterId()))).toList();
    }

    /** Closes a user report with no action: what was reported is within the guidelines. */
    @Transactional
    public UserReportView dismissUserReport(AuthenticatedUser actor, long reportId, String note) {
        Report report = this.reports.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("Report not found."));
        if (report.getStatus() != ReportStatus.PENDING && report.getStatus() != ReportStatus.REVIEWED) {
            throw new IllegalArgumentException("This report has already been closed.");
        }
        Report closed = this.reports.save(new Report.Builder()
                .copy(report)
                .setStatus(ReportStatus.DISMISSED)
                .setHandledBy(actor.getUser().getUserId())
                .setResolutionNote(reasonOrDefault(note))
                .setResolvedAt(LocalDateTime.now())
                .build());
        this.notifications.userReportClosed(report.getReporterId(), reportId, false);
        audit(actor, "USER_REPORT_DISMISSED", "REPORT", reportId, reasonOrDefault(note));
        return userReportView(closed, this.users.findById(closed.getReporterId()).orElse(null));
    }

    /* Every open user report about what was just actioned is answered by the moderator's report. */
    private void closeUserReports(AuthenticatedUser actor, ReportTargetType type, long targetId, ModerationReport filed) {
        LocalDateTime now = LocalDateTime.now();
        for (Report open : this.reports.findByTargetTypeAndTargetId(type, targetId)) {
            if (open.getStatus() != ReportStatus.PENDING && open.getStatus() != ReportStatus.REVIEWED) {
                continue;
            }
            this.reports.save(new Report.Builder()
                    .copy(open)
                    .setStatus(ReportStatus.RESOLVED)
                    .setHandledBy(actor.getUser().getUserId())
                    .setResolutionNote("Action taken - see MR-" + filed.getModerationReportId())
                    .setResolvedAt(now)
                    .build());
            this.notifications.userReportClosed(open.getReporterId(), open.getReportId(), true);
        }
    }

    private UserReportView userReportView(Report report, User reporter) {
        String title;
        User owner;
        switch (report.getTargetType()) {
            case LISTING -> {
                Listing listing = this.listings.findById(report.getTargetId()).orElse(null);
                title = listing == null ? "Deleted listing" : listing.getTitle();
                owner = listing == null ? null : this.users.findById(listing.getSellerId()).orElse(null);
            }
            case BULLETIN_POST -> {
                BulletinPost post = this.posts.findById(report.getTargetId()).orElse(null);
                title = post == null ? "Deleted post" : post.getTitle();
                owner = post == null ? null : this.users.findById(post.getAuthorId()).orElse(null);
            }
            case USER -> {
                owner = this.users.findById(report.getTargetId()).orElse(null);
                title = owner == null ? "Unknown account" : fullName(owner);
            }
            default -> {
                owner = null;
                title = "Message #" + report.getTargetId();
            }
        }
        return new UserReportView(report.getReportId(), report.getTargetType(), report.getTargetId(), title,
                UserSummary.of(owner), UserSummary.of(reporter), report.getCategory(), report.getReason(),
                report.getStatus(), report.getResolutionNote(), report.getCreatedAt(), report.getResolvedAt());
    }

    private static String summary(ModerationReport report) {
        return ReportReasons.label(report.getReason()) + " - report MR-" + report.getModerationReportId();
    }

    private static String fullName(User user) {
        return ((user.getFirstName() == null ? "" : user.getFirstName()) + " "
                + (user.getLastName() == null ? "" : user.getLastName())).trim();
    }

    private User requireUser(long userId) {
        return this.users.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("No user with id " + userId));
    }

    private Listing requireListing(long listingId) {
        return this.listings.findById(listingId)
                .orElseThrow(() -> new IllegalArgumentException("No listing with id " + listingId));
    }

    private BulletinPost requirePost(long postId) {
        return this.posts.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("No post with id " + postId));
    }

    private Review requireReview(long reviewId) {
        return this.reviews.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("No review with id " + reviewId));
    }

    private static Listing withListingStatus(Listing listing, ListingStatus status, LocalDateTime deletedAt) {
        return new Listing.Builder()
                .copy(listing)
                .setStatus(status)
                .setDeletedAt(deletedAt)
                .setUpdatedAt(LocalDateTime.now())
                .build();
    }

    private static BulletinPost withPostStatus(BulletinPost post, BulletinPostStatus status, LocalDateTime removedAt) {
        return new BulletinPost.Builder()
                .copy(post)
                .setStatus(status)
                .setRemovedAt(removedAt)
                .setUpdatedAt(LocalDateTime.now())
                .build();
    }

    private void audit(AuthenticatedUser actor, String action, String targetType, Long targetId, String details) {
        this.auditLogs.save(AuditLogFactory.createAuditLog(
                actor.getUser().getUserId(), action, targetType, targetId, details));
    }

    private static String temporaryPassword() {
        StringBuilder password = new StringBuilder(TEMP_PASSWORD_LENGTH);
        for (int i = 0; i < TEMP_PASSWORD_LENGTH; i++) {
            password.append(PASSWORD_ALPHABET.charAt(RANDOM.nextInt(PASSWORD_ALPHABET.length())));
        }
        return password.toString();
    }

    private static String reasonOrDefault(String reason) {
        return Helper.isNullOrEmpty(reason) ? "No reason given" : reason.trim();
    }

    private static String valueOr(String value, String fallback) {
        return Helper.isNullOrEmpty(value) ? fallback : value.trim();
    }

    private static String blankToNull(String value) {
        return Helper.isNullOrEmpty(value) ? null : value.trim();
    }

}
