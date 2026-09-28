/*
 ModerationAnalyticsService.java

 Time series for the moderation dashboard charts.

 Each metric is fetched as bare timestamps (plus a number where one is needed)
 for this window AND the one before it, then counted into buckets here in Java.
 That keeps the queries plain JPQL - no MySQL-only DATE_FORMAT / YEARWEEK - so
 they run unchanged on the H2 database the tests use. The largest range is a
 year of rows, which is small for a campus marketplace.

 Buckets are in the server's local time, the same clock every LocalDateTime in
 the database was stamped with.

 Money (sales and wallet top-ups) is only included for an admin session. It is
 left out of the response entirely rather than hidden by the frontend.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 25 September 2026
*/

package za.ac.cput.service.moderation;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import za.ac.cput.domain.enums.AccountStatus;
import za.ac.cput.domain.enums.PaymentStatus;
import za.ac.cput.domain.enums.TransactionStatus;
import za.ac.cput.dto.moderation.AnalyticsDtos.Analytics;
import za.ac.cput.dto.moderation.AnalyticsDtos.Bucket;
import za.ac.cput.dto.moderation.AnalyticsDtos.Range;
import za.ac.cput.dto.moderation.AnalyticsDtos.Series;
import za.ac.cput.util.Helper;

@Service
@Transactional(readOnly = true)
public class ModerationAnalyticsService {

    @PersistenceContext
    private EntityManager em;

    private final int badReviewThreshold;

    public ModerationAnalyticsService(@Value("${app.moderation.bad-review-threshold:2}") int badReviewThreshold) {
        this.badReviewThreshold = badReviewThreshold;
    }

    public Analytics analytics(Range range, boolean includeMoney) {
        return analytics(range, includeMoney, LocalDateTime.now());
    }

    /** Package-visible with an explicit clock so the bucketing can be tested. */
    Analytics analytics(Range range, boolean includeMoney, LocalDateTime now) {
        Window current = Window.ending(range, now);
        Window previous = current.previous();
        LocalDateTime from = previous.start;
        LocalDateTime to = current.end;

        Map<String, Series> series = new LinkedHashMap<>();

        // ---- people
        List<Object[]> signups = rows(
                "select u.createdAt, u.email, u.accountStatus from User u "
                        + "where u.createdAt >= :from and u.createdAt < :to", from, to);
        series.put("signups", counts(current, previous, signups, row -> (LocalDateTime) row[0]));
        series.put("signupsStaff", counts(current, previous,
                signups.stream().filter(row -> Helper.isStaffEmail((String) row[1])).toList(),
                row -> (LocalDateTime) row[0]));
        series.put("signupsStudent", counts(current, previous,
                signups.stream().filter(row -> !Helper.isStaffEmail((String) row[1])).toList(),
                row -> (LocalDateTime) row[0]));

        // Running total of accounts that still exist. "Before the window" is one
        // count; the rest is accumulated from the signups already fetched.
        long existingBefore = this.em.createQuery(
                        "select count(u) from User u where u.createdAt < :from and u.accountStatus <> :gone",
                        Long.class)
                .setParameter("from", from)
                .setParameter("gone", AccountStatus.DEACTIVATED)
                .getSingleResult();
        List<LocalDateTime> liveSignups = signups.stream()
                .filter(row -> row[2] != AccountStatus.DEACTIVATED)
                .map(row -> (LocalDateTime) row[0])
                .toList();
        double[] prevLive = cumulative(previous, liveSignups, existingBefore);
        double[] curLive = cumulative(current, liveSignups,
                prevLive.length == 0 ? existingBefore : (long) prevLive[prevLive.length - 1]);
        series.put("usersTotal", new Series(boxed(curLive), last(curLive), last(prevLive)));

        // ---- marketplace and community
        series.put("listingsCreated", counts(current, previous, times(
                "select l.createdAt from Listing l where l.createdAt >= :from and l.createdAt < :to",
                from, to), Function.identity()));

        List<Object[]> sales = rows(
                "select t.completedAt, t.amount from Transaction t where t.status = :done "
                        + "and t.completedAt >= :from and t.completedAt < :to",
                from, to, Map.of("done", TransactionStatus.COMPLETED));
        series.put("listingsSold", counts(current, previous, sales, row -> (LocalDateTime) row[0]));

        series.put("postsCreated", counts(current, previous, times(
                "select p.createdAt from BulletinPost p where p.isFacultyAnnouncement = false "
                        + "and p.createdAt >= :from and p.createdAt < :to",
                from, to), Function.identity()));

        series.put("messagesSent", counts(current, previous, times(
                "select m.sentAt from Message m where m.sentAt >= :from and m.sentAt < :to",
                from, to), Function.identity()));

        // ---- trust
        List<Object[]> reviews = rows(
                "select r.createdAt, r.rating from Review r where r.createdAt >= :from and r.createdAt < :to",
                from, to);
        series.put("reviews", counts(current, previous, reviews, row -> (LocalDateTime) row[0]));
        series.put("badReviews", counts(current, previous,
                reviews.stream().filter(row -> ((Number) row[1]).intValue() <= this.badReviewThreshold).toList(),
                row -> (LocalDateTime) row[0]));
        series.put("avgRating", averages(current, previous, reviews));

        series.put("reportsFiled", counts(current, previous, times(
                "select r.createdAt from Report r where r.createdAt >= :from and r.createdAt < :to",
                from, to), Function.identity()));
        series.put("reportsResolved", counts(current, previous, times(
                "select r.resolvedAt from Report r where r.resolvedAt >= :from and r.resolvedAt < :to",
                from, to), Function.identity()));

        // ---- enforcement (from the audit log: nothing else records when it happened)
        List<Object[]> actions = rows(
                "select a.createdAt, a.action from AuditLog a where a.action in :actions "
                        + "and a.createdAt >= :from and a.createdAt < :to",
                from, to, Map.of("actions", allOf(AuditActions.USER_SUSPENDED, AuditActions.REMOVALS)));
        Series suspensions = counts(current, previous,
                ofAction(actions, List.of(AuditActions.USER_SUSPENDED)), row -> (LocalDateTime) row[0]);
        series.put("suspensions", suspensions);
        series.put("banRate", banRate(suspensions, curLive, last(prevLive)));
        series.put("removedListings", counts(current, previous,
                ofAction(actions, List.of(AuditActions.LISTING_REMOVED)), row -> (LocalDateTime) row[0]));
        series.put("removedPosts", counts(current, previous,
                ofAction(actions, List.of(AuditActions.POST_REMOVED, AuditActions.ANNOUNCEMENT_REMOVED)),
                row -> (LocalDateTime) row[0]));
        series.put("removedReviews", counts(current, previous,
                ofAction(actions, List.of(AuditActions.REVIEW_REMOVED)), row -> (LocalDateTime) row[0]));

        // ---- money (admin sessions only)
        if (includeMoney) {
            series.put("salesVolume", sums(current, previous, sales));
            series.put("topUpVolume", sums(current, previous, rows(
                    "select w.completedAt, w.amount from WalletTopUp w where w.status = :done "
                            + "and w.completedAt >= :from and w.completedAt < :to",
                    from, to, Map.of("done", PaymentStatus.COMPLETED))));
        }

        return new Analytics(range.code(), range.bucket(), current.start, current.end,
                current.bucketStarts(), series);
    }

