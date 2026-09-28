/*
 ModerationController.java

 /api/moderation - the moderator dashboard's API.

 SecurityConfig requires ROLE_MODERATOR for this whole prefix, and
 JwtAuthenticationFilter only grants that inside a session opened through the
 moderator or admin sign-in. Everything else - the hierarchy rules, soft deletes
 and the audit trail - is in ModerationService.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 24 September 2026
*/

package za.ac.cput.controller.moderation;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import za.ac.cput.domain.community.BulletinPost;
import za.ac.cput.domain.enums.AccountStatus;
import za.ac.cput.domain.enums.BulletinPostStatus;
import za.ac.cput.domain.enums.ListingStatus;
import za.ac.cput.dto.marketplace.ListingDtos.ListingResponse;
import za.ac.cput.dto.moderation.AnalyticsDtos.Analytics;
import za.ac.cput.dto.moderation.AnalyticsDtos.Range;
import za.ac.cput.domain.admin.ModerationReport;
import za.ac.cput.domain.enums.ModerationAction;
import za.ac.cput.domain.enums.ReportStatus;
import za.ac.cput.dto.moderation.ModerationDtos.ActionReportRequest;
import za.ac.cput.dto.moderation.ModerationDtos.AnnouncementRequest;
import za.ac.cput.dto.moderation.ModerationDtos.AuditEntry;
import za.ac.cput.dto.moderation.ModerationDtos.FlaggedReview;
import za.ac.cput.dto.moderation.ModerationDtos.ModeratedPost;
import za.ac.cput.dto.moderation.ModerationDtos.ModeratedUser;
import za.ac.cput.dto.moderation.ModerationDtos.Overview;
import za.ac.cput.dto.moderation.ModerationDtos.PageResponse;
import za.ac.cput.dto.moderation.ModerationDtos.ReasonRequest;
import za.ac.cput.dto.moderation.ModerationDtos.UpdateUserRequest;
import za.ac.cput.dto.moderation.ModerationDtos.UserReportView;
import za.ac.cput.security.UniExchangeUserDetailsService.AuthenticatedUser;
import za.ac.cput.service.moderation.ModerationAnalyticsService;
import za.ac.cput.service.moderation.ModerationReportService;
import za.ac.cput.service.moderation.ModerationService;

// A second layer behind SecurityConfig's URL rule, so a routing change cannot expose this class.
@PreAuthorize("hasRole('MODERATOR')")
@RestController
@RequestMapping("/api/moderation")
public class ModerationController {

    private final ModerationService service;
    private final ModerationAnalyticsService analytics;
    private final ModerationReportService actionReports;

    public ModerationController(ModerationService service, ModerationAnalyticsService analytics,
                                ModerationReportService actionReports) {
        this.service = service;
        this.analytics = analytics;
        this.actionReports = actionReports;
    }

    @GetMapping("/overview")
    public Overview overview() {
        return this.service.overview();
    }

    /** Dashboard chart data. Money series are only included in an admin session. */
    @GetMapping("/analytics")
    public Analytics analytics(@RequestParam(defaultValue = "1w") String range,
                               @AuthenticationPrincipal AuthenticatedUser principal) {
        return this.analytics.analytics(Range.fromCode(range), principal.isAdministering());
    }

    // ---- users

