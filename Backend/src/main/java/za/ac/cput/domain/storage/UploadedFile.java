/*
 UploadedFile.java

 Who uploaded each file in the public uploads directory (see LocalFileStorage).

 Without this the server could not tell whose /uploads/... URL a request names,
 so any student could attach another student's photo to their own listing or
 post - and then, by deleting that listing, delete the other student's file.
 It also backs the per-student daily upload quota.

 Keyed by the stored filename (a server-generated UUID plus extension).

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 25 September 2026
*/

package za.ac.cput.domain.storage;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

@Entity
@Table(name = "uploaded_file",
        indexes = @Index(name = "idx_uploaded_file_owner_created", columnList = "owner_user_id, created_at"))
public class UploadedFile {

    @Id
    @Column(length = 64)
    private String filename;

    @Column(nullable = false, name = "owner_user_id")
    private long ownerUserId;

    @Column(nullable = false, name = "content_type", length = 50)
    private String contentType;

    @Column(nullable = false, name = "size_bytes")
    private long sizeBytes;

    @Column(nullable = false, name = "created_at")
    private LocalDateTime createdAt;

    protected UploadedFile() {
        // Required by JPA
    }

    public UploadedFile(String filename, long ownerUserId, String contentType, long sizeBytes,
                        LocalDateTime createdAt) {
        this.filename = filename;
        this.ownerUserId = ownerUserId;
        this.contentType = contentType;
        this.sizeBytes = sizeBytes;
        this.createdAt = createdAt;
    }

    public String getFilename() {
        return filename;
    }

    public long getOwnerUserId() {
        return ownerUserId;
    }

    public String getContentType() {
        return contentType;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

}
