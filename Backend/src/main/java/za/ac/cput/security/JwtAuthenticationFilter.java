/*
 JwtAuthenticationFilter.java

 Reads "Authorization: Bearer <token>" off each request, verifies it, and populates
 the SecurityContext. Runs once per request, before UsernamePasswordAuthenticationFilter.

 A bad or expired token is not an error here - the context is simply left empty and
 the authorization rules in SecurityConfig decide what happens next.

 Three checks run on every request, not just at login, so that moderator actions
 take effect immediately rather than when the token happens to expire:

   account status  - a SUSPENDED user gets 403 ACCOUNT_SUSPENDED; any other
                     non-ACTIVE account is treated as signed out.
   credentials     - a token issued before the password was reset or the account
                     was locked (User.credentialsChangedAt) is ignored.
   session mode    - ROLE_MODERATOR / ROLE_ADMIN are only granted when the token
                     was minted through the moderator/admin sign-in AND the
                     database still holds the role. See SessionMode.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 04 September 2026
*/

package za.ac.cput.security;

import java.io.IOException;
import java.time.Instant;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import za.ac.cput.domain.enums.AccountStatus;
import za.ac.cput.domain.identity.User;
import za.ac.cput.security.UniExchangeUserDetailsService.AuthenticatedUser;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String HEADER = "Authorization";
    private static final String PREFIX = "Bearer ";

    static final String MODE_CLAIM = "mode";
    private static final String ROLE_MODERATOR = "ROLE_MODERATOR";
    private static final String ROLE_ADMIN = "ROLE_ADMIN";

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    public JwtAuthenticationFilter(JwtService jwtService, UserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String header = request.getHeader(HEADER);
        if (header == null || !header.startsWith(PREFIX)
                || SecurityContextHolder.getContext().getAuthentication() != null) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            Claims claims = this.jwtService.parseClaims(header.substring(PREFIX.length()));
            AuthenticatedUser loaded =
                    (AuthenticatedUser) this.userDetailsService.loadUserByUsername(claims.getSubject());
            User user = loaded.getUser();

            if (user.getAccountStatus() == AccountStatus.SUSPENDED) {
                writeSuspended(response);
                return;
            }
            if (user.getAccountStatus() != AccountStatus.ACTIVE || issuedBeforeCredentialChange(claims, user)) {
                SecurityContextHolder.clearContext();
                filterChain.doFilter(request, response);
                return;
            }

            SessionMode mode = SessionMode.parse(claims.get(MODE_CLAIM));
            AuthenticatedUser principal = new AuthenticatedUser(
                    user, effectiveAuthorities(loaded, mode), mode);

            UsernamePasswordAuthenticationToken authentication =
                    UsernamePasswordAuthenticationToken.authenticated(principal, null, principal.getAuthorities());
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);
        }
        catch (JwtException | UsernameNotFoundException | IllegalArgumentException | ClassCastException ex) {
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }

    /*
     Database roles, minus the elevated ones, plus whatever the session mode
     unlocks. An ADMIN session also counts as a MODERATOR session, so every
     /api/moderation endpoint works for admins without listing both roles.
    */
    private static List<GrantedAuthority> effectiveAuthorities(AuthenticatedUser loaded, SessionMode mode) {
        boolean dbModerator = false;
        boolean dbAdmin = false;
        List<GrantedAuthority> authorities = new ArrayList<>();

        for (GrantedAuthority authority : loaded.getAuthorities()) {
            String name = authority.getAuthority();
            if (ROLE_ADMIN.equals(name)) {
                dbAdmin = true;
            }
            else if (ROLE_MODERATOR.equals(name)) {
                dbModerator = true;
            }
            else {
                authorities.add(authority);
            }
        }

        if (mode == SessionMode.ADMIN && dbAdmin) {
            authorities.add(new SimpleGrantedAuthority(ROLE_ADMIN));
            authorities.add(new SimpleGrantedAuthority(ROLE_MODERATOR));
        }
        else if (mode == SessionMode.MODERATOR && (dbModerator || dbAdmin)) {
            authorities.add(new SimpleGrantedAuthority(ROLE_MODERATOR));
        }
        return authorities;
    }

    /*
     Prefers the millisecond iatMs claim. Tokens minted before it existed only
     carry the whole-second iat, so those are compared at second precision.
    */
    private static boolean issuedBeforeCredentialChange(Claims claims, User user) {
        if (user.getCredentialsChangedAt() == null) {
            return false;
        }
        Instant changedAt = user.getCredentialsChangedAt().atZone(ZoneId.systemDefault()).toInstant();

        Object millis = claims.get(JwtService.ISSUED_AT_MILLIS_CLAIM);
        if (millis instanceof Number number) {
            return Instant.ofEpochMilli(number.longValue()).isBefore(changedAt.truncatedTo(ChronoUnit.MILLIS));
        }
        if (claims.getIssuedAt() == null) {
            return true;
        }
        return claims.getIssuedAt().toInstant().isBefore(changedAt.truncatedTo(ChronoUnit.SECONDS));
    }

    private static void writeSuspended(HttpServletResponse response) throws IOException {
        SecurityContextHolder.clearContext();
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("""
                {"status":403,"error":"Forbidden","code":"ACCOUNT_SUSPENDED",\
                "message":"Your account has been suspended. Contact campus support."}""");
    }

}
