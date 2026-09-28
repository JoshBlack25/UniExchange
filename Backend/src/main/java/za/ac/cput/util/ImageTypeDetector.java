/*
 ImageTypeDetector.java

 Works out an image's real type from its first bytes (its "magic number").

 A client's declared Content-Type and file extension are both just strings the
 client chose, so neither is trusted. Every image upload path (profile photos,
 /api/uploads, listing images) runs the bytes through here and stores and serves
 the type detected, never the one declared. A file that is really HTML or SVG
 therefore can never be served back as something a browser would run.

 Only JPEG, PNG, WebP and GIF are recognised: they are inert when rendered inline.
 SVG is deliberately absent - it is a scriptable document.

 Originally ProfilePhotoService.detectType; extracted so every upload path shares
 one implementation.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 25 September 2026
*/

package za.ac.cput.util;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;
import java.util.Optional;

public final class ImageTypeDetector {

    /** Bytes needed to recognise every supported signature (WebP is the longest at 12). */
    public static final int HEADER_BYTES = 12;

    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", ".jpg",
            "image/png", ".png",
            "image/webp", ".webp",
            "image/gif", ".gif");

    private ImageTypeDetector() {}

    /** The MIME type the bytes really are, or empty when they are not a supported image. */
    public static Optional<String> detect(byte[] b) {
        if (b == null) {
            return Optional.empty();
        }
        if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) {
            return Optional.of("image/jpeg");
        }
        if (b.length >= 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G'
                && b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A) {
            return Optional.of("image/png");
        }
        if (b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') {
            return Optional.of("image/webp");
        }
        if (b.length >= 6 && b[0] == 'G' && b[1] == 'I' && b[2] == 'F' && b[3] == '8'
                && (b[4] == '7' || b[4] == '9') && b[5] == 'a') {
            return Optional.of("image/gif");
        }
        return Optional.empty();
    }

    /** Reads just the header from a stream (which it closes) and detects from that. */
    public static Optional<String> detect(InputStream in) throws IOException {
        try (in) {
            return detect(in.readNBytes(HEADER_BYTES));
        }
    }

    /** The file extension, dot included, for a type detect() returned. */
    public static String extensionFor(String detectedType) {
        return EXTENSIONS.get(detectedType);
    }

}
