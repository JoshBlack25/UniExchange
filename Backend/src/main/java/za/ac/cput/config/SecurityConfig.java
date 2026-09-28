/*
 SecurityConfig.java

 Stateless JWT security for Spring Security 7 (shipped with Spring Boot 4).

 Three Boot 3 idioms that no longer work here, for future reference:
   - DaoAuthenticationProvider has no no-arg constructor and no
     setUserDetailsService(); the UserDetailsService is constructor-injected.
   - HttpSecurity.build() no longer declares "throws Exception", so the
     SecurityFilterChain bean needs no throws clause.
   - Only the Customizer lambda overloads exist - there is no .and() chaining.

 @EnableWebSecurity is deliberately absent: Boot 4's ServletWebSecurityAutoConfiguration
 already applies it.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 04 September 2026
*/

package za.ac.cput.config;

import java.util.Arrays;
import java.util.List;

import jakarta.servlet.DispatcherType;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import za.ac.cput.security.JwtAuthenticationFilter;
import za.ac.cput.security.JwtService;
import za.ac.cput.security.RateLimitFilter;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    /* API responses are JSON or images, never documents: nothing may load, run or frame. */
    static final String API_CSP = "default-src 'none'; frame-ancestors 'none'";
    static final String PERMISSIONS_POLICY = "camera=(), microphone=(), geolocation=()";

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final RateLimitFilter rateLimitFilter;
    private final String allowedOrigins;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter,
                          JwtService jwtService,
                          @Value("${app.cors.allowed-origins:http://localhost:5173}") String allowedOrigins,
                          @Value("${app.rate-limit.enabled:true}") boolean rateLimitEnabled) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.rateLimitFilter = new RateLimitFilter(jwtService, rateLimitEnabled);
        this.allowedOrigins = allowedOrigins;
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                /*
                 CSRF protection is off deliberately, not by omission. CSRF works by
                 making the victim's browser send a credential it attaches
                 automatically - a cookie. This API authenticates only with a Bearer
                 token in the Authorization header, which a browser never adds on its
                 own, so a forged cross-site request arrives unauthenticated. Revisit
                 this if a session or auth cookie is ever introduced.
                */
                .csrf(csrf -> csrf.disable())
                /*
                 Sent on every response through this chain - which is every response,
                 including the /uploads/** files WebConfig serves.
                 HSTS is only written on HTTPS requests (Azure terminates TLS and
                 server.forward-headers-strategy marks the request secure).
                */
                .headers(headers -> headers
                        .contentTypeOptions(Customizer.withDefaults())
                        .frameOptions(frame -> frame.deny())
                        .httpStrictTransportSecurity(hsts -> hsts
                                .includeSubDomains(true)
                                .maxAgeInSeconds(31_536_000))
                        .referrerPolicy(referrer -> referrer
                                .policy(ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                        .permissionsPolicyHeader(permissions -> permissions.policy(PERMISSIONS_POLICY))
                        .contentSecurityPolicy(csp -> csp.policyDirectives(API_CSP)))
                .httpBasic(basic -> basic.disable())
                .formLogin(form -> form.disable())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // Without this a request carrying no (or a bad) token gets 403 from the
                // default Http403ForbiddenEntryPoint. For a REST API 401 is correct:
                // "you are not authenticated", leaving 403 to mean "authenticated but
                // not permitted".
                .exceptionHandling(ex -> ex.authenticationEntryPoint(
                        new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .authorizeHttpRequests(auth -> auth
                        // Access denial calls response.sendError, which re-enters this
                        // filter chain as an ERROR dispatch to /error. That dispatch
                        // carries no authentication, so without this line the entry
                        // point above would overwrite every 403 with a 401.
                        .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                        // These live under /api/auth but act on the caller's own
                        // session, so they must come before the permitAll below.
                        .requestMatchers(HttpMethod.POST,
                                "/api/auth/elevate",
                                "/api/auth/step-down",
                                "/api/auth/change-password").authenticated()
                        .requestMatchers("/api/auth/**").permitAll()
                        /*
                         Moderation. ROLE_MODERATOR / ROLE_ADMIN are only granted to a
                         session opened through the moderator/admin sign-in (see
                         JwtAuthenticationFilter), so a moderator browsing normally
                         cannot reach these. An admin session carries both roles.
                        */
                        .requestMatchers("/api/moderation/**").hasRole("MODERATOR")
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        /*
                         Generic identity CRUD. These take roles, password hashes and
                         account statuses straight from the request body, so while they
                         were merely "authenticated" any student could make themselves
                         ADMIN. Only a public profile read stays open.
                        */
                        .requestMatchers("/api/roles/**", "/api/user-roles/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/users/{id}").authenticated()
                        .requestMatchers("/api/users/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET,
                                "/api/listings/**",
                                "/api/listing-images/**",
                                "/api/profile-photos/*",
                                "/api/categories/**",
                                "/api/campuses/**",
                                "/api/bulletin-posts/**",
                                "/api/bulletin-post-images/**",
                                "/uploads/**",
                                // A seller's rating and badge are shown on every listing card
                                // and on public profiles, so they must be readable signed-out.
                                // Writing a review is POST, which falls through to the
                                // ADMIN/authenticated rules below.
                                "/api/reviews/reviewee/**",
                                "/api/trusted-seller-badges/user/**").permitAll()
                        // Reference data: anyone may read it (above), only an admin may change it.
                        .requestMatchers("/api/campuses/**", "/api/categories/**").hasRole("ADMIN")
                        /*
                         Vendor applications. Applying and reading your own are for any
                         signed-in student (VendorApplicationController forces the
                         applicant to the caller and hides other people's). Listing,
                         editing, deleting and deciding are moderator work.
                        */
                        .requestMatchers(HttpMethod.POST, "/api/vendor-applications").authenticated()
                        .requestMatchers(HttpMethod.GET,
                                "/api/vendor-applications/mine",
                                "/api/vendor-applications/{id}").authenticated()
                        .requestMatchers("/api/vendor-applications/**").hasRole("MODERATOR")
                        /*
                         Chat attachments. permitAll here is not "public": <img>, <audio>
                         and <video> cannot send an Authorization header, so a filter-chain
                         rule would 401 every media tag on the page. ChatMediaController
                         instead verifies an HMAC signature bound to (mediaId, viewerId,
                         expiry) AND re-checks conversation participation on every request,
                         which is strictly stronger than "any signed-in student".
                        */
                        .requestMatchers(HttpMethod.GET, "/api/chat/media/**").permitAll()
                        /*
                         PayFast's server-to-server callback carries no JWT. Without this it
                         would 401 on every delivery, PayFast would retry forever, and no
                         top-up would ever be credited. The handler authenticates the caller
                         itself: signature, source IP, and a confirmation POST back to PayFast.
                        */
                        .requestMatchers(HttpMethod.POST, "/api/payfast/itn").permitAll()
                        // The audit trail is append-only: nobody, not even an admin, rewrites history.
                        .requestMatchers(HttpMethod.PUT, "/api/audit-logs/**").denyAll()
                        .requestMatchers(HttpMethod.PATCH, "/api/audit-logs/**").denyAll()
                        .requestMatchers(HttpMethod.DELETE, "/api/audit-logs/**").denyAll()
                        .requestMatchers("/api/audit-logs/**").hasRole("ADMIN")
                        /*
                         Reports: anyone signed in may file one (the controller records the
                         caller as reporter). Everything else - reading, editing, deleting,
                         resolving - is moderator work, or a reported student could delete
                         the report against them.
                        */
                        .requestMatchers(HttpMethod.POST, "/api/reports").authenticated()
                        .requestMatchers("/api/reports/**").hasRole("MODERATOR")
                        // OTP rows are written only by OtpService. There is no controller;
                        // this is a backstop so a future one cannot be reachable by accident.
                        .requestMatchers("/api/verifications/**").denyAll()
                        /*
                         The generic CRUD controllers for money, chat and trust are ADMIN-only.
                         They take ids straight from the request body with no ownership check,
                         so while merely "authenticated" any student could credit their own
                         wallet, read anyone's private messages, forge reviews or grant
                         themselves a Trusted Seller badge.

                         Real use goes through the authorization-aware flow controllers
                         instead: /api/chat, /api/wallet, /api/purchases, and POST /api/reviews.
                         Keep new endpoints out of these prefixes.
                        */
                        .requestMatchers("/api/wallets/**",
                                "/api/wallet-transactions/**",
                                "/api/payments/**",
                                "/api/transactions/**",
                                "/api/conversations/**",
                                "/api/conversation-participants/**",
                                "/api/messages/**",
                                "/api/trusted-seller-badges/**").hasRole("ADMIN")
                        // Reviews: anyone signed in may POST one (ReviewController checks they
                        // were party to a COMPLETED transaction); editing and deleting are
                        // for moderators (an admin session also holds ROLE_MODERATOR).
                        .requestMatchers(HttpMethod.PUT, "/api/reviews/**").hasRole("MODERATOR")
                        .requestMatchers(HttpMethod.DELETE, "/api/reviews/**").hasRole("MODERATOR")
                        // Notifications are created by the server (NotificationPublisher),
                        // never by a client; reading and mark-read are owner-checked in
                        // NotificationController.
                        .requestMatchers(HttpMethod.POST, "/api/notifications").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/notifications/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/notifications/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/notifications").hasRole("ADMIN")
                        .anyRequest().authenticated())
                .addFilterBefore(this.jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                // Before the JWT filter, so a flood is turned away before any user is loaded.
                .addFilterBefore(this.rateLimitFilter, JwtAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // Declaring this bean makes Boot's UserDetailsServiceAutoConfiguration back off,
    // so the random generated password no longer appears at startup.
    //
    // The DaoAuthenticationProvider is built here rather than exposed as its own
    // @Bean on purpose: an AuthenticationProvider bean makes Spring Security log a
    // warning that the UserDetailsService bean will be ignored for global auth,
    // which is misleading - it is wired straight into the provider below.
    //
    // Note the Security 7 signature: UserDetailsService is constructor-injected.
    // setUserDetailsService() was removed and there is no no-arg constructor.
    @Bean
    AuthenticationManager authenticationManager(UserDetailsService userDetailsService,
                                                PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return new ProviderManager(provider);
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.stream(this.allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toList());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        /*
         Range is here so a range-aware fetch() stays possible. Media elements
         (<img>/<audio>/<video> without crossorigin) issue no-CORS requests and are
         unaffected either way, but the moment anything reads media through fetch or
         adds crossorigin="anonymous", a missing Range entry turns into a preflight
         403 with an unhelpful console message. The exposed range headers are what
         let script see Content-Range/Accept-Ranges on the response.
        */
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Range"));
        config.setExposedHeaders(List.of("Authorization", "Accept-Ranges", "Content-Range", "Content-Length", "Retry-After"));
        // No cookies are used (Bearer tokens only), so credentialed CORS is not needed.
        config.setAllowCredentials(false);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

}
