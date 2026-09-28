/*
 NotificationPublisher.java

 The one place that creates Notification rows.

 Until now nothing in the backend ever did: the entity, repository, service and
 controller all existed, and the frontend had a whole notifications page, but the
 only way a row could appear was a manual POST. So the bell never lit up for
 anything that actually happened.

 Every method here is best-effort and swallows its own failures. A notification
 is a courtesy - it must never be the reason a message fails to send or a sale
 fails to complete.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 24 September 2026
*/

package za.ac.cput.service.communication;

import java.math.BigDecimal;
import java.util.Collection;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import za.ac.cput.domain.admin.ModerationReport;
import za.ac.cput.domain.enums.ModerationAction;
import za.ac.cput.domain.enums.NotificationType;
import za.ac.cput.factory.communication.NotificationFactory;
import za.ac.cput.repository.communication.NotificationRepository;

@Service
public class NotificationPublisher {

    private static final Logger log = LoggerFactory.getLogger(NotificationPublisher.class);

    private final NotificationRepository repository;

    public NotificationPublisher(NotificationRepository repository) {
        this.repository = repository;
    }

    /**
     * entityId is the CONVERSATION, not the message: the frontend's
     * notificationRoute maps a MESSAGE notification to /messages/{entityId}, and
     * that route takes a conversation id.
     */
    public void messageReceived(long recipientId, String senderName, String preview, long conversationId) {
        publish(recipientId, NotificationType.MESSAGE,
                "New message from " + senderName, preview, "CONVERSATION", conversationId);
    }

    public void purchaseMade(long sellerId, String listingTitle, BigDecimal amount, long transactionId) {
        publish(sellerId, NotificationType.TRANSACTION,
                "Someone bought " + listingTitle,
                "R" + amount + " is being held until the buyer confirms they received it.",
                "TRANSACTION", transactionId);
    }

    public void fundsReleased(long sellerId, BigDecimal amount, long transactionId) {
        publish(sellerId, NotificationType.TRANSACTION,
                "You have been paid",
                "R" + amount + " has been added to your wallet.",
                "TRANSACTION", transactionId);
    }

    public void purchaseCancelled(long recipientId, BigDecimal amount, long transactionId) {
        publish(recipientId, NotificationType.TRANSACTION,
                "A purchase was cancelled",
                "R" + amount + " has been refunded.",
                "TRANSACTION", transactionId);
    }

    public void reviewReceived(long revieweeId, int rating, long transactionId) {
        publish(revieweeId, NotificationType.TRANSACTION,
                "You received a " + rating + "-star review",
                "Someone you traded with has rated the deal.",
                "TRANSACTION", transactionId);
    }

    public void badgeEarned(long userId) {
        publish(userId, NotificationType.SYSTEM,
                "You are now a Trusted Seller",
                "Five different buyers have rated your sales highly. Your badge now shows on your listings.",
                "USER", userId);
    }

    /*
     Sent to every moderator and admin. entityType REVIEW makes the frontend's
     notificationRoute open the moderation "Flagged reviews" queue.
    */
    public void badReviewFlagged(Collection<Long> moderatorIds, long reviewId, int rating, String revieweeName) {
        for (long moderatorId : moderatorIds) {
            publish(moderatorId, NotificationType.SYSTEM,
                    "Low review flagged: " + rating + " star" + (rating == 1 ? "" : "s"),
                    revieweeName + " received a " + rating + "-star review. Take a look in the moderation queue.",
                    "REVIEW", reviewId);
        }
    }

    /** The moderator's report on a removed listing or post, delivered to its owner. */
    public void contentRemoved(long ownerId, ModerationReport report, String what, String reasonLabel) {
        boolean listing = report.getAction() == ModerationAction.LISTING_REMOVED;
        publish(ownerId, listing ? NotificationType.LISTING : NotificationType.BULLETIN,
                "Your " + what + " was removed",
                "\"" + report.getTargetTitle() + "\" was removed by a moderator.\n\n"
                        + "Reason: " + reasonLabel + "\n\n"
                        + "Moderator's report:\n" + report.getDetails() + "\n\n"
                        + "Reference: MR-" + report.getModerationReportId()
                        + ". A copy has been emailed to you.",
                listing ? "LISTING" : "BULLETIN_POST", report.getTargetId());
    }

    /** A user filed a report: every moderator and admin sees it in their bell. */
    public void userReportFiled(Collection<Long> moderatorIds, long reportId, String what, String reasonLabel) {
        for (long moderatorId : moderatorIds) {
            publish(moderatorId, NotificationType.SYSTEM,
                    "New report: " + what,
                    "A user reported a " + what + " for \"" + reasonLabel + "\". Review it in the moderation queue.",
                    "USER_REPORT", reportId);
        }
    }

    /** Tells the person who reported something what came of it. */
    public void userReportClosed(long reporterId, long reportId, boolean actionTaken) {
        publish(reporterId, NotificationType.SYSTEM,
                actionTaken ? "Thanks - we took action on your report" : "Your report was reviewed",
                actionTaken
                        ? "A moderator reviewed what you reported and took action. Thank you for keeping UniExchange safe."
                        : "A moderator reviewed what you reported and found it within the community guidelines.",
                "USER_REPORT", reportId);
    }

    public void passwordReset(long userId) {
        publish(userId, NotificationType.SYSTEM,
                "Your password was reset",
                "A moderator reset your password and emailed you a temporary one. Change it from your profile.",
                "USER", userId);
    }

    private void publish(long userId, NotificationType type, String title, String content,
                         String entityType, Long entityId) {
        try {
            this.repository.save(NotificationFactory.createNotification(
                    userId, type, title, content, entityType, entityId));
        } catch (RuntimeException e) {
            // Deliberately swallowed. Losing a notification is a far better
            // outcome than rolling back the message or sale that caused it.
            log.warn("Could not publish {} notification for user {}: {}", type, userId, e.getMessage());
        }
    }

}
