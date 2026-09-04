/*
 HelperTest.java

 JUnit 5 replacement for the validation section of the old DomainTest main-method
 runner, which used to live (incorrectly) in src/main/java.

 Author: <Your Full Name> (<Student Number>)
 Date: 04 September 2026
*/

package za.ac.cput.util;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

class HelperTest {

    @Test
    void isNullOrEmpty() {
        assertTrue(Helper.isNullOrEmpty(null));
        assertTrue(Helper.isNullOrEmpty(""));
        assertTrue(Helper.isNullOrEmpty("   "));
        assertFalse(Helper.isNullOrEmpty("Kannemeyer"));
    }

    @Test
    void isValidEmail() {
        assertTrue(Helper.isValidEmail("student@mycput.ac.za"));
        assertFalse(Helper.isValidEmail("not-an-email"));
        assertFalse(Helper.isValidEmail(null));
    }

    @Test
    void isValidMobileNumber() {
        assertTrue(Helper.isValidMobileNumber("0821234567"));
        assertFalse(Helper.isValidMobileNumber("082123"));
        assertFalse(Helper.isValidMobileNumber("082-123-4567"));
    }

    @Test
    void isValidPassword() {
        assertTrue(Helper.isValidPassword("password123"));
        assertFalse(Helper.isValidPassword("short"));
        assertFalse(Helper.isValidPassword(null));
    }

    @Test
    void isValidObject() {
        assertTrue(Helper.isValidObject("anything"));
        assertFalse(Helper.isValidObject(null));
    }

    @Test
    void isValidId() {
        assertTrue(Helper.isValidId(1L));
        assertFalse(Helper.isValidId(0L));
        assertFalse(Helper.isValidId(-5L));
    }

    @Test
    void isValidBigDecimal() {
        assertTrue(Helper.isValidBigDecimal(BigDecimal.ZERO));
        assertTrue(Helper.isValidBigDecimal(new BigDecimal("199.99")));
        assertFalse(Helper.isValidBigDecimal(new BigDecimal("-1.00")));
        assertFalse(Helper.isValidBigDecimal(null));
    }

    @Test
    void isValidRating() {
        assertTrue(Helper.isValidRating(1));
        assertTrue(Helper.isValidRating(5));
        assertFalse(Helper.isValidRating(0));
        assertFalse(Helper.isValidRating(6));
    }

    @Test
    void isValidCurrency() {
        assertTrue(Helper.isValidCurrency("ZAR"));
        assertFalse(Helper.isValidCurrency("zar"));
        assertFalse(Helper.isValidCurrency("RANDS"));
    }

    @Test
    void isValidUrl() {
        assertTrue(Helper.isValidUrl("https://uniexchange.co.za/img/1.png"));
        assertFalse(Helper.isValidUrl("not a url"));
        assertFalse(Helper.isValidUrl(null));
    }

}