    @GetMapping("/users")
    public PageResponse<ModeratedUser> users(@RequestParam(required = false) String q,
                                             @RequestParam(required = false) AccountStatus status,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "25") int size) {
        return this.service.listUsers(q, status, page, size);
    }

    @GetMapping("/users/{id}")
    public ModeratedUser user(@PathVariable long id) {
        return this.service.getUser(id);
    }

    @PatchMapping("/users/{id}")
    public ModeratedUser updateUser(@PathVariable long id, @RequestBody UpdateUserRequest request,
                                    @AuthenticationPrincipal AuthenticatedUser principal) {
        return this.service.updateUser(principal, id, request);
    }

    @PostMapping("/users/{id}/suspend")
    public ModeratedUser suspend(@PathVariable long id, @RequestBody(required = false) ActionReportRequest report,
                                 @AuthenticationPrincipal AuthenticatedUser principal) {
        return this.service.suspend(principal, id, report);
    }

    @PostMapping("/users/{id}/reinstate")
    public ModeratedUser reinstate(@PathVariable long id, @AuthenticationPrincipal AuthenticatedUser principal) {
        return this.service.reinstate(principal, id);
    }

    @PostMapping("/users/{id}/reset-password")
    public ResponseEntity<Void> resetPassword(@PathVariable long id,
                                              @AuthenticationPrincipal AuthenticatedUser principal) {
        this.service.resetPassword(principal, id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable long id,
                                           @RequestBody(required = false) ActionReportRequest report,
                                           @AuthenticationPrincipal AuthenticatedUser principal) {
        this.service.deleteUser(principal, id, report);
        return ResponseEntity.noContent().build();
    }

    // ---- listings

    @GetMapping("/listings")
    public List<ListingResponse> listings(@RequestParam(required = false) ListingStatus status,
                                          @RequestParam(required = false) String q) {
        return this.service.listListings(status, q);
    }

    @PostMapping("/listings/{id}/remove")
    public ListingResponse removeListing(@PathVariable long id, @RequestBody(required = false) ActionReportRequest report,
                                         @AuthenticationPrincipal AuthenticatedUser principal) {
        return this.service.removeListing(principal, id, report);
    }

    @PostMapping("/listings/{id}/restore")
    public ListingResponse restoreListing(@PathVariable long id,
                                          @AuthenticationPrincipal AuthenticatedUser principal) {
        return this.service.restoreListing(principal, id);
    }

    // ---- bulletin posts

    @GetMapping("/posts")
    public List<ModeratedPost> posts(@RequestParam(required = false) BulletinPostStatus status,
                                     @RequestParam(required = false) Boolean announcements) {
        return this.service.listPosts(status, announcements);
    }

    @PostMapping("/posts/{id}/remove")
    public BulletinPost removePost(@PathVariable long id, @RequestBody(required = false) ActionReportRequest report,
                                   @AuthenticationPrincipal AuthenticatedUser principal) {
        return this.service.removePost(principal, id, report);
    }

    @PostMapping("/posts/{id}/restore")
    public BulletinPost restorePost(@PathVariable long id, @AuthenticationPrincipal AuthenticatedUser principal) {
        return this.service.restorePost(principal, id);
    }

    // ---- campus announcements

    /** Every announcement except removed ones, including hidden drafts. */
    @GetMapping("/announcements")
    public List<ModeratedPost> announcements() {
        return this.service.listPosts(null, true).stream()
                .filter(item -> item.post().getStatus() != BulletinPostStatus.REMOVED)
                .toList();
    }

    @PostMapping("/announcements")
    public ResponseEntity<BulletinPost> createAnnouncement(@RequestBody AnnouncementRequest request,
                                                           @AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(this.service.createAnnouncement(principal, request));
    }

    @PutMapping("/announcements/{id}")
    public BulletinPost updateAnnouncement(@PathVariable long id, @RequestBody AnnouncementRequest request,
                                           @AuthenticationPrincipal AuthenticatedUser principal) {
        return this.service.updateAnnouncement(principal, id, request);
    }

    @DeleteMapping("/announcements/{id}")
    public ResponseEntity<Void> deleteAnnouncement(@PathVariable long id,
                                                   @AuthenticationPrincipal AuthenticatedUser principal) {
        this.service.removeAnnouncement(principal, id);
        return ResponseEntity.noContent().build();
    }

    // ---- flagged reviews

    @GetMapping("/reviews/flagged")
    public List<FlaggedReview> flaggedReviews() {
        return this.service.flaggedReviews();
    }

    @PostMapping("/reviews/{id}/dismiss")
    public ResponseEntity<Void> dismissReview(@PathVariable long id, @RequestBody(required = false) ReasonRequest request,
                                              @AuthenticationPrincipal AuthenticatedUser principal) {
        this.service.dismissReview(principal, id, reason(request));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/reviews/{id}")
    public ResponseEntity<Void> removeReview(@PathVariable long id, @RequestParam(required = false) String reason,
                                             @AuthenticationPrincipal AuthenticatedUser principal) {
        this.service.removeReview(principal, id, reason);
        return ResponseEntity.noContent().build();
    }

    // ---- reports: what users filed, and what moderators wrote

    @GetMapping("/user-reports")
    public List<UserReportView> userReports(@RequestParam(required = false) ReportStatus status) {
        return this.service.userReports(status);
    }

    @PostMapping("/user-reports/{id}/dismiss")
    public UserReportView dismissUserReport(@PathVariable long id, @RequestBody(required = false) ReasonRequest request,
                                            @AuthenticationPrincipal AuthenticatedUser principal) {
        return this.service.dismissUserReport(principal, id, reason(request));
    }

    @GetMapping("/action-reports")
    public List<ModerationReport> actionReports(@RequestParam(required = false) ModerationAction action,
                                                @RequestParam(required = false) Long userId) {
        return this.actionReports.list(action, userId);
    }

    @GetMapping("/action-reports/{id}")
    public ModerationReport actionReport(@PathVariable long id) {
        return this.actionReports.read(id);
    }

    // ---- activity

    @GetMapping("/audit-log")
    public PageResponse<AuditEntry> auditLog(@RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "25") int size) {
        return this.service.auditLog(page, size);
    }

    private static String reason(ReasonRequest request) {
        return request == null ? null : request.reason();
    }

}
