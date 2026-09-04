/*
 ITransactionService.java

 Service contract for Transaction.

 Author: <Your Full Name> (<Student Number>)
 Date: 04 September 2026
*/

package za.ac.cput.service.transactions;

import java.util.List;

import za.ac.cput.domain.transactions.Transaction;
import za.ac.cput.service.IService;

public interface ITransactionService extends IService<Transaction, Long> {

    List<Transaction> findByBuyerId(long buyerId);

    List<Transaction> findBySellerId(long sellerId);

    Transaction complete(Long transactionId);

}
