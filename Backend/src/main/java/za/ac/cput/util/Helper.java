/*
 Helper.java

 Helper utility class

 Author: <Your Full Name> (<Student Number>)
 Date: 04 September 2026
*/

package za.ac.cput.util;

import org.apache.commons.validator.routines.EmailValidator;
import org.apache.commons.validator.routines.UrlValidator;

import java.math.BigDecimal;

public class Helper {

    // Prevent instantiation - utility class
    private Helper() {}

    // Check if a String is null or empty
    public static boolean isNullOrEmpty(String value) {
        return value == null || value.trim().isEmpty();
    }

    // Validate email using commons-validator (user.email - BR-004)
    public static boolean isValidEmail(String email) {
        if (isNullOrEmpty(email)) return false;
        return EmailValidator.getInstance().isValid(email);
    }

    // Validate mobile number - must be digits only and between 10-15 chars (user.cell_phone)
    public static boolean isValidMobileNumber(String mobileNumber) {
        if (isNullOrEmpty(mobileNumber)) return false;
        return mobileNumber.matches("\\d{10,15}");
    }

    // Validate password - must be at least 8 chars (user.password_hash - BR-101)
    public static boolean isValidPassword(String password) {
        if (isNullOrEmpty(password)) return false;
        return password.length() >= 8;
    }

    // Validate object is not null (for enums, entities, dates etc)
    public static boolean isValidObject(Object object) {
        return object != null;
    }

    // Validate positive id - must be > 0 (all *_id / foreign key columns)
    public static boolean isValidId(long id) {
        return id > 0;
    }

    // Validate money - must be non-negative (price, amount, balance -
    // matches chk_listing_price, chk_transaction_amount, chk_payment_amount,
    // chk_wallet_balance)
    public static boolean isValidBigDecimal(BigDecimal value) {
        return value != null && value.compareTo(BigDecimal.ZERO) >= 0;
    }

    // Validate rating - must be between 1 and 5 (review.rating - BR-045)
    public static boolean isValidRating(int rating) {
        return rating >= 1 && rating <= 5;
    }

    // Validate currency - must be 3 uppercase letters (wallet.currency, e.g. ZAR)
    public static boolean isValidCurrency(String currency) {
        if (isNullOrEmpty(currency)) return false;
        return currency.matches("[A-Z]{3}");
    }

    // Validate URL using commons-validator (listing_image.image_url)
    public static boolean isValidUrl(String url) {
        if (isNullOrEmpty(url)) return false;
        return UrlValidator.getInstance().isValid(url);
    }

}