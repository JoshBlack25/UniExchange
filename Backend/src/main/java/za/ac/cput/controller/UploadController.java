/*
 UploadController.java

 Accepts an image file from any authenticated user and saves it to disk via
 LocalFileStorage, returning the URL it is now reachable at (served by
 WebConfig's /uploads/** resource handler). Listings and bulletin posts both
 store images as a plain URL string, so this is the one place that turns a
 file the user picked into a URL those existing endpoints can store - it does
 not touch ListingImage or BulletinPostImage itself.

 Author: Aidan Barends 230255639
 Date: 18 September 2026
*/

package za.ac.cput.controller;

import java.io.IOException;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import za.ac.cput.security.UniExchangeUserDetailsService.AuthenticatedUser;
import za.ac.cput.storage.LocalFileStorage;

@RestController
@RequestMapping("/api/uploads")
public class UploadController {

    private final LocalFileStorage storage;

    public UploadController(LocalFileStorage storage) {
        this.storage = storage;
    }

    /*
     Validation (size, real image bytes, the daily quota) is in LocalFileStorage and
     surfaces as a 400 through GlobalExceptionHandler. The caller is recorded as the
     file's owner, which is what the listing/bulletin image endpoints check.
    */
    @PostMapping
    public ResponseEntity<Map<String, String>> upload(@RequestParam("file") MultipartFile file,
                                                      @AuthenticationPrincipal AuthenticatedUser principal)
            throws IOException {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String filename = this.storage.save(file, principal.getUser().getUserId());

        String url = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/uploads/")
                .path(filename)
                .toUriString();

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("url", url));
    }

}
