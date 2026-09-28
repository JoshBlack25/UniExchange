/*
 ListingDtos.java

 What the listing endpoints send back: the Listing itself plus just enough about
 the seller for a card to say who is selling - their name, and whether they are
 a student or CPUT staff ("Sold by CPUT staff member").

 Sellers are looked up in one batch per response (see ListingController), so a
 feed of 50 listings costs one extra query, not 50.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 24 September 2026
*/

package za.ac.cput.dto.marketplace;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import za.ac.cput.domain.enums.ListingStatus;
import za.ac.cput.domain.identity.User;
import za.ac.cput.domain.marketplace.Listing;

public final class ListingDtos {

    private ListingDtos() {}

    public record ListingResponse(
            long listingId,
            long sellerId,
            long categoryId,
            long campusId,
            String title,
            String description,
            BigDecimal price,
            ListingStatus status,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            LocalDateTime deletedAt,
            String sellerName,
            // STUDENT or STAFF; null when the seller could not be found.
            String sellerAffiliation,
            // The photo a card shows: the primary image, else the first by
            // position. Null when the listing has no photos.
            String coverImageUrl) {

        public static ListingResponse of(Listing listing, User seller) {
            return of(listing, seller, null);
        }

        public static ListingResponse of(Listing listing, User seller, String coverImageUrl) {
            return new ListingResponse(
                    listing.getListingId(),
                    listing.getSellerId(),
                    listing.getCategoryId(),
                    listing.getCampusId(),
                    listing.getTitle(),
                    listing.getDescription(),
                    listing.getPrice(),
                    listing.getStatus(),
                    listing.getCreatedAt(),
                    listing.getUpdatedAt(),
                    listing.getDeletedAt(),
                    seller == null ? null : (seller.getFirstName() + " " + seller.getLastName()).trim(),
                    seller == null ? null : seller.getAffiliation(),
                    coverImageUrl);
        }
    }

}
