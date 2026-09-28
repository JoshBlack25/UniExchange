/*
 ListingRequest.java

 Inbound payload for creating/updating a Listing. Entities have no public
 setters, so requests arrive as a record and are handed to ListingFactory.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 04 September 2026
*/

package za.ac.cput.dto.marketplace;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

import za.ac.cput.domain.enums.ListingStatus;

public record ListingRequest(
        long sellerId,
        long categoryId,
        long campusId,
        @Size(max = 150, message = "Keep the title under 150 characters") String title,
        @Size(max = 5000, message = "Keep the description under 5000 characters") String description,
        @NotNull(message = "Enter a price")
        @PositiveOrZero(message = "The price cannot be negative")
        @DecimalMax(value = "1000000.00", message = "The price can be at most R1 000 000")
        @Digits(integer = 8, fraction = 2, message = "Use at most 2 decimal places for the price")
        BigDecimal price,
        ListingStatus status) {
}
