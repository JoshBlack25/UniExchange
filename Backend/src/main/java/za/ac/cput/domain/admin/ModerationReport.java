/*
 ModerationReport.java

 The written report a moderator must file when they suspend or delete an
 account, or take down a listing or bulletin post. It is kept permanently -
 unlike the one-line audit entry, it holds the full reasoning.

 Names, emails and titles are SNAPSHOTS taken when the report was written.
 Deleting an account anonymises the user row, and a removed listing can later be
 edited, so the report must not depend on either still saying what it said.

 sentToUser records whether the affected user was told (content removals are
 always sent; suspensions and deletions are kept on file only).

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 25 September 2026
*/

package za.ac.cput.domain.admin;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import za.ac.cput.domain.enums.ModerationAction;
import za.ac.cput.domain.enums.ReportReason;

@Entity
@Table(name = "moderation_report")
public class ModerationReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long moderationReportId;

    // varchar rather than a MySQL ENUM so new values never need a migration.
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30, columnDefinition = "varchar(30)")
    private ModerationAction action;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40, columnDefinition = "varchar(40)")
    private ReportReason reason;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String details;

    @Column(nullable = false, name = "subject_user_id")
    private long subjectUserId;

    @Column(nullable = false, length = 200, name = "subject_name")
    private String subjectName;

    @Column(nullable = false, length = 200, name = "subject_email")
    private String subjectEmail;

    @Column(nullable = false, length = 30, name = "target_type")
    private String targetType;

    @Column(nullable = false, name = "target_id")
    private long targetId;

    @Column(length = 200, name = "target_title")
    private String targetTitle;

    @Column(nullable = false, name = "moderator_id")
    private long moderatorId;

    @Column(nullable = false, length = 200, name = "moderator_name")
    private String moderatorName;

    // The user report this action answered, if it came from the queue.
    @Column(name = "user_report_id")
    private Long userReportId;

    @Column(nullable = false, name = "sent_to_user")
    private boolean sentToUser;

    @Column(name = "emailed_at")
    private LocalDateTime emailedAt;

    @Column(nullable = false, name = "created_at")
    private LocalDateTime createdAt;

    protected ModerationReport() {
        // Required by JPA
    }

    private ModerationReport(Builder builder) {
        this.moderationReportId = builder.moderationReportId;
        this.action = builder.action;
        this.reason = builder.reason;
        this.details = builder.details;
        this.subjectUserId = builder.subjectUserId;
        this.subjectName = builder.subjectName;
        this.subjectEmail = builder.subjectEmail;
        this.targetType = builder.targetType;
        this.targetId = builder.targetId;
        this.targetTitle = builder.targetTitle;
        this.moderatorId = builder.moderatorId;
        this.moderatorName = builder.moderatorName;
        this.userReportId = builder.userReportId;
        this.sentToUser = builder.sentToUser;
        this.emailedAt = builder.emailedAt;
        this.createdAt = builder.createdAt;
    }

    public Long getModerationReportId() {
        return moderationReportId;
    }

    public ModerationAction getAction() {
        return action;
    }

    public ReportReason getReason() {
        return reason;
    }

    public String getDetails() {
        return details;
    }

    public long getSubjectUserId() {
        return subjectUserId;
    }

    public String getSubjectName() {
        return subjectName;
    }

    public String getSubjectEmail() {
        return subjectEmail;
    }

    public String getTargetType() {
        return targetType;
    }

    public long getTargetId() {
        return targetId;
    }

    public String getTargetTitle() {
        return targetTitle;
    }

    public long getModeratorId() {
        return moderatorId;
    }

    public String getModeratorName() {
        return moderatorName;
    }

    public Long getUserReportId() {
        return userReportId;
    }

    public boolean isSentToUser() {
        return sentToUser;
    }

    public LocalDateTime getEmailedAt() {
        return emailedAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public static class Builder {

        private Long moderationReportId;
        private ModerationAction action;
        private ReportReason reason;
        private String details;
        private long subjectUserId;
        private String subjectName;
        private String subjectEmail;
        private String targetType;
        private long targetId;
        private String targetTitle;
        private long moderatorId;
        private String moderatorName;
        private Long userReportId;
        private boolean sentToUser;
        private LocalDateTime emailedAt;
        private LocalDateTime createdAt;

        public Builder setAction(ModerationAction action) {
            this.action = action;
            return this;
        }

        public Builder setReason(ReportReason reason) {
            this.reason = reason;
            return this;
        }

        public Builder setDetails(String details) {
            this.details = details;
            return this;
        }

        public Builder setSubjectUserId(long subjectUserId) {
            this.subjectUserId = subjectUserId;
            return this;
        }

        public Builder setSubjectName(String subjectName) {
            this.subjectName = subjectName;
            return this;
        }

        public Builder setSubjectEmail(String subjectEmail) {
            this.subjectEmail = subjectEmail;
            return this;
        }

        public Builder setTargetType(String targetType) {
            this.targetType = targetType;
            return this;
        }

        public Builder setTargetId(long targetId) {
            this.targetId = targetId;
            return this;
        }

        public Builder setTargetTitle(String targetTitle) {
            this.targetTitle = targetTitle;
            return this;
        }

        public Builder setModeratorId(long moderatorId) {
            this.moderatorId = moderatorId;
            return this;
        }

        public Builder setModeratorName(String moderatorName) {
            this.moderatorName = moderatorName;
            return this;
        }

        public Builder setUserReportId(Long userReportId) {
            this.userReportId = userReportId;
            return this;
        }

        public Builder setSentToUser(boolean sentToUser) {
            this.sentToUser = sentToUser;
            return this;
        }

        public Builder setEmailedAt(LocalDateTime emailedAt) {
            this.emailedAt = emailedAt;
            return this;
        }

        public Builder setCreatedAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public Builder copy(ModerationReport report) {
            this.moderationReportId = report.moderationReportId;
            this.action = report.action;
            this.reason = report.reason;
            this.details = report.details;
            this.subjectUserId = report.subjectUserId;
            this.subjectName = report.subjectName;
            this.subjectEmail = report.subjectEmail;
            this.targetType = report.targetType;
            this.targetId = report.targetId;
            this.targetTitle = report.targetTitle;
            this.moderatorId = report.moderatorId;
            this.moderatorName = report.moderatorName;
            this.userReportId = report.userReportId;
            this.sentToUser = report.sentToUser;
            this.emailedAt = report.emailedAt;
            this.createdAt = report.createdAt;
            return this;
        }

        public ModerationReport build() {
            return new ModerationReport(this);
        }
    }

}
