# UniExchange

A campus marketplace platform for buying, selling, and exchanging goods and services within the university community. Built as a group project by students of the Cape Peninsula University of Technology (CPUT).

Unlike Facebook Marketplace or Gumtree, UniExchange is closed to the public: only someone who can prove they hold a `@mycput.ac.za` mailbox can create an account, which is what keeps listings campus-relevant and cuts down on scams.

**Current status:** the backend is fully layered with Spring Security + JWT, and verified-student authentication (signup → email OTP → login) works end to end. The frontend implements those three screens plus a placeholder dashboard. Marketplace features are next.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Configuration Reference](#configuration-reference)
- [Email / OTP Delivery](#email--otp-delivery)
- [Backend](#backend)
- [Frontend](#frontend)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Database](#database)
- [Git Workflow](#git-workflow)
- [Team](#team)
- [Roadmap](#roadmap)

---

## Tech Stack

### Backend

| Component      | Choice                                                             |
|----------------|--------------------------------------------------------------------|
| Language       | Java 25                                                            |
| Framework      | Spring Boot 4.1.1 (Spring Framework 7.0.9)                         |
| Build tool     | Maven, via the bundled wrapper (`mvnw` / `mvnw.cmd`, Maven 3.9.16) |
| Persistence    | Spring Data JPA / Hibernate 7.4                                    |
| Database       | MySQL 8+ (9.x works; schema designed in MySQL Workbench)           |
| Security       | Spring Security 7.1 + JWT (`jjwt` 0.13, HS256)                     |
| Password hash  | BCrypt                                                             |
| Email          | Spring Mail (Jakarta Mail / Angus) for OTP delivery                |
| Validation     | Jakarta Bean Validation + Apache Commons Validator                 |
| Testing        | JUnit 5, Spring Boot Test, H2 in-memory                            |

### Frontend

| Component      | Choice                                                        |
|----------------|---------------------------------------------------------------|
| Framework      | React 19.2                                                    |
| Language       | TypeScript 6                                                  |
| Build tool     | Vite 8                                                        |
| Routing        | react-router-dom 7                                            |
| Styling        | Tailwind CSS v4 (CSS-first config, no `tailwind.config.js`)   |
| Forms          | react-hook-form 7 + zod 4 (`@hookform/resolvers`)             |
| HTTP           | native `fetch`, wrapped in `src/lib/api.ts`                   |
| Linting        | ESLint 10 (flat config) + typescript-eslint                   |

No component library and no HTTP client dependency — the API surface is small enough that `fetch` behind one wrapper is enough.

## Project Structure

```
UniExchange/
├── Backend/     → Spring Boot REST API      (runs on :8080)
├── Frontend/    → React + TypeScript client (runs on :5173)
└── README.md    → this file
```

## Prerequisites

Four things need to be installed. Check each before starting.

### 1. A JDK, version 25 or newer

The project compiles with `--release 25`, so **JDK 25 is the minimum**. JDK 26 also works.

```bash
java -version          # e.g. openjdk version "25.0.2"
echo $JAVA_HOME        # macOS/Linux
echo %JAVA_HOME%       # Windows cmd
```

**Maven uses `JAVA_HOME`, not whatever `java` is on your `PATH`** — if those two disagree, the build follows `JAVA_HOME`. If you have several JDKs installed:

```bash
# macOS - list every installed JDK
/usr/libexec/java_home -V

# macOS/Linux - point this shell at JDK 25
export JAVA_HOME=$(/usr/libexec/java_home -v 25)

# Windows PowerShell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-25"
```

If `java -version` reports 24 or lower, install JDK 25+ from [Adoptium](https://adoptium.net/) or [jdk.java.net](https://jdk.java.net/) first. Otherwise the build fails with `invalid target release: 25`.

### 2. Node.js 20.19+ or 22.12+

Required by Vite 8. Node 24 LTS is a safe choice.

```bash
node -v    # must be >= 20.19, or >= 22.12
npm -v
```

Get it from [nodejs.org](https://nodejs.org/).

### 3. MySQL server, version 8 or newer

**The backend will not start without it.** H2 is only on the test classpath, so it covers the test suite but cannot run the app.

```bash
mysql --version
```

If that command isn't found, install MySQL Community Server from [dev.mysql.com/downloads/mysql](https://dev.mysql.com/downloads/mysql/) — note the macOS installer puts it in `/usr/local/mysql/bin`, which is not on your `PATH` by default — or via Homebrew:

```bash
brew install mysql && brew services start mysql
```

MySQL Workbench is optional, but handy for inspecting the schema.

### 4. Maven — already included

Do **not** install Maven. Use the wrapper in `Backend/`. On macOS/Linux, make it executable once after cloning:

```bash
chmod +x Backend/mvnw
```

---

## Getting Started

### 1. Clone and branch

`main` is protected by team convention — never commit to it directly.

```bash
git clone <repo-url>
cd UniExchange
git checkout -b MYK-240453182     # your own initials-studentNumber
```

### 2. Set up MySQL

Make sure the server is running, then create the database. The app creates the **tables** itself (`ddl-auto=update`), but not the database.

```bash
mysql -u root -p
```

> **`zsh: command not found: mysql`?** The official macOS installer does not add
> MySQL to your `PATH`. Add it:
>
> ```bash
> export PATH="/usr/local/mysql/bin:$PATH"     # add to ~/.zshrc to keep it
> ```
>
> The **server** can be running perfectly well even when the `mysql` client is
> missing from `PATH` — check with `pgrep -fl mysqld`, or use MySQL Workbench, or
> System Settings → MySQL. Homebrew installs land in `/opt/homebrew/bin` instead
> and are already on `PATH`.

```sql
CREATE DATABASE IF NOT EXISTS uniexchange
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

The connection URL also passes `createDatabaseIfNotExist=true`, so this is belt-and-braces — but doing it explicitly makes failures easier to diagnose.

### 3. Configure your database password

**Do not type your password into `application.properties`.** That file is committed to git, so a password there gets shared with the whole team and pushed to GitHub. It reads from environment variables instead:

```properties
spring.datasource.username=${DB_USERNAME:root}
spring.datasource.password=${DB_PASSWORD:}
```

Pick whichever option suits how you run the app.

**Option A — environment variable** (works from the terminal):

```bash
# macOS/Linux; add to ~/.zshrc or ~/.bashrc to make it permanent
export DB_PASSWORD='your-mysql-password'

# Windows PowerShell
$env:DB_PASSWORD = "your-mysql-password"
```

**Option B — an untracked properties file** (easier in IntelliJ / VS Code, since you don't have to configure env vars in the run profile). Create `Backend/src/main/resources/application-local.properties`:

```properties
spring.datasource.password=your-mysql-password
```

Then run with `-Dspring-boot.run.profiles=local`. That filename is already in `.gitignore`, so it can never be committed.

> If your MySQL `root` account has no password, skip this step — the default is empty.

### 4. Run the backend

```bash
cd Backend
./mvnw spring-boot:run          # Windows: .\mvnw.cmd spring-boot:run
```

The first run downloads dependencies, so it needs internet and takes a minute. You should see `Started UniExchangeApplication`, 22 `create table` statements on a fresh database, and:

```
No spring.mail.host configured - verification emails will be logged, not sent.
```

That warning is expected and intentional — see [Email / OTP Delivery](#email--otp-delivery).

The API is now on **http://localhost:8080**. Quick check:

```bash
curl http://localhost:8080/api/listings     # -> []  (a public endpoint)
```

### 5. Run the frontend

In a **second terminal**:

```bash
cd Frontend
npm install                 # first time only
cp .env.example .env.local  # Windows: copy .env.example .env.local
npm run dev
```

Open **http://localhost:5173**.

`.env.local` only needs editing if your backend is not on port 8080:

```
VITE_API_BASE_URL=http://localhost:8080
```

No dev proxy is configured or needed — the backend already allows `http://localhost:5173` as a CORS origin.

### 6. Try it

1. Go to http://localhost:5173 → you are redirected to `/login`.
2. Click **Create an account** and sign up with a real student email such as `240453182@mycput.ac.za`. Anything else is rejected.
3. You land on the code screen. **The code is in the backend terminal**, in a box like this:

   ```
   ======================= EMAIL (NOT SENT) =======================
   To      : 240453182@mycput.ac.za
   Subject : Your UniExchange verification code
   ----------------------------------------------------------------
   Your UniExchange verification code is:

       429183
   ```

4. Type or paste those 6 digits → you are signed in and land on the dashboard.

---

## Configuration Reference

### Files you may need to edit

| File | When | Committed? |
|---|---|---|
| `Frontend/.env.local` | Backend on a non-default port | No (gitignored) |
| `Backend/src/main/resources/application-local.properties` | Your DB password, option B | No (gitignored) |
| `Backend/src/main/resources/application.properties` | Changing a setting **for the whole team** | **Yes — never put secrets here** |
| `Backend/src/test/resources/application.properties` | Test-only config (H2) | Yes |

### Backend properties worth knowing

In `Backend/src/main/resources/application.properties`:

| Property | Default | Notes |
|---|---|---|
| `spring.datasource.url` | `jdbc:mysql://localhost:3306/uniexchange` | `DB_NAME` overrides the database name |
| `spring.datasource.username` | `${DB_USERNAME:root}` | |
| `spring.datasource.password` | `${DB_PASSWORD:}` | Never hardcode |
| `spring.jpa.hibernate.ddl-auto` | `update` | Hibernate creates/updates tables on boot |
| `app.jwt.secret` | `${JWT_SECRET:change-me-...}` | **Must be ≥ 32 bytes** or startup fails |
| `app.jwt.ttl-seconds` | `3600` | One hour; there is no refresh endpoint |
| `app.auth.student-email-pattern` | `^\d{8,10}@mycput\.ac\.za$` | The signup gate |
| `app.otp.length` | `6` | |
| `app.otp.ttl-minutes` | `10` | |
| `app.otp.max-attempts` | `5` | After this the code is dead |
| `app.otp.resend-cooldown-seconds` | `60` | |
| `app.cors.allowed-origins` | `http://localhost:5173,http://localhost:3000` | Add your origin if you change the dev port |

Do not set `spring.jpa.properties.hibernate.dialect` — Hibernate 7 auto-detects it, and `MySQL8Dialect` no longer exists (only `org.hibernate.dialect.MySQLDialect`).

### Frontend environment

`Frontend/.env.local`, copied from `.env.example`:

| Variable | Default | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8080` | Where the API lives |
| `VITE_STUDENT_EMAIL_PATTERN` | `^\d{8,10}@mycput\.ac\.za$` | Mirrors the backend rule, for instant form feedback |

## Email / OTP Delivery

By default **no email is sent**. With `spring.mail.host` unset, the app logs every message instead. This is deliberate: the whole signup flow can be run and tested with no SMTP credentials, so every team member can work on it and the test suite never mails anyone.

To send real email, uncomment the SMTP block in `application.properties` and supply a **Gmail App Password** — not your Google account password. App Passwords require 2-Step Verification and are created at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).

```bash
export MAIL_USERNAME='you@gmail.com'
export MAIL_PASSWORD='xxxx xxxx xxxx xxxx'
```

Mail from Gmail into a university Microsoft tenant often lands in **Junk** — check there before assuming it failed.

> **Why an emailed code rather than "Sign in with Microsoft"?** Because the OTP is what actually proves the account is real: if `240453182@mycput.ac.za` isn't a genuine mailbox, the code never arrives, so the account can never be activated. Entra ID SSO would be a good addition later, but it needs an Azure app registration and CPUT's tenant admin can disable third-party consent at any time — so it can only ever be an extra door, not the only one. Note also that `mycput.ac.za` (students) and `cput.ac.za` (staff) are two separate Entra tenants.

## Backend

The main class is `za.ac.cput.UniExchangeApplication`. It sits at the base package root, so component scan, entity scan and Spring Data repository scan all root at `za.ac.cput` — no `scanBasePackages`, `@EntityScan` or `@EnableJpaRepositories` needed.

### Package layout

| Package | Contents |
|---|---|
| `domain/<subdomain>` | 22 JPA entities + 13 enums |
| `repository/<subdomain>` | Spring Data JPA repositories |
| `factory/<subdomain>` | The **only** construction path for entities, validated via `Helper` |
| `service` + `service/<subdomain>` | `IService<T, ID>` plus an interface + impl per entity |
| `controller/<subdomain>` | REST controllers, `AuthController`, `GlobalExceptionHandler` |
| `dto/<subdomain>`, `dto/auth` | Request/response records |
| `security` | `JwtService`, `JwtAuthenticationFilter`, `UniExchangeUserDetailsService` |
| `config` | `SecurityConfig`, `MailConfig` |
| `mail` | `EmailSender` plus SMTP and logging implementations |
| `validation` | The `@StudentEmail` constraint |
| `util` | `Helper` — all shared validation |

Sub-domains are consistent across every layer: `identity`, `marketplace`, `transactions`, `trust`, `communication`, `community`, `admin`.

Entities expose only a nested fluent `Builder` (with `copy()` and `build()`), a protected no-arg constructor for JPA, and getters — **no public setters**. Always construct through the matching factory.

### Domain model

| Package | Entities |
|---|---|
| `identity` | Campus, Role, User, UserRole, Verification |
| `marketplace` | Category, Listing, ListingImage |
| `communication` | Conversation, ConversationParticipant, Message, Notification |
| `trust` | Review, Report, VendorApplication, TrustedSellerBadge |
| `transactions` | Transaction, Payment, Wallet, WalletTransaction |
| `community` | BulletinPost |
| `admin` | AuditLog |
| `enums` | 13 enums matching the MySQL `ENUM` columns |

Foreign keys are modelled as plain scalar `long` columns (`Listing.sellerId`, not `Listing.seller`) — there are no JPA relationship annotations anywhere.

### Authentication endpoints

Only verified CPUT students can obtain a token.

| Endpoint | Purpose |
|---|---|
| `POST /api/auth/register` | Creates a `PENDING_VERIFICATION` account and emails a 6-digit code. **Returns 202 with no token.** |
| `POST /api/auth/verify-otp` | Exchanges a valid code for a JWT and sets the account `ACTIVE`. The only endpoint that issues a token. |
| `POST /api/auth/resend-otp` | New code, subject to the cooldown. Always 202, so registered student numbers cannot be enumerated. |
| `POST /api/auth/login` | Email + password. Unverified accounts get `403` with `code: "EMAIL_NOT_VERIFIED"`. |
| `GET /api/auth/me` | The authenticated user (`Authorization: Bearer <token>`). |

Codes are stored only as a BCrypt hash, expire in 10 minutes, and are capped at 5 attempts.

Every other entity has standard CRUD at `/api/<plural-name>` — e.g. `GET /api/listings`, `POST /api/campuses`. `GET` on listings, listing images, categories, campuses and bulletin posts is public; everything else needs a token; audit logs and reports are `ADMIN` only.

### Error format

```json
{
  "timestamp": "2026-09-04T21:08:18.648352",
  "status": 400,
  "error": "Bad Request",
  "message": "Request validation failed",
  "fields": { "email": "Use your CPUT student email, for example 240453182@mycput.ac.za" }
}
```

`fields` appears on bean-validation failures; `code` appears on `EMAIL_NOT_VERIFIED`.

## Frontend

See [`Frontend/README.md`](Frontend/README.md) for the full frontend guide.

```
Frontend/src/
├── main.tsx              BrowserRouter + AuthProvider
├── App.tsx               route table
├── index.css             Tailwind import + design tokens (@theme)
├── lib/                  api.ts (the only module that knows the backend), schemas.ts (zod)
├── auth/                 authContext.ts, AuthProvider.tsx, useAuth.ts, ProtectedRoute.tsx
├── components/           AuthLayout, Button, TextField, OtpInput, Alert, Logo
└── pages/                SignUpPage, VerifyOtpPage, LoginPage, DashboardPage
```

Routes: `/` redirects by auth state · `/signup` · `/verify` · `/login` · `/dashboard` (protected).

The JWT is kept in `localStorage` alongside its expiry. The backend issues a one-hour token and has no refresh endpoint, so an expired token is treated as signed out on load.

```bash
npm run dev       # dev server on :5173
npm run build     # type-check + production bundle into dist/
npm run lint
npx tsc -b        # type-check only
```

## Testing

### Backend — 67 tests, no MySQL or SMTP required

```bash
cd Backend
./mvnw test
```

Tests run against **H2 in-memory** using `src/test/resources/application.properties`, so they need neither a database server nor mail credentials.

| Test | Covers |
|---|---|
| `UniExchangeApplicationTests` | Spring context loads — proves the whole bean graph wires |
| `FactoryTest` | Builds all 22 entities through their factories; asserts each rejects invalid input |
| `HelperTest` | Validation utilities, including the student-email rule |
| `OtpServiceTest` | OTP expiry, the attempt cap, single use, and that codes are hashed |

### Frontend

```bash
cd Frontend
npm run build && npm run lint
```

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `invalid target release: 25` | `JAVA_HOME` points at a JDK older than 25 — see [Prerequisites](#1-a-jdk-version-25-or-newer) |
| `zsh: permission denied: ./mvnw` | `chmod +x Backend/mvnw` |
| `Communications link failure` or `Cannot load driver class` at startup | MySQL isn't running, or the URL/credentials are wrong. Confirm the server with `pgrep -fl mysqld` |
| `command not found: mysql` | The client isn't on `PATH` — `export PATH="/usr/local/mysql/bin:$PATH"`. This says nothing about whether the server is running |
| `Access denied for user 'root'@'localhost'` | `DB_PASSWORD` is unset or wrong — see [step 3](#3-configure-your-database-password) |
| `WeakKeyException` at startup | `app.jwt.secret` is under 32 bytes; set a longer `JWT_SECRET` |
| No verification email arrives | Expected by default — the code is printed in the backend terminal. For real mail see [Email / OTP Delivery](#email--otp-delivery), and check Junk |
| Login returns 403 `EMAIL_NOT_VERIFIED` | That account never completed the OTP step. The frontend redirects to `/verify` automatically |
| Frontend shows "Cannot reach the UniExchange server" | The backend isn't running, or `VITE_API_BASE_URL` is wrong |
| CORS error in the browser console | Your origin isn't in `app.cors.allowed-origins`. Only the `Authorization` and `Content-Type` request headers are allowed — adding any custom header breaks the preflight |
| `Cannot access central ... in offline mode` | You used `-o`. Run once with internet to cache dependencies |
| Port 8080 or 5173 already in use | `./mvnw spring-boot:run -Dspring-boot.run.arguments=--server.port=8081`, or `npm run dev -- --port 5174` (then add that origin to `app.cors.allowed-origins`) |

## Database

The schema is the **`uniexchange`** database (MySQL 8+, `utf8mb4`): 22 tables across identity, marketplace, communication, trust, transactions, community and admin, with foreign keys, indexes and CHECK constraints for business rules (rating 1–5, non-negative money, buyer ≠ seller). Hibernate generates the tables from the entities on startup via `ddl-auto=update`.

The schema was designed against MySQL 8, but 9.x works too — Hibernate 7
auto-detects the dialect from the live connection, which is why
`spring.jpa.properties.hibernate.dialect` must be left unset.

> Entity timestamp columns are populated by the factories rather than by MySQL `DEFAULT CURRENT_TIMESTAMP`, which keeps persistence portable between MySQL and the H2 used in tests.

## Git Workflow

- `main` is the integration branch — **never commit to it directly**.
- Each team member works on their own branch, named `initials-studentNumber` (e.g. `JRA-230317693`).
- Completed work is merged into `main` via a **pull request** reviewed by a teammate.
- Before opening a PR, pull the latest `main` and merge it into your branch to avoid conflicts.
- Never commit secrets. `.env*` files and `application-local.properties` are gitignored — keep it that way.

## Team

| Name                      | Student Number | Branch            |
|---------------------------|----------------|-------------------|
| Aidan Barends             | 230255639      | `AB-230255639`    |
| Joshua Reid Adams         | 230317693      | `JRA-230317693`   |
| Raul Ja'aim Everts        | 230270565      | `RJE-230270565`   |
| Mogamat Yaseen Kannemeyer | 240453182      | `MYK-240453182`   |
| Mogamat Wazeer Gilbert    | 221374698      | `MWG-221374698`   |

## Roadmap

1. **Done** — full backend layering (`domain → repository → factory → service → controller`), Spring Security + JWT, and verified-student auth with email OTP.
2. **Done** — frontend signup, OTP verification and login (React 19 + TypeScript + Tailwind v4 + react-router 7).
3. **Next** — marketplace slices: listings, categories, campus filters, listing images.
4. **Then** — messaging, wallet, reviews and trusted-seller badges, campus bulletin board.
5. **Later** — Swagger/OpenAPI docs (springdoc 3.x, already a commented-out placeholder in `pom.xml`); authenticator-app TOTP as a login second factor; optional "Sign in with Microsoft" via Entra ID.
