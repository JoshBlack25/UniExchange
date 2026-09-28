/*
 ModerationReportService.java

 Files the written report behind every suspension, account deletion and content
 removal, and delivers it to the affected user when the action is one they
 should be told about (a removed listing or post).

 Delivery is an in-app notification plus an email. A failed email never undoes
 the moderation action: the report is still saved and the notification still
 sent, and emailedAt stays empty so moderators can see it did not go out.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 25 September 2026
*/

package za.ac.cput.service.moderation;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.stereotype.Service;

import za.ac.cput.domain.admin.ModerationReport;
import za.ac.cput.domain.enums.ModerationAction;
import za.ac.cput.domain.identity.User;
import za.ac.cput.dto.moderation.ModerationDtos.ActionReportRequest;
import za.ac.cput.factory.admin.ModerationReportFactory;
import za.ac.cput.mail.EmailSender;
import za.ac.cput.repository.admin.ModerationReportRepository;
import za.ac.cput.security.UniExchangeUserDetailsService.AuthenticatedUser;
import za.ac.cput.service.communication.NotificationPublisher;

@Service
public class ModerationReportService {

    private static final Logger log = LoggerFactory.getLogger(ModerationReportService.class);

    private final ModerationReportRepository reports;
    private final NotificationPublisher notifications;
    private final EmailSender emailSender;

    public ModerationReportService(ModerationReportRepository reports,
                                   NotificationPublisher notifications,
                                   EmailSender emailSender) {
        this.reports = reports;
        this.notifications = notifications;
        this.emailSender = emailSender;
    }

    /** Throws before anything changes if the report is missing or too thin. */
    public static void requireValid(ActionReportRequest report) {
        ModerationReportFactory.requireValid(report == null ? null : report.reason(),
                report == null ? null : report.details());
    }

    /**
     * Saves the report. Call with `subject` as it was BEFORE the action (so a
     * deleted account's real name and email are what is kept).
     *
     * @param sendToUser tell the subject about it by notification and email
     */
    public ModerationReport file(AuthenticatedUser actor, ModerationAction action, ActionReportRequest report,
                                 User subject, String targetType, long targetId, String targetTitle,
                                 boolean sendToUser) {
        User moderator = actor.getUser();
        ModerationReport saved = this.reports.save(ModerationReportFactory.create(
                action, report.reason(), report.details(),
                subject.getUserId(), fullName(subject), subject.getEmail(),
                targetType, targetId, targetTitle,
                moderator.getUserId(), fullName(moderator), report.userReportId(),
                sendToUser));

        if (sendToUser) {
            deliver(saved, subject);
        }
        return saved;
    }

    public List<ModerationReport> list(ModerationAction action, Long subjectUserId) {
        if (subjectUserId != null) {
            return this.reports.findBySubjectUserIdOrderByCreatedAtDesc(subjectUserId).stream()
                    .filter(report -> action == null || report.getAction() == action)
                    .toList();
        }
        return action == null
                ? this.reports.findAllByOrderByCreatedAtDesc()
                : this.reports.findByActionOrderByCreatedAtDesc(action);
    }

    public ModerationReport read(long id) {
        return this.reports.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Report not found."));
    }

    private void deliver(ModerationReport report, User subject) {
        String what = report.getAction() == ModerationAction.LISTING_REMOVED ? "listing" : "post";
        String reason = ReportReasons.label(report.getReason());

        this.notifications.contentRemoved(subject.getUserId(), report, what, reason);

        try {
            this.emailSender.send(subject.getEmail(), "Your UniExchange " + what + " was removed", """
                    Hi %s,

                    A UniExchange moderator removed your %s "%s".

                    Reason: %s

                    Moderator's report:
                    %s

                    Report reference: MR-%d

                    If you think this was a mistake, reply to this email and quote the
                    reference above. Please review the community guidelines before
                    posting again - repeated removals can lead to a suspension.

                    - The UniExchange team
                    """.formatted(subject.getFirstName(), what, report.getTargetTitle(), reason,
                    report.getDetails(), report.getModerationReportId()));
            this.reports.save(ModerationReportFactory.markEmailed(report));
        }
        catch (MailException ex) {
            log.error("Could not email moderation report {} to userId {}",
                    report.getModerationReportId(), subject.getUserId(), ex);
        }
    }

    private static String fullName(User user) {
        return ((user.getFirstName() == null ? "" : user.getFirstName()) + " "
                + (user.getLastName() == null ? "" : user.getLastName())).trim();
    }

}
