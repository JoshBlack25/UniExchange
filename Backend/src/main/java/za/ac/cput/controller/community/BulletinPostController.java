/*
 BulletinPostController.java

 REST endpoints for BulletinPost.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 04 September 2026
*/

package za.ac.cput.controller.community;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import za.ac.cput.domain.community.BulletinPost;
import za.ac.cput.domain.enums.BulletinPostCategory;
import za.ac.cput.domain.enums.BulletinPostStatus;
import za.ac.cput.dto.community.BulletinPostRequest;
import za.ac.cput.exception.ConflictException;
import za.ac.cput.factory.community.BulletinPostFactory;
import za.ac.cput.security.UniExchangeUserDetailsService.AuthenticatedUser;
import za.ac.cput.service.community.IBulletinPostService;

@RestController
@RequestMapping("/api/bulletin-posts")
public class BulletinPostController {

    private final IBulletinPostService service;

    public BulletinPostController(IBulletinPostService service) {
        this.service = service;
    }

    /*
     The author is always the caller, and isFacultyAnnouncement is always false
     here: campus announcements are published by moderators through
     /api/moderation/announcements. Both used to come straight from the body, so
     anyone could post as anyone, or post an "official" announcement.
    */
    @PostMapping
    public ResponseEntity<BulletinPost> create(@Valid @RequestBody BulletinPostRequest request,
                                               @AuthenticationPrincipal AuthenticatedUser principal) {
        BulletinPost created = this.service.create(BulletinPostFactory.createBulletinPost(
                principal.getUser().getUserId(), request.title(), request.content(),
                authorSettableStatus(request.status(), BulletinPostStatus.PUBLISHED),
                false, request.category()));
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/{id}")
    public ResponseEntity<BulletinPost> read(@PathVariable Long id,
                                             @AuthenticationPrincipal AuthenticatedUser principal) {
        BulletinPost found = this.service.read(id);
        if (found == null || !visibleTo(found, principal)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(found);
    }

    @PutMapping("/{id}")
    public ResponseEntity<BulletinPost> update(@PathVariable Long id,
                                               @Valid @RequestBody BulletinPostRequest request,
                                               @AuthenticationPrincipal AuthenticatedUser principal) {
        BulletinPost existing = this.service.read(id);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }
        if (existing.getAuthorId() != principal.getUser().getUserId()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (existing.getStatus() == BulletinPostStatus.REMOVED) {
            throw new ConflictException("POST_REMOVED",
                    "This post was removed by a moderator and can no longer be changed.");
        }
        // Author, status ceiling and the announcement flag are not the author's to change.
        return ResponseEntity.ok(this.service.update(BulletinPostFactory.updateBulletinPost(
                existing, existing.getAuthorId(), request.title(), request.content(),
                authorSettableStatus(request.status(), existing.getStatus()),
                existing.isFacultyAnnouncement(), request.category())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                       @AuthenticationPrincipal AuthenticatedUser principal) {
        BulletinPost existing = this.service.read(id);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }
        if (existing.getAuthorId() != principal.getUser().getUserId()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return this.service.delete(id)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }

    @GetMapping
    public List<BulletinPost> getAll() {
        return published(this.service.getAll());
    }

    @GetMapping("/author/{authorId}")
    public List<BulletinPost> byAuthor(@PathVariable long authorId,
                                       @AuthenticationPrincipal AuthenticatedUser principal) {
        return this.service.findByAuthorId(authorId).stream()
                .filter(post -> visibleTo(post, principal))
                .toList();
    }

    @GetMapping("/announcements")
    public List<BulletinPost> announcements() {
        return published(this.service.findAnnouncements());
    }

    @GetMapping("/category/{category}")
    public List<BulletinPost> byCategory(@PathVariable BulletinPostCategory category) {
        return published(this.service.findByCategory(category));
    }

    private static List<BulletinPost> published(List<BulletinPost> posts) {
        return posts.stream().filter(post -> post.getStatus() == BulletinPostStatus.PUBLISHED).toList();
    }

    /* PUBLISHED is public; the author also sees their HIDDEN posts; a moderator session sees everything. */
    private static boolean visibleTo(BulletinPost post, AuthenticatedUser principal) {
        if (post.getStatus() == BulletinPostStatus.PUBLISHED) {
            return true;
        }
        if (principal == null) {
            return false;
        }
        return principal.isModerating()
                || (post.getStatus() != BulletinPostStatus.REMOVED
                        && principal.getUser().getUserId() == post.getAuthorId());
    }

    /* REMOVED is a moderator decision, never the author's. */
    private static BulletinPostStatus authorSettableStatus(BulletinPostStatus requested, BulletinPostStatus fallback) {
        return requested == BulletinPostStatus.PUBLISHED || requested == BulletinPostStatus.HIDDEN
                ? requested
                : fallback;
    }

}
