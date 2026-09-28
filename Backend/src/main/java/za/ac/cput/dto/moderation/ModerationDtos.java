/*
 ModerationDtos.java

 Request and response shapes for /api/moderation and /api/admin.

 ModeratedUser is the only user view moderators get. It is built field by field
 so that a password hash can never leak through it, whatever is added to User
 later.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 24 September 2026
*/

package za.ac.cput.dto.moderation;

import java.time.LocalDateTime;
import java.util.List;

import za.ac.cput.domain.community.BulletinPost;
import za.ac.cput.domain.enums.AccountStatus;
import za.ac.cput.domain.enums.BulletinPostCategory;
import za.ac.cput.domain.enums.ReportReason;
import za.ac.cput.domain.enums.ReportStatus;
import za.ac.cput.domain.enums.ReportTargetType;
import za.ac.cput.domain.identity.User;

public final class ModerationDtos {

    private ModerationDtos() {}

    public record ModeratedUser(
            long userId,
            String email,
            String firstName,
            String middleName,
            String lastName,
            String cellPhone,
            Long campusId,
            AccountStatus accountStatus,
            String affiliation,
            List<String> roles,
            LocalDateTime emailVerifiedAt,
            LocalDateTime createdAt) {

        public static ModeratedUser of(User user, List<String> roles) {
            return new ModeratedUser(
                    user.getUserId(), user.getEmail(), user.getFirstName(), user.getMiddleName(),
                    user.getLastName(), user.getCellPhone(), user.getCampusId(), user.getAccountStatus(),
                    user.getAffiliation(), roles, user.getEmailVerifiedAt(), user.getCreatedAt());
        }
    }

    /** Who did or received something, in a list row. */
    public record UserSummary(long userId, String name, String email, AccountStatus accountStatus) {

        public static UserSummary of(User user) {
            if (user == null) {
                return null;
            }
            return new UserSummary(user.getUserId(),
                    (user.getFirstName() + " " + user.getLastName()).trim(),
                    user.getEmail(), user.getAccountStatus());
        }
    }

    public record UpdateUserRequest(
            String email,
            String firstName,
            String middleName,
            String lastName,
            String cellPhone,
            Long campusId) {
    }

    /**
     * The report a moderator must write to suspend or delete an account or take
     * content down: a reason from the dropdown plus a written explanation.
     * userReportId links it to the user report it answers, if any - that report
     * is then marked resolved.
     */
    public record ActionReportRequest(ReportReason reason, String details, Long userReportId) {
    }

    /** A report filed by a user, with enough about both sides for the moderation queue. */
    public record UserReportView(
            long reportId,
            ReportTargetType targetType,
            long targetId,
            String targetTitle,
            UserSummary targetOwner,
            UserSummary reporter,
            ReportReason category,
            String details,
            ReportStatus status,
            String resolutionNote,
            LocalDateTime createdAt,
            LocalDateTime resolvedAt) {
    }

    /** Why a moderator removed, suspended or dismissed something. Recorded in the audit log. */
    public record ReasonRequest(String reason) {
    }

    public record AnnouncementRequest(String title, String content, BulletinPostCategory category) {
    }

    public record ModeratedPost(BulletinPost post, UserSummary author) {
    }

    public record FlaggedReview(
            long reviewId,
            long transactionId,
            int rating,
            String comment,
            LocalDateTime createdAt,
            UserSummary reviewer,
            UserSummary reviewee) {
    }

    public record AuditEntry(
            long auditLogId,
            String action,
            String targetType,
            Long targetId,
            String details,
            LocalDateTime createdAt,
            UserSummary actor) {
    }

    public record Overview(
            long flaggedReviews,
            long suspendedUsers,
            long removedThisWeek,
            long pendingReports,
            long totalUsers,
            long activeListings,
            List<AuditEntry> recentActivity) {
    }

    public record PageResponse<T>(List<T> items, int page, int size, long total) {

        public static <T> PageResponse<T> of(List<T> all, int page, int size) {
            int safeSize = Math.max(1, Math.min(size, 100));
            int safePage = Math.max(0, page);
            int from = Math.min(all.size(), safePage * safeSize);
            int to = Math.min(all.size(), from + safeSize);
            return new PageResponse<>(all.subList(from, to), safePage, safeSize, all.size());
        }
    }

}
