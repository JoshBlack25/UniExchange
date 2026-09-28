/*
 WalletTransactionRepository.java

 Spring Data JPA repository for the WalletTransaction entity.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 04 September 2026
*/

package za.ac.cput.repository.transactions;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import za.ac.cput.domain.enums.WalletTransactionType;
import za.ac.cput.domain.transactions.WalletTransaction;

@Repository
public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, Long> {

    List<WalletTransaction> findByWalletIdOrderByCreatedAtDesc(long walletId);

    List<WalletTransaction> findByWalletIdAndType(long walletId, WalletTransactionType type);

    /** Backs the rolling daily transfer cap (WalletLimits): what this wallet has sent recently. */
    @Query("select coalesce(sum(t.amount), 0) from WalletTransaction t " +
           "where t.walletId = :walletId and t.type = :type and t.referenceType = :referenceType " +
           "and t.createdAt >= :since")
    BigDecimal sumAmountSince(@Param("walletId") long walletId,
                              @Param("type") WalletTransactionType type,
                              @Param("referenceType") String referenceType,
                              @Param("since") LocalDateTime since);

}
