/*
 NotificationRepository.java

 Spring Data JPA repository for the Notification entity.

 Author: <Your Full Name> (<Student Number>)
 Date: 04 September 2026
*/

package za.ac.cput.repository.communication;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import za.ac.cput.domain.communication.Notification;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUserIdOrderByCreatedAtDesc(long userId);

    List<Notification> findByUserIdAndIsReadFalse(long userId);

}
