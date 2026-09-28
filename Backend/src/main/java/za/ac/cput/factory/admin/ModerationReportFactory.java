/*
 ModerationReportFactory.java

 Builds a ModerationReport, refusing one without a reason category or without
 a written explanation long enough to be useful.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 25 September 2026
*/

package za.ac.cput.factory.admin;

import java.time.LocalDateTime;

import za.ac.cput.domain.admin.ModerationReport;
import za.ac.cput.domain.enums.ModerationAction;
import za.ac.cput.domain.enums.ReportReason;
import za.ac.cput.util.Helper;

public final class ModerationReportFactory {

    public static final int MIN_DETAILS = 20;
    public static final int MAX_DETAILS = 2000;

    private ModerationReportFactory() {
    }

    public static ModerationReport create(ModerationAction action, ReportReason reason, String details,
                                          long subjectUserId, String subjectName, String subjectEmail,
                                          String targetType, long targetId, String targetTitle,
                                          long moderatorId, String moderatorName, Long userReportId,
                                          boolean sentToUser) {
        if (!Helper.isValidObject(action)) {
            throw new IllegalArgumentException("Report: action is required");
        }
        requireValid(reason, details);
        if (!Helper.isValidId(subjectUserId) || !Helper.isValidId(moderatorId)) {
            throw new IllegalArgumentException("Report: subject and moderator are required");
        }

        return new ModerationReport.Builder()
                .setAction(action)
                .setReason(reason)
                .setDetails(details.trim())
                .setSubjectUserId(subjectUserId)
                .setSubjectName(valueOr(subjectName, "Unknown user"))
                .setSubjectEmail(valueOr(subjectEmail, "unknown"))
                .setTargetType(targetType)
                .setTargetId(targetId)
                .setTargetTitle(targetTitle)
                .setModeratorId(moderatorId)
                .setModeratorName(valueOr(moderatorName, "Moderator"))
                .setUserReportId(userReportId)
                .setSentToUser(sentToUser)
                .setCreatedAt(LocalDateTime.now())
                .build();
    }

    public static ModerationReport markEmailed(ModerationReport existing) {
        return new ModerationReport.Builder().copy(existing).setEmailedAt(LocalDateTime.now()).build();
    }

    /** The same checks the create path applies - run before anything is changed. */
    public static void requireValid(ReportReason reason, String details) {
        if (!Helper.isValidObject(reason)) {
            throw new IllegalArgumentException("Choose a reason for this action.");
        }
        String text = details == null ? "" : details.trim();
        if (text.length() < MIN_DETAILS) {
            throw new IllegalArgumentException(
                    "Write a report of at least %d characters explaining this action.".formatted(MIN_DETAILS));
        }
        if (text.length() > MAX_DETAILS) {
            throw new IllegalArgumentException(
                    "Keep the report under %d characters.".formatted(MAX_DETAILS));
        }
    }

    private static String valueOr(String value, String fallback) {
        return Helper.isNullOrEmpty(value) ? fallback : value;
    }

}
