/*
 IMessageService.java

 Service contract for Message.

 Author: <Your Full Name> (<Student Number>)
 Date: 04 September 2026
*/

package za.ac.cput.service.communication;

import java.util.List;

import za.ac.cput.domain.communication.Message;
import za.ac.cput.service.IService;

public interface IMessageService extends IService<Message, Long> {

    List<Message> findByConversationId(long conversationId);

}
