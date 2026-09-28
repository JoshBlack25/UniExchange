/*
 UploadedFileRepository.java

 Spring Data JPA repository for the UploadedFile entity.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 25 September 2026
*/

package za.ac.cput.repository.storage;

import java.time.LocalDateTime;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import za.ac.cput.domain.storage.UploadedFile;

@Repository
public interface UploadedFileRepository extends JpaRepository<UploadedFile, String> {

    /** Backs the per-student upload quota. Same shape as ChatMediaRepository's. */
    @Query("select coalesce(sum(f.sizeBytes), 0) from UploadedFile f " +
           "where f.ownerUserId = :ownerUserId and f.createdAt >= :since")
    long sumSizeBytesUploadedSince(@Param("ownerUserId") long ownerUserId,
                                   @Param("since") LocalDateTime since);

}
