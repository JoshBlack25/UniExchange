/*
 IListingImageService.java

 Service contract for ListingImage.

 Author: <Your Full Name> (<Student Number>)
 Date: 04 September 2026
*/

package za.ac.cput.service.marketplace;

import java.util.List;

import za.ac.cput.domain.marketplace.ListingImage;
import za.ac.cput.service.IService;

public interface IListingImageService extends IService<ListingImage, Long> {

    List<ListingImage> findByListingId(long listingId);

    ListingImage findPrimaryForListing(long listingId);

}
