/*
 GlobalExceptionHandler.java

 Turns factory validation failures into 400 responses. Without this every
 IllegalArgumentException thrown by a *Factory would surface as a 500.

 Also the last line of defence against leaking internals: an unexpected
 exception is logged in full here and the client gets a generic 500 with no
 message, class name or stack trace.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 04 September 2026
*/

package za.ac.cput.controller;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.TypeMismatchException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import za.ac.cput.exception.ConflictException;
import za.ac.cput.exception.InsufficientFundsException;
import za.ac.cput.exception.ModerationDeniedException;
import za.ac.cput.exception.ServiceUnavailableException;
import za.ac.cput.exception.TooManyRequestsException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(IllegalArgumentException ex) {
        return build(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleBeanValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fields = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(error -> fields.putIfAbsent(error.getField(), error.getDefaultMessage()));

        // The first field's message doubles as the headline, for forms that show only one line.
        String message = fields.values().stream().findFirst().orElse("Request validation failed");
        Map<String, Object> body = base(HttpStatus.BAD_REQUEST, message);
        body.put("fields", fields);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    /*
     Must sit before the AuthenticationException handler in intent: DisabledException
     IS an AuthenticationException, so without this a student whose email is simply
     unverified would be told "Invalid email or password" and have no way forward.
     Spring picks the most specific handler, so both can coexist.

     Trade-off accepted: distinguishing "not verified" from "wrong password" is a
     mild account-enumeration signal. For a campus marketplace the usable flow is
     worth more than hiding it.
    */
    @ExceptionHandler(DisabledException.class)
    public ResponseEntity<Map<String, Object>> handleUnverified(DisabledException ex) {
        Map<String, Object> body = base(HttpStatus.FORBIDDEN,
                "Verify your student email before signing in.");
        body.put("code", "EMAIL_NOT_VERIFIED");
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
    }

    /*
     A SUSPENDED (banned) account signing in. Like DisabledException this is an
     AuthenticationException, so without its own handler the student would be
     told their password is wrong and keep retrying.
    */
    @ExceptionHandler(LockedException.class)
    public ResponseEntity<Map<String, Object>> handleSuspended(LockedException ex) {
        Map<String, Object> body = base(HttpStatus.FORBIDDEN,
                "Your account has been suspended. Contact campus support.");
        body.put("code", "ACCOUNT_SUSPENDED");
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
    }

    /* A temporary failure with a message written for the user (email not sent, tunnel down). */
    @ExceptionHandler(ServiceUnavailableException.class)
    public ResponseEntity<Map<String, Object>> handleUnavailable(ServiceUnavailableException ex) {
        return build(HttpStatus.SERVICE_UNAVAILABLE, ex.getMessage());
    }

    /*
     Any other IllegalStateException is an internal fault whose message may name
     paths, algorithms or ids, so it is logged and never echoed.
    */
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalState(IllegalStateException ex) {
        log.error("Unhandled IllegalStateException", ex);
        return build(HttpStatus.SERVICE_UNAVAILABLE, "Something went wrong on our side. Please try again shortly.");
    }

    @ExceptionHandler(TooManyRequestsException.class)
    public ResponseEntity<Map<String, Object>> handleTooMany(TooManyRequestsException ex) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.getRetryAfterSeconds()))
                .body(base(HttpStatus.TOO_MANY_REQUESTS, ex.getMessage()));
    }

    /* Unreadable JSON, a wrong type in a path variable or query parameter: the client's mistake. */
    @ExceptionHandler({HttpMessageNotReadableException.class, TypeMismatchException.class})
    public ResponseEntity<Map<String, Object>> handleUnreadable(Exception ex) {
        return build(HttpStatus.BAD_REQUEST, "The request could not be read.");
    }

    /*
     409, not 400: the request was well formed, it just lost a race - the listing
     was bought by someone else, or this transaction was already confirmed. The
     code tells the frontend which message to show.
    */
    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<Map<String, Object>> handleConflict(ConflictException ex) {
        Map<String, Object> body = base(HttpStatus.CONFLICT, ex.getMessage());
        body.put("code", ex.getCode());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    @ExceptionHandler(InsufficientFundsException.class)
    public ResponseEntity<Map<String, Object>> handleInsufficientFunds(InsufficientFundsException ex) {
        Map<String, Object> body = base(HttpStatus.CONFLICT,
                "You do not have enough in your wallet for this purchase.");
        body.put("code", "INSUFFICIENT_FUNDS");
        body.put("balance", ex.getBalance());
        body.put("required", ex.getRequired());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    /*
     Without this, an oversized upload produces Tomcat's HTML error page with a
     500 status. The frontend's safeJson() then shows that raw HTML to the
     student as the error message. Note this only reaches us if
     server.tomcat.max-swallow-size allows the rest of the body to be read -
     see application.properties.
    */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleTooLarge(MaxUploadSizeExceededException ex) {
        // CONTENT_TOO_LARGE, not PAYLOAD_TOO_LARGE - the latter is deprecated in Spring 7.
        return build(HttpStatus.CONTENT_TOO_LARGE, "That file is too large.");
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, Object>> handleAuthentication(AuthenticationException ex) {
        return build(HttpStatus.UNAUTHORIZED, "Invalid email or password");
    }

    // Before the generic AccessDeniedException handler: this one's message is meant for the moderator.
    @ExceptionHandler(ModerationDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleModerationDenied(ModerationDeniedException ex) {
        return build(HttpStatus.FORBIDDEN, ex.getMessage());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex) {
        return build(HttpStatus.FORBIDDEN, "You are not allowed to perform this action");
    }

    /*
     Catch-all. Spring's own MVC exceptions (404 no handler, 405, 415, missing
     parameter...) implement ErrorResponse and keep their status; everything else
     is a bug, logged in full and reported as a bare 500.
    */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnexpected(Exception ex) {
        if (ex instanceof ErrorResponse errorResponse) {
            HttpStatus status = HttpStatus.resolve(errorResponse.getStatusCode().value());
            if (status == null) {
                status = HttpStatus.BAD_REQUEST;
            }
            return ResponseEntity.status(status)
                    .headers(errorResponse.getHeaders())
                    .body(base(status, status.getReasonPhrase()));
        }
        log.error("Unhandled exception", ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong on our side. Please try again.");
    }

    private ResponseEntity<Map<String, Object>> build(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(base(status, message));
    }

    private Map<String, Object> base(HttpStatus status, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message);
        return body;
    }

}
