/*
 ReportReasons.java

 Human wording for ReportReason, used in emails and notifications. The
 frontend has its own copy for the dropdowns (src/lib/reportReasons.ts); keep
 the two in step.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 25 September 2026
*/

package za.ac.cput.service.moderation;

import za.ac.cput.domain.enums.ReportReason;

public final class ReportReasons {

    private ReportReasons() {
    }

    public static String label(ReportReason reason) {
        if (reason == null) {
            return "Not specified";
        }
        return switch (reason) {
            case SCAM_OR_FRAUD -> "Scam or fraud";
            case PROHIBITED_ITEM -> "Prohibited or illegal item";
            case MISLEADING_LISTING -> "Misleading or inaccurate listing";
            case HARASSMENT_OR_BULLYING -> "Harassment or bullying";
            case HATE_SPEECH -> "Hate speech";
            case INAPPROPRIATE_CONTENT -> "Inappropriate or explicit content";
            case SPAM -> "Spam";
            case FAKE_ACCOUNT -> "Fake account";
            case IMPERSONATION -> "Impersonation";
            case UNSAFE_MEETUP -> "Unsafe meet-up or off-platform payment";
            case OTHER -> "Other";
        };
    }

}
