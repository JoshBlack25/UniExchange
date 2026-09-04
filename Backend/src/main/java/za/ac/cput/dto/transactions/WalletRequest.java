/*
 WalletRequest.java

 Inbound payload for creating/updating a Wallet. Entities have no public
 setters, so requests arrive as a record and are handed to WalletFactory.

 Author: <Your Full Name> (<Student Number>)
 Date: 04 September 2026
*/

package za.ac.cput.dto.transactions;

import java.math.BigDecimal;

public record WalletRequest(
        long userId,
        BigDecimal balance,
        String currency) {
}
