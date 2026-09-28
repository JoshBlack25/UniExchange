/*
 SchemaPatchRunner.java

 Small, idempotent schema fixes that spring.jpa.hibernate.ddl-auto=update cannot
 make on its own.

 role.name: Hibernate created it as a native MySQL ENUM listing the RoleType
 values that existed at the time. ddl-auto=update never alters an existing
 column, so inserting the newer MODERATOR role would fail with "Data truncated".
 This converts the column to varchar once; on every later start the check finds
 varchar and does nothing. H2 (the test database) is skipped entirely.

 Runs before RoleBootstrapRunner (lower order), which may insert MODERATOR.

 Author: Mogamat Yaseen Kannemeyer 240453182
 Date: 24 September 2026
*/

package za.ac.cput.config;

import java.util.List;

import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Order(1)
public class SchemaPatchRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SchemaPatchRunner.class);

    private final JdbcTemplate jdbc;
    private final DataSource dataSource;

    public SchemaPatchRunner(JdbcTemplate jdbc, DataSource dataSource) {
        this.jdbc = jdbc;
        this.dataSource = dataSource;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            if (!isMySql()) {
                return;
            }
            List<String> types = this.jdbc.queryForList("""
                    SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'role' AND COLUMN_NAME = 'name'
                    """, String.class);
            if (!types.isEmpty() && "enum".equalsIgnoreCase(types.get(0))) {
                this.jdbc.execute("ALTER TABLE `role` MODIFY `name` VARCHAR(20) NOT NULL");
                log.info("Schema patch: converted role.name from ENUM to VARCHAR(20)");
            }
        }
        catch (RuntimeException | java.sql.SQLException ex) {
            // Never block startup over this; the MODERATOR insert will then fail
            // loudly and the log line above explains why.
            log.error("Schema patch for role.name failed: {}", ex.getMessage(), ex);
        }
    }

    private boolean isMySql() throws java.sql.SQLException {
        try (var connection = this.dataSource.getConnection()) {
            return connection.getMetaData().getDatabaseProductName().toLowerCase().contains("mysql");
        }
    }

}
