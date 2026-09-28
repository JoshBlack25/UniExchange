/*
 ListingController.java

 REST endpoints for Listing.

 Responses are ListingResponse (the listing plus its seller's name and student /
 staff affiliation), built in one batch lookup per request.

 A listing a moderator removed (REMOVED) or its owner deleted (DELETED) is hidden
 from everyone but its owner and a moderator session, and its owner can no
 longer edit it back to life.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 04 September 2026
*/

package za.ac.cput.controller.marketplace;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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

import za.ac.cput.domain.enums.ListingStatus;
import za.ac.cput.domain.identity.User;
import za.ac.cput.domain.marketplace.Listing;
import za.ac.cput.dto.marketplace.ListingDtos.ListingResponse;
import za.ac.cput.dto.marketplace.ListingRequest;
import za.ac.cput.exception.ConflictException;
import za.ac.cput.factory.marketplace.ListingFactory;
import za.ac.cput.repository.identity.UserRepository;
import za.ac.cput.security.UniExchangeUserDetailsService.AuthenticatedUser;
import za.ac.cput.service.marketplace.IListingService;
import za.ac.cput.service.marketplace.ListingCoverImages;

@RestController
@RequestMapping("/api/listings")
public class ListingController {

    private final IListingService service;
    private final UserRepository users;
    private final ListingCoverImages covers;

    public ListingController(IListingService service, UserRepository users, ListingCoverImages covers) {
        this.service = service;
        this.users = users;
        this.covers = covers;
    }

    /*
     The seller is always the caller. Taking sellerId from the body let anyone
     list items under another student's name. REMOVED/DELETED cannot be chosen
     at creation either.
    */
    @PostMapping
    public ResponseEntity<ListingResponse> create(@Valid @RequestBody ListingRequest request,
                                                  @AuthenticationPrincipal AuthenticatedUser principal) {
        Listing created = this.service.create(ListingFactory.createListing(
                principal.getUser().getUserId(), request.categoryId(), request.campusId(), request.title(),
                request.description(), request.price(), ownerSettableStatus(request.status(), ListingStatus.ACTIVE)));
        return ResponseEntity.status(HttpStatus.CREATED).body(ListingResponse.of(created, principal.getUser()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ListingResponse> read(@PathVariable Long id,
                                                @AuthenticationPrincipal AuthenticatedUser principal) {
        Listing found = this.service.read(id);
        if (found == null || !visibleTo(found, principal)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(one(found));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ListingResponse> update(@PathVariable Long id, @Valid @RequestBody ListingRequest request,
                                                  @AuthenticationPrincipal AuthenticatedUser principal) {
        Listing existing = this.service.read(id);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }
        if (existing.getSellerId() != principal.getUser().getUserId()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        requireNotRemoved(existing);
        return ResponseEntity.ok(ListingResponse.of(this.service.update(ListingFactory.updateListing(
                existing, existing.getSellerId(), request.categoryId(), request.campusId(), request.title(),
                request.description(), request.price(), ownerSettableStatus(request.status(), existing.getStatus()))),
                principal.getUser()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                       @AuthenticationPrincipal AuthenticatedUser principal) {
        Listing existing = this.service.read(id);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }
        if (existing.getSellerId() != principal.getUser().getUserId()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return this.service.delete(id)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }

    @GetMapping
    public List<ListingResponse> getAll() {
        return many(this.service.getAll().stream().filter(ListingController::isPublic).toList());
    }

    @GetMapping("/search")
    public List<ListingResponse> search(@RequestParam(required = false) Long campusId,
                                        @RequestParam(required = false) Long categoryId,
                                        @RequestParam(required = false) String title) {
        return many(this.service.search(campusId, categoryId, title));
    }

    @GetMapping("/seller/{sellerId}")
    public List<ListingResponse> bySeller(@PathVariable long sellerId,
                                          @AuthenticationPrincipal AuthenticatedUser principal) {
        return many(this.service.findBySellerId(sellerId).stream()
                .filter(listing -> visibleTo(listing, principal))
                .toList());
    }

    @PatchMapping("/{id}/sold")
    public ResponseEntity<ListingResponse> markSold(@PathVariable Long id,
                                                    @AuthenticationPrincipal AuthenticatedUser principal) {
        Listing existing = this.service.read(id);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }
        if (existing.getSellerId() != principal.getUser().getUserId()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        requireNotRemoved(existing);
        Listing updated = this.service.markAsSold(id);
        return updated == null ? ResponseEntity.notFound().build()
                : ResponseEntity.ok(ListingResponse.of(updated, principal.getUser()));
    }

    private static boolean isPublic(Listing listing) {
        return listing.getStatus() != ListingStatus.REMOVED && listing.getStatus() != ListingStatus.DELETED;
    }

    private static boolean visibleTo(Listing listing, AuthenticatedUser principal) {
        if (isPublic(listing)) {
            return true;
        }
        return principal != null
                && (principal.isModerating() || principal.getUser().getUserId() == listing.getSellerId());
    }

    private static void requireNotRemoved(Listing listing) {
        if (listing.getStatus() == ListingStatus.REMOVED) {
            throw new ConflictException("LISTING_REMOVED",
                    "This listing was removed by a moderator and can no longer be changed.");
        }
    }

    /* Owners choose ACTIVE or SOLD; REMOVED is a moderator decision and DELETED is the delete button. */
    private static ListingStatus ownerSettableStatus(ListingStatus requested, ListingStatus fallback) {
        return requested == ListingStatus.ACTIVE || requested == ListingStatus.SOLD ? requested : fallback;
    }

    private ListingResponse one(Listing listing) {
        return ListingResponse.of(listing, this.users.findById(listing.getSellerId()).orElse(null),
                this.covers.forListing(listing.getListingId()));
    }

    private List<ListingResponse> many(List<Listing> listings) {
        Map<Long, User> sellers = this.users.findAllById(
                        listings.stream().map(Listing::getSellerId).distinct().toList()).stream()
                .collect(Collectors.toMap(User::getUserId, Function.identity()));
        Map<Long, String> coverUrls = this.covers.forListings(listings.stream().map(Listing::getListingId).toList());
        return listings.stream()
                .map(listing -> ListingResponse.of(listing, sellers.get(listing.getSellerId()),
                        coverUrls.get(listing.getListingId())))
                .toList();
    }

}
