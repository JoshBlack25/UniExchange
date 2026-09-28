/*
 BulletinPostRequest.java

 Inbound payload for creating/updating a BulletinPost. Entities have no public
 setters, so requests arrive as a record and are handed to BulletinPostFactory.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 04 September 2026
*/

package za.ac.cput.dto.community;

import jakarta.validation.constraints.Size;

import za.ac.cput.domain.enums.BulletinPostCategory;
import za.ac.cput.domain.enums.BulletinPostStatus;

public record BulletinPostRequest(
        long authorId,
        @Size(max = 150, message = "Keep the title under 150 characters") String title,
        @Size(max = 5000, message = "Keep the post under 5000 characters") String content,
        BulletinPostStatus status,
        boolean isFacultyAnnouncement,
        BulletinPostCategory category) {
}