    // ------------------------------------------------------------------ queries

    private List<Object[]> rows(String jpql, LocalDateTime from, LocalDateTime to) {
        return rows(jpql, from, to, Map.of());
    }

    private List<Object[]> rows(String jpql, LocalDateTime from, LocalDateTime to, Map<String, Object> extra) {
        var query = this.em.createQuery(jpql, Object[].class)
                .setParameter("from", from)
                .setParameter("to", to);
        extra.forEach(query::setParameter);
        return query.getResultList();
    }

    private List<LocalDateTime> times(String jpql, LocalDateTime from, LocalDateTime to) {
        return this.em.createQuery(jpql, LocalDateTime.class)
                .setParameter("from", from)
                .setParameter("to", to)
                .getResultList();
    }

    private static List<String> allOf(String first, List<String> rest) {
        List<String> all = new ArrayList<>(rest);
        all.add(first);
        return all;
    }

    private static List<Object[]> ofAction(List<Object[]> rows, List<String> wanted) {
        return rows.stream().filter(row -> wanted.contains((String) row[1])).toList();
    }

    // ---------------------------------------------------------------- bucketing

    private static <T> Series counts(Window current, Window previous, List<T> rows,
                                     Function<T, LocalDateTime> when) {
        double[] values = new double[current.size];
        double previousTotal = 0;
        for (T row : rows) {
            LocalDateTime at = when.apply(row);
            int index = current.indexOf(at);
            if (index >= 0) {
                values[index]++;
            }
            else if (previous.contains(at)) {
                previousTotal++;
            }
        }
        return new Series(boxed(values), sum(values), previousTotal);
    }

    /** Sums row[1] (a BigDecimal amount) per bucket. */
    private static Series sums(Window current, Window previous, List<Object[]> rows) {
        double[] values = new double[current.size];
        double previousTotal = 0;
        for (Object[] row : rows) {
            LocalDateTime at = (LocalDateTime) row[0];
            double amount = row[1] == null ? 0 : ((BigDecimal) row[1]).doubleValue();
            int index = current.indexOf(at);
            if (index >= 0) {
                values[index] += amount;
            }
            else if (previous.contains(at)) {
                previousTotal += amount;
            }
        }
        return new Series(boxed(values), round2(sum(values)), round2(previousTotal));
    }

