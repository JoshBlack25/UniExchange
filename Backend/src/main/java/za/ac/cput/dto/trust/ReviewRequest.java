/*
 ReviewRequest.java

 Inbound payload for creating/updating a Review. Entities have no public
 setters, so requests arrive as a record and are handed to ReviewFactory.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 04 September 2026
*/

package za.ac.cput.dto.trust;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record ReviewRequest(
        long transactionId,
        long reviewerId,
        long revieweeId,
        @Min(value = 1, message = "Choose a rating from 1 to 5")
        @Max(value = 5, message = "Choose a rating from 1 to 5")
        int rating,
        @Size(max = 2000, message = "Keep the review under 2000 characters") String comment) {
}
