/*
 ProfilePhotoController.java

 /api/profile-photos - profile pictures.

   POST   /me        upload or replace your own photo (multipart "file")
   DELETE /me        remove your own photo
   GET    /{userId}  the picture itself; public, like listing photos

 Only ever your own: there is no endpoint that takes a user id for writing.
 The GET is cached for a year because the URL carries a version
 (User.getProfilePhotoUrl) that changes with the photo.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 25 September 2026
*/

package za.ac.cput.controller.identity;

import java.time.Duration;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import za.ac.cput.domain.identity.User;
import za.ac.cput.security.UniExchangeUserDetailsService.AuthenticatedUser;
import za.ac.cput.service.identity.ProfilePhotoService;

@RestController
@RequestMapping("/api/profile-photos")
public class ProfilePhotoController {

    private final ProfilePhotoService service;

    public ProfilePhotoController(ProfilePhotoService service) {
        this.service = service;
    }

    @PostMapping(value = "/me", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public User upload(@RequestParam("file") MultipartFile file,
                       @AuthenticationPrincipal AuthenticatedUser principal) {
        return this.service.upload(principal.getUser(), file);
    }

    @DeleteMapping("/me")
    public User remove(@AuthenticationPrincipal AuthenticatedUser principal) {
        return this.service.remove(principal.getUser());
    }

    @GetMapping("/{userId}")
    public ResponseEntity<byte[]> photo(@PathVariable long userId) {
        return this.service.find(userId)
                .map(photo -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(photo.getContentType()))
                        .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
                        .header("Content-Disposition", "inline")
                        .body(photo.getImageData()))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

}
