/*
 CputEmailValidator.java

 Backs @CputEmail. Compiles app.auth.student-email-pattern and
 app.auth.staff-email-pattern once at startup, falling back to
 Helper.STUDENT_EMAIL_PATTERN and Helper.STAFF_EMAIL_PATTERN. An address passes
 if it matches either one.

 The property exists so that a legitimate student number of an unexpected length
 can be admitted by editing configuration, not by patching and redeploying - a
 verification gate that is one digit too strict locks real students out of the
 platform entirely, which is the worst failure mode this feature has.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 04 September 2026
*/

package za.ac.cput.validation;

import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;

import za.ac.cput.util.Helper;

public class CputEmailValidator implements ConstraintValidator<CputEmail, String> {

    private static final Logger log = LoggerFactory.getLogger(CputEmailValidator.class);

    private final Pattern studentPattern;
    private final Pattern staffPattern;

    public CputEmailValidator(
            @Value("${app.auth.student-email-pattern:}") String studentPattern,
            @Value("${app.auth.staff-email-pattern:}") String staffPattern) {

        this.studentPattern = compile(studentPattern, Helper.STUDENT_EMAIL_PATTERN, "student");
        this.staffPattern = compile(staffPattern, Helper.STAFF_EMAIL_PATTERN, "staff");
    }

    @Override
    public boolean isValid(String email, ConstraintValidatorContext context) {
        // Leave "is it present at all" to @NotBlank so the two concerns report separately.
        if (Helper.isNullOrEmpty(email)) {
            return true;
        }
        String trimmed = email.trim();
        return this.studentPattern.matcher(trimmed).matches()
                || this.staffPattern.matcher(trimmed).matches();
    }

    private static Pattern compile(String configuredPattern, String fallback, String kind) {
        if (Helper.isNullOrEmpty(configuredPattern)) {
            return Pattern.compile(fallback, Pattern.CASE_INSENSITIVE);
        }
        try {
            return Pattern.compile(configuredPattern.trim(), Pattern.CASE_INSENSITIVE);
        }
        catch (PatternSyntaxException ex) {
            // Never let a typo in configuration open the gate to everyone.
            log.error("Invalid app.auth.{}-email-pattern '{}' - falling back to the default",
                    kind, configuredPattern, ex);
            return Pattern.compile(fallback, Pattern.CASE_INSENSITIVE);
        }
    }

}
