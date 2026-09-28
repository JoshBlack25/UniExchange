-- uploaded_file: who uploaded each file under app.uploads.dir (see LocalFileStorage).
--
-- Locally, spring.jpa.hibernate.ddl-auto=update creates this table for you.
-- Production runs with ddl-auto=validate (application-prod.properties), which
-- refuses to start if the table is missing - run this ONCE against the production
-- database before deploying the build that introduces it. Safe to re-run.
--
-- Files uploaded before this table existed have no row. They keep displaying,
-- but cannot be attached to a new listing/post and are never deleted from disk
-- automatically (ownership cannot be proven).

CREATE TABLE IF NOT EXISTS uploaded_file (
    filename       VARCHAR(64)  NOT NULL,
    owner_user_id  BIGINT       NOT NULL,
    content_type   VARCHAR(50)  NOT NULL,
    size_bytes     BIGINT       NOT NULL,
    created_at     DATETIME(6)  NOT NULL,
    PRIMARY KEY (filename),
    INDEX idx_uploaded_file_owner_created (owner_user_id, created_at)
);
