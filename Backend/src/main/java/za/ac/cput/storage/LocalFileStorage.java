/*
 LocalFileStorage.java

 Owns the uploads directory (app.uploads.dir): saves a file UploadController
 receives, and removes one a listing/bulletin post's image pointed at once
 that image row is gone - so deleting a post or listing doesn't leave its
 photos behind as dead weight on disk.

 Every saved file is recorded in UploadedFile with its uploader. That record is
 what lets the image endpoints accept an /uploads/... URL only from the student
 who uploaded it, and what lets deleteIfManaged refuse to remove somebody else's
 file. It also backs the per-student daily quota.

 The declared Content-Type is not trusted: the first bytes must be a real JPEG,
 PNG, WebP or GIF (ImageTypeDetector), and the stored extension - which is what
 WebConfig's resource handler serves the type from - comes from those bytes.

 Author: Aidan Barends 230255639
 Date: 21 September 2026
*/

package za.ac.cput.storage;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import za.ac.cput.domain.storage.UploadedFile;
import za.ac.cput.repository.storage.UploadedFileRepository;
import za.ac.cput.util.ImageTypeDetector;

@Component
public class LocalFileStorage {

    private static final Logger log = LoggerFactory.getLogger(LocalFileStorage.class);

    /** The path segment UploadController serves saved files under - see WebConfig. */
    private static final String URL_MARKER = "/uploads/";

    /** Exactly what save() generates: a UUID plus one of the image extensions. */
    private static final Pattern MANAGED_NAME = Pattern.compile(
            "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png|gif|webp)");

    private final Path uploadsDir;
    private final UploadedFileRepository uploads;
    private final long maxBytes;
    private final long dailyQuotaBytes;

    public LocalFileStorage(@Value("${app.uploads.dir:uploads}") String uploadsDir,
                            UploadedFileRepository uploads,
                            @Value("${app.uploads.max-bytes:10485760}") long maxBytes,
                            @Value("${app.uploads.daily-quota-bytes:104857600}") long dailyQuotaBytes) {
        this.uploadsDir = Path.of(uploadsDir).toAbsolutePath().normalize();
        this.uploads = uploads;
        this.maxBytes = maxBytes;
        this.dailyQuotaBytes = dailyQuotaBytes;
    }

    /**
     * Validates and saves an image under a fresh random name, recording the owner.
     *
     * @return the stored filename (not a URL - the caller builds that)
     * @throws IllegalArgumentException when the file is empty, too large, not a
     *         real image, or would take the student over today's quota
     */
    public String save(MultipartFile file, long ownerUserId) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("No file was uploaded");
        }
        if (file.getSize() > this.maxBytes) {
            throw new IllegalArgumentException(
                    "Images must be %d MB or smaller".formatted(this.maxBytes / (1024 * 1024)));
        }

        // Checked before the file is written, so a student at the limit cannot fill the disk.
        long usedToday = this.uploads.sumSizeBytesUploadedSince(
                ownerUserId, LocalDateTime.now().minus(Duration.ofDays(1)));
        if (usedToday + file.getSize() > this.dailyQuotaBytes) {
            throw new IllegalArgumentException("You have reached today's upload limit");
        }

        byte[] bytes = file.getBytes();
        String type = ImageTypeDetector.detect(bytes)
                .orElseThrow(() -> new IllegalArgumentException("Only PNG, JPEG, GIF or WEBP images are allowed"));

        Files.createDirectories(this.uploadsDir);
        String filename = UUID.randomUUID() + ImageTypeDetector.extensionFor(type);
        Files.write(this.uploadsDir.resolve(filename), bytes);

        this.uploads.save(new UploadedFile(filename, ownerUserId, type, bytes.length, LocalDateTime.now()));
        return filename;
    }

    /**
     * Whether an image URL a client sent is an /uploads/... file this user uploaded.
     * Anything else - another student's upload, an external link, a javascript: or
     * data: URL - is refused, so an image row can only ever point at our own files.
     */
    public boolean isOwnedBy(String url, long userId) {
        return managedFilename(url)
                .flatMap(this.uploads::findById)
                .map(record -> record.getOwnerUserId() == userId)
                .orElse(false);
    }

    /**
     * Deletes the file an /uploads/... URL points at, but only when it is one of ours
     * AND it was uploaded by ownerUserId (the owner of the listing/post being removed).
     * Best-effort: a missing file or one outside our control is not an error the caller
     * needs to see, since the database row is the thing that actually matters and is
     * removed regardless.
     */
    public void deleteIfManaged(String url, long ownerUserId) {
        Optional<String> filename = managedFilename(url);
        if (filename.isEmpty()) return;

        Optional<UploadedFile> record = this.uploads.findById(filename.get());
        if (record.isEmpty() || record.get().getOwnerUserId() != ownerUserId) {
            // Not provably this owner's (including files saved before ownership was
            // recorded): leave it on disk rather than risk deleting someone else's.
            return;
        }

        try {
            Files.deleteIfExists(this.uploadsDir.resolve(filename.get()));
            this.uploads.deleteById(filename.get());
        } catch (IOException e) {
            log.warn("Could not delete uploaded file {}: {}", filename.get(), e.getMessage());
        }
    }

    /**
     * The stored filename an http(s) or relative /uploads/... URL names, or empty
     * when it is not exactly one of the names save() generates.
     */
    static Optional<String> managedFilename(String url) {
        if (url == null || url.isBlank()) return Optional.empty();

        URI uri;
        try {
            uri = new URI(url.trim());
        } catch (URISyntaxException e) {
            return Optional.empty();
        }

        String scheme = uri.getScheme();
        if (scheme != null && !scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https")) {
            return Optional.empty();
        }
        if (uri.getQuery() != null || uri.getFragment() != null) {
            return Optional.empty();
        }

        String path = uri.getPath();
        if (path == null || !path.startsWith(URL_MARKER)) return Optional.empty();

        String filename = path.substring(URL_MARKER.length());
        return MANAGED_NAME.matcher(filename).matches() ? Optional.of(filename) : Optional.empty();
    }

}
