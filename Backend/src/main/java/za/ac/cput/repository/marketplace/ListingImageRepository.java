/*
 ListingImageRepository.java

 Spring Data JPA repository for the ListingImage entity.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 04 September 2026
*/

package za.ac.cput.repository.marketplace;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import za.ac.cput.domain.marketplace.ListingImage;

@Repository
public interface ListingImageRepository extends JpaRepository<ListingImage, Long> {

    List<ListingImage> findByListingIdOrderByPositionAsc(long listingId);

    List<ListingImage> findByListingIdAndIsPrimaryTrue(long listingId);

    java.util.Optional<ListingImage> findByImageUrl(String imageUrl);

    /*
     Cover candidates for a page of listings, as [listingId, imageUrl, isPrimary,
     position]. A projection on purpose: the entity carries the image bytes, and
     loading those for every card in a feed would pull megabytes per request.
    */
    @Query("select i.listingId, i.imageUrl, i.isPrimary, i.position from ListingImage i "
            + "where i.listingId in :listingIds")
    List<Object[]> coverCandidates(@Param("listingIds") Collection<Long> listingIds);

}
