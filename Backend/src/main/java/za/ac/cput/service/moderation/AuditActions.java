/*
 AuditActions.java

 The audit-log action names that more than one class depends on. ModerationService
 writes them; ModerationAnalyticsService counts them for the dashboard charts, so
 a renamed action must change in one place or the charts silently go flat.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 25 September 2026
*/

package za.ac.cput.service.moderation;

import java.util.List;

public final class AuditActions {

    public static final String USER_SUSPENDED = "USER_SUSPENDED";
    public static final String LISTING_REMOVED = "LISTING_REMOVED";
    public static final String POST_REMOVED = "POST_REMOVED";
    public static final String ANNOUNCEMENT_REMOVED = "ANNOUNCEMENT_REMOVED";
    public static final String REVIEW_REMOVED = "REVIEW_REMOVED";

    public static final List<String> REMOVALS =
            List.of(LISTING_REMOVED, POST_REMOVED, ANNOUNCEMENT_REMOVED, REVIEW_REMOVED);

    private AuditActions() {
    }

}
