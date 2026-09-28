/*
 AnalyticsDtos.java

 What GET /api/moderation/analytics hands back for the dashboard charts.

 Every series in one response shares the same buckets, so the frontend can plot
 any combination of them on one axis. previousTotal is the same metric over the
 equally long window just before this one - the "vs previous period" delta on
 each chart card.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 25 September 2026
*/

package za.ac.cput.dto.moderation;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public final class AnalyticsDtos {

    private AnalyticsDtos() {
    }

    public enum Bucket { HOUR, DAY, WEEK }

    /** The time ranges the dashboard offers, and how finely each one is bucketed. */
    public enum Range {
        D1("1d", 24, Bucket.HOUR),
        D2("2d", 48, Bucket.HOUR),
        D3("3d", 72, Bucket.HOUR),
        W1("1w", 7, Bucket.DAY),
        W2("2w", 14, Bucket.DAY),
        M1("1m", 30, Bucket.DAY),
        M2("2m", 60, Bucket.DAY),
        M3("3m", 90, Bucket.DAY),
        M6("6m", 26, Bucket.WEEK),
        Y1("1y", 52, Bucket.WEEK);

        private final String code;
        private final int buckets;
        private final Bucket bucket;

        Range(String code, int buckets, Bucket bucket) {
            this.code = code;
            this.buckets = buckets;
            this.bucket = bucket;
        }

        public String code() {
            return this.code;
        }

        public int buckets() {
            return this.buckets;
        }

        public Bucket bucket() {
            return this.bucket;
        }

        public static Range fromCode(String code) {
            for (Range range : values()) {
                if (range.code.equalsIgnoreCase(code == null ? "" : code.trim())) {
                    return range;
                }
            }
            throw new IllegalArgumentException(
                    "Unknown range. Use one of 1d, 2d, 3d, 1w, 2w, 1m, 2m, 3m, 6m, 1y.");
        }
    }

    /**
     * One metric over the window.
     *
     * @param values        one entry per bucket; null where the metric has no
     *                      value (an average with nothing to average)
     * @param total         the metric over the whole window
     * @param previousTotal the same over the previous, equally long window
     */
    public record Series(List<Double> values, Double total, Double previousTotal) {
    }

    /**
     * @param buckets the start of each bucket, oldest first
     * @param series  keyed by metric name, e.g. "signups" or "banRate"
     */
    public record Analytics(
            String range,
            Bucket bucket,
            LocalDateTime from,
            LocalDateTime to,
            List<LocalDateTime> buckets,
            Map<String, Series> series) {
    }

}
