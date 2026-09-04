/*
 MessageRepository.java

 Spring Data JPA repository for the Message entity.

 Author: <Your Full Name> (<Student Number>)
 Date: 04 September 2026
*/

package za.ac.cput.repository.communication;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import za.ac.cput.domain.communication.Message;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findByConversationIdOrderBySentAtAsc(long conversationId);

    List<Message> findBySenderId(long senderId);

}
