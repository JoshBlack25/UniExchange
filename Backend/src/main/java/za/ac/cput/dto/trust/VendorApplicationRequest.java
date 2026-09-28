/*
 VendorApplicationRequest.java

 Inbound payload for creating/updating a VendorApplication. Entities have no public
 setters, so requests arrive as a record and are handed to VendorApplicationFactory.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 04 September 2026
*/

package za.ac.cput.dto.trust;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import za.ac.cput.domain.enums.VendorApplicationStatus;

/*
 applicantId and status are still accepted so existing clients keep working, but
 on create both are ignored: the applicant is the token holder and a new
 application is always PENDING. See VendorApplicationController.
*/
public record VendorApplicationRequest(
        long applicantId,
        @NotBlank @Size(max = 150) String businessName,
        @Size(max = 2000) String businessDescription,
        VendorApplicationStatus status) {
}
