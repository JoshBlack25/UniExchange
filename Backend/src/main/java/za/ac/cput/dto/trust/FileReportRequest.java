/*
 FileReportRequest.java

 What the "Report" button sends. The reporter is always the signed-in user and
 a new report always starts PENDING, so neither is part of the request.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 25 September 2026
*/

package za.ac.cput.dto.trust;

import jakarta.validation.constraints.Size;

import za.ac.cput.domain.enums.ReportReason;
import za.ac.cput.domain.enums.ReportTargetType;

public record FileReportRequest(
        ReportTargetType targetType,
        Long targetId,
        ReportReason category,
        @Size(max = 500, message = "Keep the details under 500 characters.") String details) {
}
