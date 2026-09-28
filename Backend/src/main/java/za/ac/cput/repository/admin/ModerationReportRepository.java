/*
 ModerationReportRepository.java

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 25 September 2026
*/

package za.ac.cput.repository.admin;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import za.ac.cput.domain.admin.ModerationReport;
import za.ac.cput.domain.enums.ModerationAction;

@Repository
public interface ModerationReportRepository extends JpaRepository<ModerationReport, Long> {

    List<ModerationReport> findAllByOrderByCreatedAtDesc();

    List<ModerationReport> findByActionOrderByCreatedAtDesc(ModerationAction action);

    List<ModerationReport> findBySubjectUserIdOrderByCreatedAtDesc(long subjectUserId);

}
