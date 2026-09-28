/*
 ProfilePhoto.java

 A user's profile picture, one row per user (keyed by userId). Kept apart from
 User so the bytes are only read when the picture itself is requested.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 25 September 2026
*/

package za.ac.cput.domain.identity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;

@Entity
@Table(name = "profile_photo")
public class ProfilePhoto {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Lob
    @Column(nullable = false, name = "image_data", columnDefinition = "LONGBLOB")
    private byte[] imageData;

    @Column(nullable = false, name = "content_type", length = 50)
    private String contentType;

    @Column(nullable = false, name = "updated_at")
    private LocalDateTime updatedAt;

    protected ProfilePhoto() {
        // Required by JPA
    }

    public ProfilePhoto(long userId, byte[] imageData, String contentType, LocalDateTime updatedAt) {
        this.userId = userId;
        this.imageData = imageData;
        this.contentType = contentType;
        this.updatedAt = updatedAt;
    }

    public Long getUserId() {
        return userId;
    }

    public byte[] getImageData() {
        return imageData;
    }

    public String getContentType() {
        return contentType;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

}
