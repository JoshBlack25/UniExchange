/*
 VendorApplicationController.java

 REST endpoints for VendorApplication.

 Who may do what (SecurityConfig enforces the moderator-only routes; this class
 enforces the rest):
   - Any signed-in student may apply. The applicant is always the token holder
     and a new application is always PENDING, whatever the body says.
   - A student may read only their own applications (/mine, or /{id} if it is theirs).
   - Listing all, filtering by status, editing, deleting, approving and rejecting
     are moderator work. The reviewer is recorded from the token; a reviewedBy
     parameter is still accepted for older clients but ignored.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 04 September 2026
*/

package za.ac.cput.controller.trust;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
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

import za.ac.cput.domain.enums.VendorApplicationStatus;
import za.ac.cput.domain.trust.VendorApplication;
import za.ac.cput.dto.trust.VendorApplicationRequest;
import za.ac.cput.factory.trust.VendorApplicationFactory;
import za.ac.cput.security.UniExchangeUserDetailsService.AuthenticatedUser;
import za.ac.cput.service.trust.IVendorApplicationService;

@RestController
@RequestMapping("/api/vendor-applications")
public class VendorApplicationController {

    private final IVendorApplicationService service;

    public VendorApplicationController(IVendorApplicationService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<VendorApplication> create(@Valid @RequestBody VendorApplicationRequest request,
                                                    @AuthenticationPrincipal AuthenticatedUser principal) {
        VendorApplication created = this.service.create(VendorApplicationFactory.createVendorApplication(
                me(principal), request.businessName(), request.businessDescription(),
                VendorApplicationStatus.PENDING));
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /** The caller's own applications. */
    @GetMapping("/mine")
    public List<VendorApplication> mine(@AuthenticationPrincipal AuthenticatedUser principal) {
        return this.service.findByApplicantId(me(principal));
    }

    @GetMapping("/{id}")
    public ResponseEntity<VendorApplication> read(@PathVariable Long id,
                                                  @AuthenticationPrincipal AuthenticatedUser principal) {
        VendorApplication found = this.service.read(id);
        if (found == null) {
            return ResponseEntity.notFound().build();
        }
        if (!principal.isModerating() && found.getApplicantId() != me(principal)) {
            // 404, not 403: whether someone else's application exists is none of the caller's business.
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(found);
    }

    @PutMapping("/{id}")
    public ResponseEntity<VendorApplication> update(@PathVariable Long id,
                                                    @Valid @RequestBody VendorApplicationRequest request) {
        VendorApplication existing = this.service.read(id);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }
        // The applicant never changes hands, whatever the body says.
        return ResponseEntity.ok(this.service.update(VendorApplicationFactory.updateVendorApplication(
                existing, existing.getApplicantId(), request.businessName(), request.businessDescription(),
                request.status())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        return this.service.delete(id)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }

    @GetMapping
    public List<VendorApplication> getAll() {
        return this.service.getAll();
    }

    @GetMapping("/status/{status}")
    public List<VendorApplication> byStatus(@PathVariable VendorApplicationStatus status) {
        return this.service.findByStatus(status);
    }

    @PatchMapping("/{id}/approve")
    public ResponseEntity<VendorApplication> approve(@PathVariable Long id,
                                                     @RequestParam(required = false) Long reviewedBy,
                                                     @RequestParam(required = false) String reviewNote,
                                                     @AuthenticationPrincipal AuthenticatedUser principal) {
        VendorApplication updated = this.service.decide(id, VendorApplicationStatus.APPROVED, me(principal), reviewNote);
        return updated == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(updated);
    }

    @PatchMapping("/{id}/reject")
    public ResponseEntity<VendorApplication> reject(@PathVariable Long id,
                                                    @RequestParam(required = false) Long reviewedBy,
                                                    @RequestParam(required = false) String reviewNote,
                                                    @AuthenticationPrincipal AuthenticatedUser principal) {
        VendorApplication updated = this.service.decide(id, VendorApplicationStatus.REJECTED, me(principal), reviewNote);
        return updated == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(updated);
    }

    private static long me(AuthenticatedUser principal) {
        if (principal == null || principal.getUser() == null) {
            throw new AccessDeniedException("You must be signed in");
        }
        return principal.getUser().getUserId();
    }

}
