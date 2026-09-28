/*
 WalletLimits.java

 In-app spend caps for wallet top-ups and transfers.

   app.wallet.max-topup     - the most one top-up may be
   app.wallet.max-transfer  - the most one transfer may be
   app.wallet.daily-limit   - the most a student may top up, and separately the
                              most they may send, in any rolling 24 hours

 These bound the damage from a stolen session or a scripted client; PayFast's own
 account limits and Azure budget alerts are the external backstop. A breach is an
 IllegalArgumentException, so the student sees a 400 with the reason.

 The daily check reads the ledger before the money moves, so two requests racing
 in the same instant could both pass it. The per-operation cap bounds that.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 25 September 2026
*/

package za.ac.cput.service.transactions;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import za.ac.cput.domain.enums.PaymentStatus;
import za.ac.cput.domain.enums.WalletTransactionType;
import za.ac.cput.repository.transactions.WalletTopUpRepository;
import za.ac.cput.repository.transactions.WalletTransactionRepository;

@Component
public class WalletLimits {

    /** Top-ups that did or still may move money. FAILED/CANCELLED never will. */
    private static final List<PaymentStatus> LIVE_TOP_UPS =
            List.of(PaymentStatus.PENDING, PaymentStatus.PROCESSING, PaymentStatus.COMPLETED);

    private final WalletTopUpRepository topUps;
    private final WalletTransactionRepository ledger;
    private final BigDecimal maxTopUp;
    private final BigDecimal maxTransfer;
    private final BigDecimal dailyLimit;

    public WalletLimits(WalletTopUpRepository topUps,
                        WalletTransactionRepository ledger,
                        @Value("${app.wallet.max-topup:5000.00}") BigDecimal maxTopUp,
                        @Value("${app.wallet.max-transfer:5000.00}") BigDecimal maxTransfer,
                        @Value("${app.wallet.daily-limit:10000.00}") BigDecimal dailyLimit) {
        this.topUps = topUps;
        this.ledger = ledger;
        this.maxTopUp = maxTopUp;
        this.maxTransfer = maxTransfer;
        this.dailyLimit = dailyLimit;
    }

    public void checkTopUp(long userId, BigDecimal amount) {
        if (amount == null) return; // the factory rejects a missing amount with its own message
        if (amount.compareTo(this.maxTopUp) > 0) {
            throw new IllegalArgumentException(
                    "A single top-up can be at most R%s".formatted(this.maxTopUp.toPlainString()));
        }
        BigDecimal recent = this.topUps.sumAmountSince(userId, LocalDateTime.now().minusDays(1), LIVE_TOP_UPS);
        if (recent.add(amount).compareTo(this.dailyLimit) > 0) {
            throw new IllegalArgumentException(
                    "You can top up at most R%s in 24 hours".formatted(this.dailyLimit.toPlainString()));
        }
    }

    public void checkTransfer(long senderWalletId, BigDecimal amount) {
        if (amount.compareTo(this.maxTransfer) > 0) {
            throw new IllegalArgumentException(
                    "A single transfer can be at most R%s".formatted(this.maxTransfer.toPlainString()));
        }
        BigDecimal recent = this.ledger.sumAmountSince(senderWalletId, WalletTransactionType.DEBIT,
                TransferServiceImpl.REFERENCE_TYPE, LocalDateTime.now().minusDays(1));
        if (recent.add(amount).compareTo(this.dailyLimit) > 0) {
            throw new IllegalArgumentException(
                    "You can send at most R%s in 24 hours".formatted(this.dailyLimit.toPlainString()));
        }
    }

}
