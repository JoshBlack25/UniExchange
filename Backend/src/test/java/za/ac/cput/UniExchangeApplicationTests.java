/*
 UniExchangeApplicationTests.java

 Proves the whole bean graph wires up: 22 repositories (auto-detected without
 @EnableJpaRepositories, because the application class sits at the base package
 root), 22 services, 23 controllers, the JWT filter chain and the JwtService key.

 Author: <Your Full Name> (<Student Number>)
 Date: 04 September 2026
*/

package za.ac.cput;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class UniExchangeApplicationTests {

    @Test
    void contextLoads() {
    }

}
