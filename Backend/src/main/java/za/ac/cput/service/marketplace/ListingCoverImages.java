/*
 ListingCoverImages.java

 Picks the photo a listing card shows - the primary image, else the first by
 position - for a whole page of listings in one query. Without this every card
 on the feed would need its own /api/listing-images request.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 25 September 2026
*/

package za.ac.cput.service.marketplace;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import za.ac.cput.repository.marketplace.ListingImageRepository;

@Service
public class ListingCoverImages {

    private final ListingImageRepository images;

    public ListingCoverImages(ListingImageRepository images) {
        this.images = images;
    }

    /** listingId -> cover image URL, for the listings that have any photo. */
    public Map<Long, String> forListings(Collection<Long> listingIds) {
        Map<Long, String> covers = new HashMap<>();
        if (listingIds == null || listingIds.isEmpty()) {
            return covers;
        }
        Map<Long, Integer> rank = new HashMap<>();
        for (Object[] row : this.images.coverCandidates(listingIds.stream().distinct().toList())) {
            long listingId = ((Number) row[0]).longValue();
            String url = (String) row[1];
            // Primary beats everything; otherwise the lowest position wins.
            int score = Boolean.TRUE.equals(row[2]) ? Integer.MIN_VALUE : ((Number) row[3]).intValue();
            Integer best = rank.get(listingId);
            if (url != null && (best == null || score < best)) {
                rank.put(listingId, score);
                covers.put(listingId, url);
            }
        }
        return covers;
    }

    public String forListing(long listingId) {
        return forListings(List.of(listingId)).get(listingId);
    }

}
