/*
 RateLimitFilterTest.java

 The limiter on its own, with mock requests - the Spring context switches it off
 (app.rate-limit.enabled=false in test properties) because MockMvc sends every
 request from 127.0.0.1.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 25 September 2026
*/

package za.ac.cput.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import jakarta.servlet.ServletException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class RateLimitFilterTest {

    private JwtService jwtService;
    private RateLimitFilter filter;

    @BeforeEach
    void setUp() {
        this.jwtService = new JwtService("rate-limit-test-secret-that-is-long-enough-for-hs256", 3600, 604800, 3600);
        this.filter = new RateLimitFilter(this.jwtService, true);
    }

    private MockHttpServletResponse send(MockHttpServletRequest request) throws ServletException, IOException {
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();
        this.filter.doFilter(request, response, chain);
        return response;
    }

    private static MockHttpServletRequest login(String ip, String email) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
        request.setRemoteAddr(ip);
        request.setContentType("application/json");
        request.setContent("{\"email\":\"%s\",\"password\":\"x\"}".formatted(email).getBytes(StandardCharsets.UTF_8));
        return request;
    }

    @Test
    void theSixthLoginInAMinuteIsRefusedWithRetryAfter() throws Exception {
        for (int i = 0; i < 5; i++) {
            assertEquals(200, send(login("10.0.0.1", "111@mycput.ac.za")).getStatus());
        }
        MockHttpServletResponse refused = send(login("10.0.0.1", "111@mycput.ac.za"));

        assertEquals(429, refused.getStatus());
        assertNotNull(refused.getHeader("Retry-After"));
        assertTrue(refused.getContentAsString().contains("\"status\":429"));
    }

    @Test
    void anotherStudentBehindTheSameIpIsNotLockedOut() throws Exception {
        for (int i = 0; i < 6; i++) {
            send(login("10.0.0.2", "222@mycput.ac.za"));
        }
        assertEquals(200, send(login("10.0.0.2", "333@mycput.ac.za")).getStatus());
    }

    @Test
    void theControllerStillReceivesTheBody() throws Exception {
        MockHttpServletRequest request = login("10.0.0.3", "444@mycput.ac.za");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        this.filter.doFilter(request, response, chain);

        String forwarded = new String(chain.getRequest().getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        assertTrue(forwarded.contains("444@mycput.ac.za"), forwarded);
    }

    @Test
    void walletCallsAreLimitedPerUserNotPerIp() throws Exception {
        String token = "Bearer " + this.jwtService.generateToken("555@mycput.ac.za", Map.of("uid", 555L));
        for (int i = 0; i < 10; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/wallet/transfer");
            request.setRemoteAddr("10.0.0." + (10 + i)); // a different address every time
            request.addHeader("Authorization", token);
            assertEquals(200, send(request).getStatus());
        }
        MockHttpServletRequest eleventh = new MockHttpServletRequest("POST", "/api/wallet/transfer");
        eleventh.setRemoteAddr("10.0.0.99");
        eleventh.addHeader("Authorization", token);
        assertEquals(429, send(eleventh).getStatus());
    }

    @Test
    void imagesAndPreflightsAreNotCounted() throws Exception {
        for (int i = 0; i < 200; i++) {
            MockHttpServletRequest image = new MockHttpServletRequest("GET", "/uploads/x.png");
            image.setRemoteAddr("10.0.0.4");
            assertEquals(200, send(image).getStatus());
        }
    }

    @Test
    void aDisabledFilterPassesEverything() throws Exception {
        this.filter = new RateLimitFilter(this.jwtService, false);
        for (int i = 0; i < 10; i++) {
            assertEquals(200, send(login("10.0.0.5", "666@mycput.ac.za")).getStatus());
        }
    }

}
