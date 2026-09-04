# UniExchange — Frontend

React + TypeScript + Vite client for the UniExchange campus marketplace.

Currently implemented: **signup → email OTP verification → login**, plus a placeholder
dashboard. The marketplace itself is the next milestone.

## Stack

| Concern | Choice |
|---|---|
| Framework | React 19 |
| Language | TypeScript 6 |
| Build | Vite 8 |
| Routing | react-router-dom 7 |
| Styling | Tailwind CSS v4 (configured in `src/index.css`, no `tailwind.config.js`) |
| Forms | react-hook-form + zod 4 (`@hookform/resolvers`) |
| HTTP | native `fetch`, wrapped in `src/lib/api.ts` |

## Getting started

```bash
npm install
cp .env.example .env.local     # then edit if your backend is not on :8080
npm run dev                    # http://localhost:5173
```

The Spring Boot backend must be running on the URL in `VITE_API_BASE_URL`
(default `http://localhost:8080`). No dev proxy is configured or needed —
the backend already allows `http://localhost:5173` as a CORS origin.

```bash
npm run build      # type-checks and bundles to dist/
npm run lint
npx tsc -b         # type-check only
```

## Layout

```
src/
├── main.tsx              BrowserRouter + AuthProvider
├── App.tsx               route table
├── index.css             Tailwind import + design tokens (@theme)
├── lib/
│   ├── api.ts            the only module that knows the backend exists
│   └── schemas.ts        zod schemas, incl. the student-email rule
├── auth/
│   ├── authContext.ts    context + types (component-free, keeps HMR working)
│   ├── AuthProvider.tsx  session state, localStorage, token expiry
│   ├── useAuth.ts
│   └── ProtectedRoute.tsx
├── components/           AuthLayout, Button, TextField, OtpInput, Alert, Logo
└── pages/                SignUpPage, VerifyOtpPage, LoginPage, DashboardPage
```

Routes: `/` redirects by auth state · `/signup` · `/verify` · `/login` ·
`/dashboard` (protected).

## Auth flow

1. **Signup** posts to `/api/auth/register`, which returns **202 and no token** —
   the account is inert until verified. The app navigates to `/verify`.
2. **Verify** posts the 6-digit code to `/api/auth/verify-otp`. That is the only
   endpoint that issues a JWT, so an unverifiable address can never obtain one.
3. **Login** posts to `/api/auth/login`. An unverified account comes back as
   `403 EMAIL_NOT_VERIFIED`, which the app treats as a redirect to `/verify`
   (with an automatic resend) rather than an error.

The token lives in `localStorage` alongside its expiry. The backend issues a
one-hour token and has **no refresh endpoint**, so an expired token is treated as
signed out on load.

## Things worth knowing

- **Student email rule.** `VITE_STUDENT_EMAIL_PATTERN` mirrors the backend's
  `app.auth.student-email-pattern`, defaulting to `^\d{8,10}@mycput\.ac\.za$`.
  It is loose on digit count on purpose: CPUT publishes no student-number length,
  and a gate one digit too strict locks real students out. The domain is what is
  enforced strictly — the emailed code is what actually proves the mailbox exists.
- **CORS is narrow.** The backend allows only the `Authorization` and
  `Content-Type` request headers. Adding any custom header makes the preflight
  fail with no useful console error.
- **`.env.local` is gitignored**; `.env.example` is the template to copy.