    /** Mean of row[1] (a rating) per bucket; null where there were no reviews. */
    private static Series averages(Window current, Window previous, List<Object[]> rows) {
        double[] sum = new double[current.size];
        int[] count = new int[current.size];
        double curSum = 0;
        int curCount = 0;
        double prevSum = 0;
        int prevCount = 0;
        for (Object[] row : rows) {
            LocalDateTime at = (LocalDateTime) row[0];
            int rating = ((Number) row[1]).intValue();
            int index = current.indexOf(at);
            if (index >= 0) {
                sum[index] += rating;
                count[index]++;
                curSum += rating;
                curCount++;
            }
            else if (previous.contains(at)) {
                prevSum += rating;
                prevCount++;
            }
        }
        List<Double> values = new ArrayList<>(current.size);
        for (int i = 0; i < current.size; i++) {
            values.add(count[i] == 0 ? null : round2(sum[i] / count[i]));
        }
        return new Series(values,
                curCount == 0 ? null : round2(curSum / curCount),
                prevCount == 0 ? null : round2(prevSum / prevCount));
    }

    /** Running total per bucket, starting from `base`. */
    private static double[] cumulative(Window window, List<LocalDateTime> times, long base) {
        double[] added = new double[window.size];
        for (LocalDateTime at : times) {
            int index = window.indexOf(at);
            if (index >= 0) {
                added[index]++;
            }
        }
        double running = base;
        for (int i = 0; i < added.length; i++) {
            running += added[i];
            added[i] = running;
        }
        return added;
    }

    /*
     Suspensions per 1,000 accounts. Per bucket it uses that bucket's account
     count; the totals use the account count at the end of each window.
    */
    private static Series banRate(Series suspensions, double[] liveAtBucketEnd, Double liveAtPreviousEnd) {
        List<Double> values = new ArrayList<>(liveAtBucketEnd.length);
        for (int i = 0; i < liveAtBucketEnd.length; i++) {
            values.add(perThousand(suspensions.values().get(i), liveAtBucketEnd[i]));
        }
        Double live = last(liveAtBucketEnd);
        return new Series(values,
                perThousand(suspensions.total(), live == null ? 0 : live),
                perThousand(suspensions.previousTotal(), liveAtPreviousEnd == null ? 0 : liveAtPreviousEnd));
    }

    private static Double perThousand(Double count, double population) {
        if (count == null || population <= 0) {
            return 0.0;
        }
        return round2(count * 1000 / population);
    }

    private static List<Double> boxed(double[] values) {
        List<Double> list = new ArrayList<>(values.length);
        for (double value : values) {
            list.add(value);
        }
        return list;
    }

    private static double sum(double[] values) {
        double total = 0;
        for (double value : values) {
            total += value;
        }
        return total;
    }

    private static Double last(double[] values) {
        return values.length == 0 ? null : values[values.length - 1];
    }

    private static double round2(double value) {
        return Math.round(value * 100) / 100.0;
    }

    /** A run of equal-sized buckets, [start, end). */
    static final class Window {

        final LocalDateTime start;
        final LocalDateTime end;
        final int size;
        final Bucket bucket;

        private Window(LocalDateTime start, LocalDateTime end, int size, Bucket bucket) {
            this.start = start;
            this.end = end;
            this.size = size;
            this.bucket = bucket;
        }

        /** The window whose last bucket contains `now`. */
        static Window ending(Range range, LocalDateTime now) {
            LocalDateTime end = switch (range.bucket()) {
                case HOUR -> now.truncatedTo(ChronoUnit.HOURS).plusHours(1);
                case DAY -> now.truncatedTo(ChronoUnit.DAYS).plusDays(1);
                case WEEK -> now.truncatedTo(ChronoUnit.DAYS)
                        .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                        .plusWeeks(1);
            };
            return new Window(step(end, range.bucket(), -range.buckets()), end, range.buckets(), range.bucket());
        }

        Window previous() {
            return new Window(step(this.start, this.bucket, -this.size), this.start, this.size, this.bucket);
        }

        boolean contains(LocalDateTime at) {
            return at != null && !at.isBefore(this.start) && at.isBefore(this.end);
        }

        int indexOf(LocalDateTime at) {
            if (!contains(at)) {
                return -1;
            }
            long offset = switch (this.bucket) {
                case HOUR -> Duration.between(this.start, at).toHours();
                case DAY -> Duration.between(this.start, at).toDays();
                case WEEK -> Duration.between(this.start, at).toDays() / 7;
            };
            return (int) Math.min(offset, this.size - 1);
        }

        List<LocalDateTime> bucketStarts() {
            List<LocalDateTime> starts = new ArrayList<>(this.size);
            for (int i = 0; i < this.size; i++) {
                starts.add(step(this.start, this.bucket, i));
            }
            return starts;
        }

        private static LocalDateTime step(LocalDateTime from, Bucket bucket, long count) {
            return switch (bucket) {
                case HOUR -> from.plusHours(count);
                case DAY -> from.plusDays(count);
                case WEEK -> from.plusWeeks(count);
            };
        }
    }

}
