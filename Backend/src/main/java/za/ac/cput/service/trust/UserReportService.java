/*
 UserReportService.java

 Files a report from the "Report" button on a listing, post or profile.

 Checks that what is reported exists, that nobody reports themselves or their
 own content, and that one person cannot pile repeat reports onto the same thing
 while the first is still open. Every moderator and admin is alerted.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 25 September 2026
*/

package za.ac.cput.service.trust;

import java.util.LinkedHashSet;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import za.ac.cput.domain.enums.ReportStatus;
import za.ac.cput.domain.enums.ReportTargetType;
import za.ac.cput.domain.enums.RoleType;
import za.ac.cput.domain.identity.User;
import za.ac.cput.domain.trust.Report;
import za.ac.cput.dto.trust.FileReportRequest;
import za.ac.cput.factory.trust.ReportFactory;
import za.ac.cput.repository.community.BulletinPostRepository;
import za.ac.cput.repository.identity.UserRepository;
import za.ac.cput.repository.marketplace.ListingRepository;
import za.ac.cput.repository.trust.ReportRepository;
import za.ac.cput.service.communication.NotificationPublisher;
import za.ac.cput.service.identity.RoleAssignmentService;
import za.ac.cput.service.moderation.ReportReasons;
import za.ac.cput.util.Helper;

@Service
public class UserReportService {

    private static final Logger log = LoggerFactory.getLogger(UserReportService.class);
    private static final int MAX_DETAILS = 500;

    private final ReportRepository reports;
    private final ListingRepository listings;
    private final BulletinPostRepository posts;
    private final UserRepository users;
    private final RoleAssignmentService roles;
    private final NotificationPublisher notifications;

    public UserReportService(ReportRepository reports, ListingRepository listings, BulletinPostRepository posts,
                             UserRepository users, RoleAssignmentService roles, NotificationPublisher notifications) {
        this.reports = reports;
        this.listings = listings;
        this.posts = posts;
        this.users = users;
        this.roles = roles;
        this.notifications = notifications;
    }

    @Transactional
    public Report file(User reporter, FileReportRequest request) {
        if (request == null || request.targetType() == null || request.targetId() == null) {
            throw new IllegalArgumentException("Say what you are reporting.");
        }
        if (request.category() == null) {
            throw new IllegalArgumentException("Choose a reason for your report.");
        }
        String details = request.details() == null ? "" : request.details().trim();
        if (details.length() > MAX_DETAILS) {
            throw new IllegalArgumentException("Keep the details under %d characters.".formatted(MAX_DETAILS));
        }

        ReportTargetType type = request.targetType();
        long targetId = request.targetId();
        long ownerId = ownerOf(type, targetId);
        if (ownerId == reporter.getUserId()) {
            throw new IllegalArgumentException("You can't report yourself or your own content.");
        }

        boolean alreadyOpen = this.reports.findByTargetTypeAndTargetId(type, targetId).stream()
                .anyMatch(existing -> existing.getReporterId() == reporter.getUserId()
                        && (existing.getStatus() == ReportStatus.PENDING || existing.getStatus() == ReportStatus.REVIEWED));
        if (alreadyOpen) {
            throw new IllegalArgumentException("You have already reported this. A moderator will look at it soon.");
        }

        Report saved = this.reports.save(ReportFactory.createReport(
                reporter.getUserId(), type, targetId, request.category(),
                Helper.isNullOrEmpty(details) ? ReportReasons.label(request.category()) : details));

        alertModerators(saved);
        return saved;
    }

    /* The account a report is ultimately about, or 404-style if the target is gone. */
    private long ownerOf(ReportTargetType type, long targetId) {
        return switch (type) {
            case LISTING -> this.listings.findById(targetId)
                    .orElseThrow(() -> new IllegalArgumentException("That listing no longer exists."))
                    .getSellerId();
            case BULLETIN_POST -> this.posts.findById(targetId)
                    .orElseThrow(() -> new IllegalArgumentException("That post no longer exists."))
                    .getAuthorId();
            case USER -> this.users.findById(targetId)
                    .orElseThrow(() -> new IllegalArgumentException("That account no longer exists."))
                    .getUserId();
            case MESSAGE -> throw new IllegalArgumentException("Messages are reported from the chat, not here.");
        };
    }

    private void alertModerators(Report report) {
        try {
            Set<Long> recipients = new LinkedHashSet<>(this.roles.userIdsWith(RoleType.MODERATOR));
            recipients.addAll(this.roles.userIdsWith(RoleType.ADMIN));
            String what = switch (report.getTargetType()) {
                case LISTING -> "listing";
                case BULLETIN_POST -> "bulletin post";
                case USER -> "profile";
                case MESSAGE -> "message";
            };
            this.notifications.userReportFiled(recipients, report.getReportId(), what,
                    ReportReasons.label(report.getCategory()));
        }
        catch (RuntimeException ex) {
            log.warn("Could not alert moderators about report {}: {}", report.getReportId(), ex.getMessage());
        }
    }

}
