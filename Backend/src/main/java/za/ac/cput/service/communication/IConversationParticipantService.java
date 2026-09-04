/*
 IConversationParticipantService.java

 Service contract for ConversationParticipant.

 Author: <Your Full Name> (<Student Number>)
 Date: 04 September 2026
*/

package za.ac.cput.service.communication;

import java.util.List;

import za.ac.cput.domain.communication.ConversationParticipant;
import za.ac.cput.service.IService;

public interface IConversationParticipantService extends IService<ConversationParticipant, Long> {

    List<ConversationParticipant> findByConversationId(long conversationId);

    List<ConversationParticipant> findByUserId(long userId);

}
