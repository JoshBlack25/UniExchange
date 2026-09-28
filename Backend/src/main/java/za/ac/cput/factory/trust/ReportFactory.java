/*
 ReportFactory.java

 Factory for Report. All construction goes through here so that every
 Report is validated with Helper before it exists - the entity itself
 exposes only a Builder and a protected JPA constructor.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 04 September 2026
*/

package za.ac.cput.factory.trust;

import java.time.LocalDateTime;

import za.ac.cput.domain.enums.ReportReason;
import za.ac.cput.domain.enums.ReportStatus;
import za.ac.cput.domain.enums.ReportTargetType;
import za.ac.cput.domain.trust.Report;
import za.ac.cput.util.Helper;

public class ReportFactory {

    // Prevent instantiation - factory class
    private ReportFactory() {}

    public static Report createReport(long reporterId, ReportTargetType targetType, long targetId,
                                      String reason, ReportStatus status) {
        if (!Helper.isValidId(reporterId)) {
            throw new IllegalArgumentException("Report: reporterId must be a positive id");
        }

        if (!Helper.isValidObject(targetType)) {
            throw new IllegalArgumentException("Report: targetType is required");
        }

        if (!Helper.isValidId(targetId)) {
            throw new IllegalArgumentException("Report: targetId must be a positive id");
        }

        if (Helper.isNullOrEmpty(reason)) {
            throw new IllegalArgumentException("Report: reason is required");
        }

        if (!Helper.isValidObject(status)) {
            throw new IllegalArgumentException("Report: status is required");
        }

        LocalDateTime now = LocalDateTime.now();

        return new Report.Builder()
                .setReporterId(reporterId)
                .setTargetType(targetType)
                .setTargetId(targetId)
                .setReason(reason)
                .setStatus(status)
                .setCreatedAt(now)
                .build();
    }

    /** A new report from the Report button: always PENDING, with its dropdown category. */
    public static Report createReport(long reporterId, ReportTargetType targetType, long targetId,
                                      ReportReason category, String details) {
        if (!Helper.isValidObject(category)) {
            throw new IllegalArgumentException("Report: category is required");
        }
        Report report = createReport(reporterId, targetType, targetId, details, ReportStatus.PENDING);
        return new Report.Builder().copy(report).setCategory(category).build();
    }

    public static Report updateReport(Report existing, long reporterId, ReportTargetType targetType,
                                      long targetId, String reason, ReportStatus status) {
        if (!Helper.isValidObject(existing)) {
            throw new IllegalArgumentException("Report: existing record is required for an update");
        }

        if (!Helper.isValidId(reporterId)) {
            throw new IllegalArgumentException("Report: reporterId must be a positive id");
        }

        if (!Helper.isValidObject(targetType)) {
            throw new IllegalArgumentException("Report: targetType is required");
        }

        if (!Helper.isValidId(targetId)) {
            throw new IllegalArgumentException("Report: targetId must be a positive id");
        }

        if (Helper.isNullOrEmpty(reason)) {
            throw new IllegalArgumentException("Report: reason is required");
        }

        if (!Helper.isValidObject(status)) {
            throw new IllegalArgumentException("Report: status is required");
        }

        return new Report.Builder()
                .copy(existing)
                .setReporterId(reporterId)
                .setTargetType(targetType)
                .setTargetId(targetId)
                .setReason(reason)
                .setStatus(status)
                .build();
    }

}
