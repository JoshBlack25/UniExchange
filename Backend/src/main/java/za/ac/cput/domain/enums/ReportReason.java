/*
 ReportReason.java

 Why something was reported, or why a moderator banned an account or took
 content down. One list for both, so a user's report and the moderator action
 that answers it speak the same language. The frontend offers a relevant subset
 per target (a listing can be a prohibited item; a profile can be a fake account).

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 25 September 2026
*/

package za.ac.cput.domain.enums;

public enum ReportReason {
    SCAM_OR_FRAUD,
    PROHIBITED_ITEM,
    MISLEADING_LISTING,
    HARASSMENT_OR_BULLYING,
    HATE_SPEECH,
    INAPPROPRIATE_CONTENT,
    SPAM,
    FAKE_ACCOUNT,
    IMPERSONATION,
    UNSAFE_MEETUP,
    OTHER
}
