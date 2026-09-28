/*
 ProfilePhotoService.java

 Uploads, replaces and removes a user's profile picture.

 The declared Content-Type is not trusted: the first bytes must match a JPEG,
 PNG, WebP or GIF signature, and the stored type comes from those bytes. So a
 file that is really HTML or SVG can never be served back from this endpoint as
 something a browser would run. (Spring Security also sends nosniff.) The
 detection itself lives in util/ImageTypeDetector, shared with every upload path.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 25 September 2026
*/

package za.ac.cput.service.identity;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import za.ac.cput.domain.identity.ProfilePhoto;
import za.ac.cput.domain.identity.User;
import za.ac.cput.factory.identity.UserFactory;
import za.ac.cput.repository.identity.ProfilePhotoRepository;
import za.ac.cput.repository.identity.UserRepository;
import za.ac.cput.util.ImageTypeDetector;

@Service
public class ProfilePhotoService {

    static final long MAX_BYTES = 5L * 1024 * 1024;

    private final ProfilePhotoRepository photos;
    private final UserRepository users;

    public ProfilePhotoService(ProfilePhotoRepository photos, UserRepository users) {
        this.photos = photos;
        this.users = users;
    }

    @Transactional
    public User upload(User user, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Choose a photo to upload.");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new IllegalArgumentException("Your photo must be 5 MB or smaller.");
        }
        byte[] bytes;
        try {
            bytes = file.getBytes();
        }
        catch (IOException ex) {
            throw new IllegalStateException("Could not read the uploaded photo.", ex);
        }
        String type = ImageTypeDetector.detect(bytes)
                .orElseThrow(() -> new IllegalArgumentException("Use a JPEG, PNG, WebP or GIF image."));

        LocalDateTime now = LocalDateTime.now();
        this.photos.save(new ProfilePhoto(user.getUserId(), bytes, type, now));
        return this.users.save(UserFactory.changePhoto(current(user), now));
    }

    @Transactional
    public User remove(User user) {
        this.photos.deleteById(user.getUserId());
        return this.users.save(UserFactory.changePhoto(current(user), null));
    }

    public Optional<ProfilePhoto> find(long userId) {
        return this.photos.findById(userId);
    }

    /* The principal's copy may be a request old; build on the stored row. */
    private User current(User user) {
        return this.users.findById(user.getUserId()).orElse(user);
    }

}
