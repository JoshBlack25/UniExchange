# UniExchange

A campus marketplace platform for buying, selling, and exchanging goods and services within the university community. Built as a group project by students of the Cape Peninsula University of Technology (CPUT).

**Current status:** the backend domain layer is implemented and compiling; the frontend is scaffolded but not yet documented (see [Roadmap](#roadmap)).

## Table of Contents

- [Project Structure](#project-structure)
- [Backend](#backend)
  - [Tech Stack](#tech-stack)
  - [Getting Started](#getting-started)
  - [Domain Model](#domain-model)
  - [Utilities](#utilities)
  - [Testing](#testing)
- [Database](#database)
- [Git Workflow](#git-workflow)
- [Team](#team)
- [Roadmap](#roadmap)

---

## Project Structure

```
UniExchange/
├── Backend/     → Spring Boot REST API (see below)
└── Frontend/    → Web frontend (scaffolded with React + Vite — details coming soon)
```

## Backend

Spring Boot REST API for the UniExchange platform. The complete domain layer — all entities and enums mapped to the MySQL schema — is in place and compiles cleanly.

### Tech Stack

| Component     | Choice                                                        |
|---------------|---------------------------------------------------------------|
| Language      | Java 25                                                       |
| Framework     | Spring Boot 4.1.1                                             |
| Build tool    | Maven (wrapper included: `mvnw` / `mvnw.cmd`)                 |
| Persistence   | Spring Data JPA / Hibernate                                   |
| Database      | MySQL 8 (schema designed in MySQL Workbench)                  |
| Validation    | Jakarta Bean Validation + Apache Commons Validator            |
| Testing       | JUnit 5, Spring Boot Test (H2 in-memory for tests)            |

**Dependencies** (`Backend/pom.xml`): `spring-boot-starter`, `spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `spring-boot-starter-validation`, `mysql-connector-j`, `commons-validator`, `spring-boot-starter-test`, `h2` (test scope). Security (Spring Security + OAuth2 Resource Server), Swagger (springdoc 3.x), and dev helpers are listed in `pom.xml` as commented-out placeholders for later milestones.

### Getting Started

**Prerequisites:** JDK 17+ (Java 25 recommended), Maven (or use the bundled wrapper), MySQL 8.

```bash
# From the Backend/ directory

# Run the application
./mvnw spring-boot:run          # Windows: .\mvnw.cmd spring-boot:run

# Run the tests
./mvnw test

# Run the DomainTest runner (builds every entity + validates with Helper)
./mvnw org.codehaus.mojo:exec-maven-plugin:3.5.0:java \
  -Dexec.mainClass=za.ac.cput.DomainTest
```

The main class is `za.ac.cput.backend.BackendApplication` (`@SpringBootApplication` with component + entity scanning across `za.ac.cput`).

### Domain Model

The `domain` package contains **22 entities + 13 enums (35 classes)** under `Backend/src/main/java/za/ac/cput/domain/`, grouped to mirror the database schema:

| Package          | Entities                                                                  |
|------------------|---------------------------------------------------------------------------|
| `identity`       | Campus, Role, User, UserRole, Verification                                |
| `marketplace`    | Category, Listing, ListingImage                                           |
| `communication`  | Conversation, ConversationParticipant, Message, Notification              |
| `trust`          | Review, Report, VendorApplication, TrustedSellerBadge                     |
| `transactions`   | Transaction, Payment, Wallet, WalletTransaction                           |
| `community`      | BulletinPost                                                              |
| `admin`          | AuditLog                                                                  |
| `enums`          | 13 enums matching the MySQL `ENUM` columns (e.g. `RoleType`, `AccountStatus`, `TransactionStatus`) |

All entities follow a consistent CPUT-style pattern: `@Entity` mapping with `@Table`/`@Column`, a protected no-arg constructor (required by JPA), a private `Builder` constructor, getters, `toString`, and a nested fluent `Builder` class with `copy()` and `build()`.

### Utilities

`za.ac.cput.util.Helper` — static validation helpers covering the domain's actual attribute types: `isNullOrEmpty`, `isValidEmail`, `isValidMobileNumber`, `isValidPassword`, `isValidObject`, `isValidId`, `isValidBigDecimal`, `isValidRating`, `isValidCurrency`, `isValidUrl`.

### Testing

- `BackendApplicationTests` — Spring context load test (H2 in-memory).
- `DomainTest` (`za.ac.cput.DomainTest`) — a plain-Java `main` runner that builds all 22 entities with sample data and validates them through `Helper`; run from the terminal or directly in the IDE.

## Database

The database schema is designed in MySQL Workbench as the **`uniexchange`** database (MySQL 8, `utf8mb4`): **22 tables** across identity, marketplace, communication, trust, transactions, community, and admin domains, with foreign keys, indexes, and CHECK constraints for business rules (e.g. rating 1–5, non-negative money, buyer ≠ seller). The creation script (`uniexchange_schema.sql`) is maintained with the project design documentation and is yet to be committed to the repo.

> Note: `application.properties` currently only sets the application name. Wiring the datasource to `jdbc:mysql://localhost:3306/uniexchange` (with `ddl-auto=validate`) is a planned next step.

## Git Workflow

- `main` is the integration branch — **never commit to it directly**.
- Each team member works on their own branch, named `initials-studentNumber` (e.g. `JRA-230317693`).
- Completed work is merged into `main` via a **pull request** reviewed by a teammate.
- Before opening a PR, pull the latest `main` and merge it into your branch to avoid conflicts.

## Team

| Name                    | Student Number | Branch            |
|-------------------------|----------------|-------------------|
| Aidan Barends           | 230255639      | `AB-230255639`    |
| Joshua Reid Adams       | 230317693      | `JRA-230317693`   |
| Raul Ja'aim Everts      | 230270565      | `RJE-230270565`   |
| Mogamat Yaseen Kannemeyer | 240453182    | `MYK-240453182`   |
| Mogamat Wazeer Gilbert  | 221374698      | `MWG-221374698`   |

## Roadmap

1. **Backend** — wire the MySQL datasource (`ddl-auto=validate`), then build upward in feature slices: `factory` → `repository` → `service` → `controller`, followed by authentication (Spring Security + JWT) and Swagger/OpenAPI docs.
2. **Frontend** — the React + Vite app in `Frontend/` will be documented here once frontend work begins.