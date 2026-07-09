# KUPC Phase 2 - Authentication & Authorization

Source document reviewed: `KUPC_Phase2_Authentication_Authorization (1).md` (official Phase 2 spec)

Status date: 2026-07-09

**Phase 2 status: COMPLETE** — all 13 PDF milestones implemented, exit checklist satisfied in code, 50 automated tests passing. Apply Supabase migrations and configure production env vars before deploying.

Phase 2 turns the Phase 1 Express skeleton into the identity layer for Kathmandu University Placement Connect. This phase is important because every later feature depends on knowing who is making a request and what that user is allowed to do. Student profiles, company profiles, jobs, swiping, chat, resumes, admin verification, and audit trails all depend on a reliable authenticated `req.user`.

## Phase Goal

The backend must support:

- Student registration with KU email validation and OTP verification.
- Company registration with pending verification status.
- Admin login through a separate route.
- Access JWTs for protected API requests.
- Rotating refresh tokens for safe long-lived sessions.
- Role-based authorization for `STUDENT`, `COMPANY`, and `ADMIN`.
- Pending-company blocking for restricted company actions.
- Stable auth error codes that frontend code can safely branch on.

## Current Backend State Before Phase 2

The project already had a Phase 1 backend skeleton:

- Express app/server wiring.
- Security headers through `helmet`.
- CORS middleware.
- Request logging through `morgan`.
- Auth-oriented rate limiter.
- Central `AppError`.
- Standard success/error response helpers.
- Base `/`, `/health`, and `/api/v1` routes.

What was missing before Phase 2:

- No Supabase client.
- No validated environment module.
- No auth feature module.
- No auth routes/controllers/services.
- No request validation middleware.
- No repositories for auth-related tables.
- No JWT helpers.
- No password/OTP helpers.
- No typed `req.user`.
- No authentication middleware.
- No RBAC middleware.
- No pending-company middleware.

## Milestone 1 Completed - Auth Module Foundation

Milestone 1 was implemented as the foundation scaffolding for the auth module. Later milestones now build on these files for student OTP verification, company registration, login, sessions, JWT issuance, refresh rotation, and logout.

### Files Added

```text
src/
  modules/
    auth/
      auth.constants.ts
      auth.controller.ts
      auth.routes.ts
      auth.service.ts
      auth.types.ts
      auth.validation.ts
      index.ts
  middleware/
    authenticate.ts
    authorize.ts
    requireVerifiedCompany.ts
    attachUser.ts
    validate.ts
  config/
    env.ts
    supabase.ts
  database/
    users.repository.ts
    students.repository.ts
    companies.repository.ts
    sessions.repository.ts
    refreshTokens.repository.ts
  types/
    express.d.ts
  utils/
    jwt.ts
    auth.ts
```

Also added:

```text
.env.example
pnpm-lock.yaml
```

`pnpm-lock.yaml` was created because the available package manager in this environment is pnpm. The older `package-lock.json` still exists from the previous npm-based setup, but it was not updated because npm is not available in this shell.

## What Was Done And Why It Matters

### 1. Added Validated Environment Loading

File: `src/config/env.ts`

What it does:

- Loads environment variables with `dotenv`.
- Validates them once at startup with Zod.
- Fails fast with a clear error message if anything required is missing or malformed.
- Exports one typed `env` object for the rest of the backend.

Variables validated:

```env
NODE_ENV=development
PORT=5000
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
JWT_EXPIRES_IN=15m
REFRESH_EXPIRES_IN=30d
OTP_LENGTH=6
OTP_EXPIRES_IN=10m
OTP_MAX_ATTEMPTS=5
KU_EMAIL_DOMAIN=ku.edu.np
AUTH_USER_CACHE_TTL_SECONDS=30
```

Why this matters for KUPC:

Authentication bugs caused by missing secrets are painful and dangerous. For KUPC, bad Supabase keys or a missing JWT secret would make student/company login fail at runtime in confusing ways. The new `env.ts` crashes immediately during startup instead, so the backend never runs in a half-configured auth state.

### 2. Added `.env.example`

File: `.env.example`

What it does:

- Documents every required Phase 2 environment variable.
- Gives developers a safe template without exposing real secrets.
- Keeps `.env` private while making setup reproducible.

Why this matters for KUPC:

Multiple people may work on this project during later phases. `.env.example` makes it clear what every developer needs before running the authentication backend.

### 3. Reworked Central Config To Use Validated Env

File: `src/config/config.ts`

What changed:

- Removed direct `process.env` access.
- Uses the validated `env` object.
- Exposes Phase 2 auth config such as JWT expiry, refresh expiry, OTP length, OTP expiry, OTP attempt limit, and KU email domain.

Why this matters for KUPC:

Auth rules need to be consistent everywhere. Student OTP expiry, KU email domain checks, and JWT lifetime should not be duplicated across controllers and services. Central config gives later milestones one trustworthy place to read these settings.

### 4. Installed Supabase Client

Package added:

```text
@supabase/supabase-js
```

Why this matters for KUPC:

The Phase 2 design uses Supabase Auth and PostgreSQL. The backend needs the official Supabase client to create users, verify credentials, manage trusted server-side operations, and later read/write auth-related rows.

### 5. Added Two Supabase Clients

File: `src/config/supabase.ts`

What it exports:

- `supabaseAnon`
- `supabaseAdmin`
- `verifySupabaseConnection()`

`supabaseAnon` uses:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
```

It is intended for actions performed on behalf of an end user, such as sign-up, sign-in, and OTP-style flows.

`supabaseAdmin` uses:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

It is intended only for trusted backend code. It is configured with:

```ts
auth: { persistSession: false }
```

Why this matters for KUPC:

KUPC needs both normal user-auth behavior and privileged backend behavior. Student/company sign-in should not use service-role power. Server-side admin operations, creating related database rows, and crossing RLS boundaries may need the service-role client. Keeping the clients separate reduces the chance of accidentally using the privileged key in user-facing code.

Security rule:

- The service-role key must never be returned to the frontend.
- The service-role key must never be logged.
- The service-role key should only be imported by trusted backend services/config.

### 6. Added Boot-Time Supabase Verification

File: `src/server.ts`

What changed:

- Server startup is now wrapped in an async `bootstrap()` function.
- Startup calls `verifySupabaseConnection()`.
- If Supabase credentials are invalid, the server logs a clear error and exits.
- The Express server only starts after Supabase verification succeeds.

Why this matters for KUPC:

Authentication is now a hard dependency for Phase 2. If the backend cannot talk to Supabase, endpoints like student registration, company registration, login, OTP verification, and refresh-token handling cannot work correctly. Failing fast protects the team from debugging fake route/controller issues when the real problem is configuration.

### 7. Added Feature-Based Auth Module

Directory: `src/modules/auth/`

Files:

- `auth.constants.ts`
- `auth.controller.ts`
- `auth.routes.ts`
- `auth.service.ts`
- `auth.types.ts`
- `auth.validation.ts`
- `index.ts`

Why this matters for KUPC:

Phase 1 used a thin skeleton. Phase 2 starts a feature-based backend structure. Auth is the first real domain module, and future modules should follow the same pattern: profiles, jobs, resumes, swipes, chat, and admin verification.

The feature-based structure keeps related auth code together:

- Routes decide URL shape and middleware order.
- Controllers handle HTTP request/response details.
- Services hold business rules.
- Validation schemas define input contracts.
- Types describe shared data shapes.
- Constants hold roles and error codes.

### 8. Added Auth Constants And Roles

File: `src/modules/auth/auth.constants.ts`

Added role enum:

```ts
STUDENT
COMPANY
ADMIN
```

Added stable auth error codes:

- `MISSING_TOKEN`
- `INVALID_TOKEN`
- `TOKEN_EXPIRED`
- `INVALID_CREDENTIALS`
- `ACCOUNT_NOT_VERIFIED`
- `ACCOUNT_SUSPENDED`
- `INSUFFICIENT_ROLE`
- `PENDING_VERIFICATION`
- `INVALID_OTP`
- `OTP_EXPIRED`
- `INVALID_EMAIL_DOMAIN`
- `REFRESH_TOKEN_REUSE_DETECTED`
- `EMAIL_ALREADY_REGISTERED`

Why this matters for KUPC:

The frontend must be able to react predictably to authentication failures. For example:

- `ACCOUNT_NOT_VERIFIED` can show a resend-OTP screen.
- `PENDING_VERIFICATION` can show a company approval-pending screen.
- `INSUFFICIENT_ROLE` can redirect users away from unauthorized dashboards.
- `TOKEN_EXPIRED` can trigger silent refresh.

Stable codes are better than parsing human-readable error messages.

### 9. Added Auth Types

File: `src/modules/auth/auth.types.ts`

Added `AuthenticatedUser`:

```ts
{
  id: string;
  sessionId: string;
  role: Role;
  email: string;
  emailVerified: boolean;
  status: 'active' | 'suspended' | 'deleted';
  verificationStatus?: 'pending' | 'approved' | 'rejected';
}
```

Why this matters for KUPC:

Every protected route will eventually depend on `req.user`. Student-only routes, company-only routes, admin routes, pending-company checks, and future logout/session-revocation flows need a consistent identity shape. `sessionId` is included because access tokens are tied to a specific login session.

### 10. Added Express Request Typing

File: `src/types/express.d.ts`

What it does:

- Extends `Express.Request`.
- Adds an optional typed `req.user`.

Why this matters for KUPC:

Controllers should not need to cast `req.user as any`. Typed request identity reduces mistakes when building profile, job, resume, swipe, chat, and admin routes.

### 11. Added Request Validation Foundation

Files:

- `src/modules/auth/auth.validation.ts`
- `src/middleware/validate.ts`

What was added:

- Student registration schema.
- Company registration schema.
- OTP verification schema.
- Generic `validate(schema)` middleware.

Student registration currently validates:

- KU email domain.
- `full_name` length.
- Password minimum length.
- Password contains at least one number.

Company registration currently validates:

- Company name length.
- Email format.
- Password policy.
- Optional website URL.

OTP verification currently validates:

- Email format.
- 6-digit numeric OTP.

Why this matters for KUPC:

Auth endpoints are high-risk entry points. Validation prevents malformed data from reaching business logic and keeps frontend/backend contracts clear. It also helps enforce KUPC-specific rules such as KU institutional email requirements for students.

Note:

The validation middleware currently returns a generic `AppError`. In a later milestone, `AppError` should be extended to carry stable machine-readable error codes such as `INVALID_EMAIL_DOMAIN`.

### 12. Added Auth Middleware

Files:

- `src/middleware/authenticate.ts`
- `src/middleware/authorize.ts`
- `src/middleware/requireVerifiedCompany.ts`
- `src/middleware/attachUser.ts`

Current state:

- `authenticate.ts` reads a Bearer access token, verifies the JWT, loads the user row, rejects suspended/deleted users, attaches `req.user`, and adds company verification status for company accounts.
- `authorize.ts` checks `req.user.role`, enforces allowed roles, and returns stable `MISSING_TOKEN` or `INSUFFICIENT_ROLE` codes.
- `requireVerifiedCompany.ts` checks that the user is a company and has `verificationStatus = approved`; pending companies receive `PENDING_VERIFICATION`.
- `attachUser.ts` is a placeholder for later user/session attachment behavior.

Why this matters for KUPC:

These middleware files define the request pipeline for protected routes:

```text
Request
  -> authenticate
  -> authorize(Role.COMPANY)
  -> requireVerifiedCompany
  -> controller
```

That pipeline is central to KUPC. A pending company should be able to log in and see its dashboard, but should not be able to post jobs or access restricted company features until approved by an admin.

### 13. Added Auth Repositories

Directory: `src/database/`

Files:

- `users.repository.ts`
- `students.repository.ts`
- `companies.repository.ts`
- `sessions.repository.ts`
- `refreshTokens.repository.ts`

Why this matters for KUPC:

Repositories will isolate database access from auth business logic. For example:

- `users.repository.ts` will read/write identity rows.
- `students.repository.ts` will create student rows after KU email/OTP flow.
- `companies.repository.ts` will create companies with pending verification.
- `sessions.repository.ts` will track logged-in devices.
- `refreshTokens.repository.ts` will store hashed refresh tokens and support token rotation/reuse detection.

Keeping this database code out of controllers makes later phases easier to maintain.

### 14. Added Auth Utilities

Files:

- `src/utils/jwt.ts`
- `src/utils/auth.ts`

Current use:

- `jwt.ts` signs and verifies access tokens.
- `auth.ts` holds OTP generation, secure refresh-token generation, token hashing, date math, and duration parsing helpers.

Why this matters for KUPC:

JWT and token helper code should be centralized. If token signing, expiry parsing, OTP generation, and refresh-token hashing are scattered around services, mistakes become more likely.

### 15. Wired Auth Router Under Versioned API

File: `src/routes/index.ts`

What changed:

```ts
router.use('/auth', authRateLimiter, authRouter);
```

Final route prefix:

```text
/api/v1/auth
```

Why this matters for KUPC:

All Phase 2 auth routes should live under the versioned API namespace. This keeps route structure consistent and makes future API versioning possible.

Examples for later milestones:

```text
POST /api/v1/auth/register/student
POST /api/v1/auth/register/company
POST /api/v1/auth/verify-otp
POST /api/v1/auth/login
POST /api/v1/auth/admin/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

### 16. Moved Auth Rate Limiting To Auth Router

Files:

- `src/app.ts`
- `src/routes/index.ts`

What changed:

- Removed old top-level rate limiter mounting from `app.ts`.
- Mounted `authRateLimiter` directly on `/api/v1/auth`.

Why this matters for KUPC:

Login, registration, OTP verification, and refresh endpoints should be rate-limited together under the real auth route prefix. This reduces brute-force risk and keeps middleware placement close to the auth domain.

## Milestone 2 Completed - Student Registration & OTP

Milestone 2 adds the first real authentication workflow for KUPC students:

```text
POST /api/v1/auth/register/student
POST /api/v1/auth/verify-otp
```

The backend now validates KU student registration input, creates an unverified Supabase Auth user, creates KUPC identity rows, generates and stores a hashed OTP, verifies OTP attempts, marks the student verified, creates a session, stores a hashed refresh token, and returns an access/refresh token pair only after OTP verification succeeds.

### Files Changed For Milestone 2

```text
src/modules/auth/auth.validation.ts
src/modules/auth/auth.routes.ts
src/modules/auth/auth.controller.ts
src/modules/auth/auth.service.ts
src/utils/AppError.ts
src/utils/auth.ts
src/utils/jwt.ts
src/middleware/errorHandler.ts
src/middleware/validate.ts
src/database/users.repository.ts
src/database/students.repository.ts
src/database/sessions.repository.ts
src/database/refreshTokens.repository.ts
src/database/studentOtps.repository.ts
package.json
pnpm-lock.yaml
```

### Dependency Added

```text
jsonwebtoken
@types/jsonwebtoken
```

Why this matters for KUPC:

OTP verification must return a short-lived access token. `jsonwebtoken` is now used to sign that access JWT with the configured `JWT_SECRET` and `JWT_EXPIRES_IN`.

### Student Registration Endpoint

Route:

```text
POST /api/v1/auth/register/student
```

Request:

```json
{
  "email": "user@ku.edu.np",
  "full_name": "Student Name",
  "password": "password1"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "otp_sent": true,
    "expires_in": 600
  },
  "message": "Student OTP sent",
  "error": null
}
```

Implementation flow:

```text
validate request body
  -> normalize email
  -> check duplicate user row
  -> create Supabase Auth user
  -> create KUPC users row with role=STUDENT and email_verified=false
  -> create students row with ku_id and full_name
  -> generate numeric OTP
  -> hash OTP with SHA-256
  -> store hashed OTP in student_otps
  -> deliver OTP through the current development delivery hook
  -> return otp_sent=true and expiry seconds
```

Why this matters for KUPC:

Only KU students should enter the student side of the placement system. This route enforces the KU email rule before creating a student identity and deliberately does not issue tokens yet. That protects future student-only features such as profiles, resumes, swiping, and chat from unverified accounts.

### Registration Validation

File:

```text
src/modules/auth/auth.validation.ts
```

Validation rules:

- `email` must be a valid email.
- Email domain must be `ku.edu.np` or a subdomain ending in `.ku.edu.np`.
- `full_name` must be 2-100 characters.
- `password` must be at least 8 characters.
- `password` must contain at least one number.
- Unknown fields are stripped by the Zod schema.

Invalid KU domain behavior:

```text
HTTP 400
code: INVALID_EMAIL_DOMAIN
```

Why this matters for KUPC:

The student side is institution-specific. The frontend can use `INVALID_EMAIL_DOMAIN` to show a precise message like "Please use your KU email address" instead of a generic validation failure.

### OTP Generation And Storage

Files:

```text
src/utils/auth.ts
src/database/studentOtps.repository.ts
```

What was added:

- `generateNumericOtp(length)`
- `hashToken(token)`
- `addSeconds(date, seconds)`
- `parseDurationToSeconds(value)`
- `studentOtpsRepository.create()`
- `studentOtpsRepository.findLatestActiveByEmail()`
- `studentOtpsRepository.incrementAttempts()`
- `studentOtpsRepository.consume()`

The raw OTP is never stored. The backend stores only:

```text
email
otp_hash
attempts
expires_at
consumed_at
created_at
```

Why this matters for KUPC:

An OTP is a short-lived credential. Storing only the hash reduces damage if the OTP table is ever exposed. Tracking attempts also gives the backend a clean way to reject repeated guessing.

### OTP Delivery Current State

Current implementation:

```text
Development mode logs the OTP to the backend console.
Production mode does not log the OTP.
```

Why this matters for KUPC:

The repo does not yet include an email/SMS provider. For local development and demo testing, console delivery lets the team complete the flow. Before production, this must be replaced with a real email provider or a Supabase-backed email OTP flow.

Production TODO:

- Choose the OTP delivery provider.
- Add the required provider credentials to `.env.example`.
- Send the OTP email from `deliverStudentOtp()`.
- Never log OTPs in production.

### OTP Verification Endpoint

Route:

```text
POST /api/v1/auth/verify-otp
```

Request:

```json
{
  "email": "user@ku.edu.np",
  "otp": "482913"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "access_token": "...",
    "refresh_token": "...",
    "user": {
      "id": "...",
      "email": "user@ku.edu.np",
      "role": "STUDENT",
      "email_verified": true,
      "status": "active"
    }
  },
  "message": "Student verified",
  "error": null
}
```

Implementation flow:

```text
validate request body
  -> normalize email
  -> find latest unconsumed OTP for email
  -> reject missing OTP as INVALID_OTP
  -> reject expired OTP as OTP_EXPIRED
  -> reject max-attempt OTP as INVALID_OTP
  -> compare submitted OTP hash to stored hash
  -> increment attempts on mismatch
  -> load matching student user
  -> mark email_verified=true
  -> consume OTP
  -> create session row
  -> generate refresh token
  -> hash refresh token
  -> store hashed refresh token
  -> sign access token
  -> return access token, refresh token, and user identity
```

Why this matters for KUPC:

Tokens are issued only after OTP verification. That means unverified student accounts cannot access protected student routes. This is the important gate that future KUPC features will trust.

### OTP Failure Behavior

Current failure codes:

```text
INVALID_OTP
OTP_EXPIRED
```

Account enumeration protection:

- Missing OTP record returns `INVALID_OTP`.
- Missing user after an OTP lookup returns `INVALID_OTP`.
- Wrong OTP returns `INVALID_OTP`.
- Only an expired known OTP returns `OTP_EXPIRED`.

Why this matters for KUPC:

The backend should avoid revealing whether an email belongs to a registered student. This reduces account enumeration risk.

### Session And Refresh Token Creation

Files:

```text
src/database/sessions.repository.ts
src/database/refreshTokens.repository.ts
src/utils/auth.ts
src/utils/jwt.ts
```

On successful OTP verification:

- A session row is created.
- A secure random refresh token is generated.
- The refresh token is hashed with SHA-256.
- Only the refresh token hash is stored.
- An access token is signed with:
  - `sub`
  - `role`
  - `email`
  - `sessionId`

Why this matters for KUPC:

The access token powers immediate protected API access. The refresh token supports long-lived login sessions and is rotated on every use via `POST /api/v1/auth/refresh` (Milestone 8).

### Error Response Shape Updated

Files:

```text
src/utils/AppError.ts
src/middleware/errorHandler.ts
```

`AppError` now carries:

```text
message
statusCode
code
isOperational
```

Error responses now include:

```json
{
  "success": false,
  "data": null,
  "message": "Request validation failed",
  "error": {
    "code": "INVALID_EMAIL_DOMAIN",
    "statusCode": 400,
    "isOperational": true
  }
}
```

Why this matters for KUPC:

The frontend needs stable codes to decide what to show. For example, the student registration page can treat `INVALID_EMAIL_DOMAIN`, `EMAIL_ALREADY_REGISTERED`, `INVALID_OTP`, and `OTP_EXPIRED` differently.

### Database Tables Required By Milestone 2

Milestone 2 needs the Phase 2 identity/session tables plus one OTP table:

```text
users
students
sessions
refresh_tokens
student_otps
```

Expected `student_otps` shape:

```text
id uuid primary key default gen_random_uuid()
email text not null
otp_hash text not null
attempts integer not null default 0
expires_at timestamptz not null
consumed_at timestamptz null
created_at timestamptz not null default now()
```

Additional expected `refresh_tokens` column:

```text
session_id uuid not null references sessions(id)
```

Why this matters for KUPC:

The original Phase 2 PDF lists `refresh_tokens` as user-based, but refresh-token reuse detection is safer and easier when refresh tokens are tied to a concrete login session. `session_id` also supports future "active sessions" and "logout this device" features.

### Transaction Caveat

The Phase 2 guide says user and student rows should be inserted in the same transaction. The current Supabase JS implementation creates:

```text
Supabase Auth user
users row
students row
student_otps row
```

If one of the database steps fails after the Supabase Auth user is created, the service attempts to delete the Supabase Auth user as cleanup.

Important limitation:

This is not a true database transaction across Supabase Auth and public schema tables.

Recommended production improvement:

- Add a Postgres RPC/database function for student registration.
- Let the RPC create `users`, `students`, and `student_otps` atomically.
- Keep Supabase Auth user cleanup as a fallback if auth creation succeeds but the RPC fails.

Why this matters for KUPC:

Without a real transaction, rare partial-failure states are possible. The current cleanup is acceptable for development, but a placement platform should use atomic writes before production.

## Milestone 3 Completed - Company Registration

Milestone 3 adds the company onboarding workflow for KUPC recruiters:

```text
POST /api/v1/auth/register/company
POST /api/v1/auth/company/verification-documents
```

The backend now validates company registration input, creates a Supabase Auth user through the public Supabase sign-up flow, creates the KUPC `users` row with role `COMPANY`, creates a matching `companies` row with `verification_status = pending`, and exposes a protected placeholder endpoint for company verification document metadata.

### Files Changed For Milestone 3

```text
src/modules/auth/auth.validation.ts
src/modules/auth/auth.routes.ts
src/modules/auth/auth.controller.ts
src/modules/auth/auth.service.ts
src/database/users.repository.ts
src/database/companies.repository.ts
src/database/companyRequests.repository.ts
src/middleware/authenticate.ts
src/middleware/authorize.ts
```

### Company Registration Validation

File:

```text
src/modules/auth/auth.validation.ts
```

Validation rules:

- `company_name` must be 2-150 characters.
- `email` must be a valid email address.
- `password` must be at least 8 characters.
- `password` must contain at least one number.
- `website` is optional during registration.
- If `website` is provided, it must be a valid URL.
- Unknown fields are stripped by the Zod schema.

Why this matters for KUPC:

Company registration is a public endpoint, so it is exposed to malformed input and abuse attempts. Validating at the route boundary keeps bad payloads out of the service layer and gives the frontend a predictable contract. The website is optional here because the Phase 2 goal is account creation; the full company verification workflow in Phase 11 can require a website before approval.

### Company Signup Endpoint

Route:

```text
POST /api/v1/auth/register/company
```

Request:

```json
{
  "company_name": "Acme Nepal",
  "email": "hr@acme.com",
  "password": "password1",
  "website": "https://acme.com"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "company_id": "...",
    "verification_status": "pending"
  },
  "message": "Company registration submitted",
  "error": null
}
```

Implementation flow:

```text
validate request body
  -> normalize email
  -> check duplicate users row
  -> create Supabase Auth user with company metadata
  -> create KUPC users row with role=COMPANY
  -> create companies row with verification_status=pending
  -> return company_id and pending verification status
```

Why this matters for KUPC:

Companies need a different onboarding path from students. They are not restricted to a KU email domain and they do not use the student OTP flow. Instead, Supabase handles standard email confirmation, and KUPC stores the company in a pending state. That lets recruiters start the account process without immediately gaining access to high-impact actions such as posting jobs, swiping students, or contacting candidates.

### Pending Company State

The company row is created with:

```text
verification_status = pending
verified_at = null
```

Why this matters for KUPC:

KUPC must protect students from unverified employers. A pending company can authenticate and view its own account state, but restricted company actions should later run through:

```text
authenticate -> authorize(Role.COMPANY) -> requireVerifiedCompany -> controller
```

That separation is intentional. Authentication answers "who are you?", RBAC answers "are you a company?", and the verified-company middleware answers "has the placement office approved this company yet?"

### Verification Document Placeholder Endpoint

Route:

```text
POST /api/v1/auth/company/verification-documents
```

Auth:

```text
Company access token required
```

Request:

```json
{
  "document_type": "business_registration",
  "file_url": ""
}
```

Response:

```json
{
  "success": true,
  "data": {
    "request_id": "...",
    "status": "pending"
  },
  "message": "Company verification document submitted",
  "error": null
}
```

Implementation flow:

```text
authenticate access token
  -> authorize Role.COMPANY
  -> validate document metadata
  -> load company row by req.user.id
  -> insert company_requests row with status=pending
  -> return request_id and status
```

Why this matters for KUPC:

Phase 2 does not implement full file upload to Supabase Storage. That belongs to later profile, storage, and company verification phases. This placeholder still matters because it proves the protected company route pipeline works and creates the database shape that the admin verification workflow will consume later.

### Company Registration Caveat

The service creates:

```text
Supabase Auth user
users row
companies row
```

If the public schema insert fails after Supabase Auth user creation, the service attempts to delete the Supabase Auth user as cleanup.

Important limitation:

This is not a true cross-system transaction. Before production, company registration should move public table writes into a Postgres RPC/database function so `users` and `companies` are created atomically after Supabase Auth succeeds.

## Milestone 4 Completed - Login

Milestone 4 adds login for students, companies, and admins:

```text
POST /api/v1/auth/login
POST /api/v1/auth/admin/login
```

The backend now validates login requests, delegates password verification to Supabase Auth, looks up the KUPC user role from the `users` table, creates a session row, stores a hashed refresh token, signs a short-lived access JWT, and returns the token pair plus user identity.

### Files Changed For Milestone 4

```text
src/modules/auth/auth.validation.ts
src/modules/auth/auth.routes.ts
src/modules/auth/auth.controller.ts
src/modules/auth/auth.service.ts
src/database/users.repository.ts
src/database/sessions.repository.ts
src/database/refreshTokens.repository.ts
src/utils/auth.ts
src/utils/jwt.ts
src/middleware/authorize.ts
src/middleware/requireVerifiedCompany.ts
```

### Shared Student And Company Login Endpoint

Route:

```text
POST /api/v1/auth/login
```

Request:

```json
{
  "email": "user@example.com",
  "password": "password1"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "access_token": "...",
    "refresh_token": "...",
    "user": {
      "id": "...",
      "email": "user@example.com",
      "role": "COMPANY",
      "email_verified": true,
      "status": "active",
      "verification_status": "pending"
    }
  },
  "message": "Login successful",
  "error": null
}
```

Implementation flow:

```text
validate request body
  -> normalize email
  -> verify email/password with Supabase Auth
  -> load KUPC users row
  -> allow only STUDENT and COMPANY roles on the shared login route
  -> reject suspended/deleted accounts
  -> reject unverified students with ACCOUNT_NOT_VERIFIED
  -> sync company/admin email_verified from Supabase confirmation state when applicable
  -> create sessions row with device_info and ip_address
  -> generate refresh token and store only its SHA-256 hash
  -> sign access JWT with sub, role, email, and sessionId
  -> return access token, refresh token, and user identity
```

Why this matters for KUPC:

Students and companies share the normal product login path, but they have different account-state rules. Students must complete KU OTP verification before receiving tokens. Companies can receive tokens after Supabase confirms their email, even if their company verification is still pending, because pending-company restrictions are enforced at protected route level. This lets a company view onboarding and verification status while still blocking sensitive actions.

### Student Login Rule

If a student has:

```text
email_verified = false
```

the service returns:

```text
HTTP 403
code: ACCOUNT_NOT_VERIFIED
```

Why this matters for KUPC:

Student identity is tied to a KU institutional email. Issuing tokens before OTP verification would let an unverified user reach student-only surfaces. The explicit `ACCOUNT_NOT_VERIFIED` code lets the frontend redirect the student to OTP verification or resend-OTP UX instead of showing a generic login error.

### Company Login Rule

Pending companies can log in successfully. The response includes:

```text
verification_status = pending
```

Why this matters for KUPC:

The company dashboard needs to show verification progress, missing documents, and approval status. Blocking pending companies at login would prevent that experience. Instead, future routes such as job creation and student swiping should use `requireVerifiedCompany` to return:

```text
HTTP 403
code: PENDING_VERIFICATION
```

### Admin Login Endpoint

Route:

```text
POST /api/v1/auth/admin/login
```

Request:

```json
{
  "email": "admin@ku.edu.np",
  "password": "password1",
  "totp_code": "123456"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "access_token": "...",
    "refresh_token": "...",
    "user": {
      "id": "...",
      "email": "admin@ku.edu.np",
      "role": "ADMIN",
      "email_verified": true,
      "status": "active"
    }
  },
  "message": "Admin login successful",
  "error": null
}
```

Current implementation:

- Admin login has a separate route.
- Normal `/api/v1/auth/login` now rejects `ADMIN` users with `INVALID_CREDENTIALS`.
- `/api/v1/auth/admin/login` only allows `ADMIN` users.
- Full TOTP verification is not implemented yet.
- Password-only admin login is available only when `ADMIN_PASSWORD_LOGIN_ENABLED=true`.
- If the demo flag is disabled and no TOTP implementation is present, the route returns `ADMIN_TOTP_NOT_CONFIGURED`.

Why this matters for KUPC:

Admin accounts have platform-wide power: approving companies, suspending users, moderating content, and later viewing analytics. They should not share the same discoverable login behavior as normal users. Keeping the route separate also lets the project add mandatory TOTP without changing the student/company login contract.

Security note:

The password-only admin path is for local/demo use only. It should stay disabled in staging and production until real TOTP enrollment and verification are implemented.

### Session And Token Issuance

Every successful login creates:

```text
sessions row
refresh_tokens row
access JWT
```

The session stores:

```text
user_id
device_info
ip_address
expires_at
```

The refresh token table stores:

```text
user_id
session_id
token_hash
expires_at
revoked=false
```

Why this matters for KUPC:

Sessions give the platform an audit trail for logins and prepare the backend for "active sessions" UI later. Hashing refresh tokens keeps long-lived credentials out of the database in raw form. The access token stays short-lived and carries only enough identity data for protected request authentication.

### Role Safety Fix

Milestone 4 includes an important route-boundary rule:

```text
/api/v1/auth/login       -> STUDENT and COMPANY only
/api/v1/auth/admin/login -> ADMIN only
```

Why this matters for KUPC:

Without this separation, an admin could accidentally or intentionally authenticate through the public student/company route. The backend now checks allowed roles before creating sessions or token pairs, so the wrong login route cannot mint tokens for the wrong account type.

### Error Codes Used By Milestone 4

Current login-related error codes:

```text
INVALID_CREDENTIALS
ACCOUNT_NOT_VERIFIED
ACCOUNT_SUSPENDED
ADMIN_TOTP_NOT_CONFIGURED
```

Middleware error codes improved while completing this milestone:

```text
MISSING_TOKEN
INSUFFICIENT_ROLE
PENDING_VERIFICATION
```

Why this matters for KUPC:

Frontend code should branch on stable machine-readable codes, not message strings. For example, `ACCOUNT_NOT_VERIFIED` can send a student to OTP verification, while `PENDING_VERIFICATION` can show a company approval-pending screen.

## Milestone 5 Completed - Authentication Middleware

Milestone 5 adds the protected-route gate that every private KUPC feature will rely on:

```text
authenticate
```

The backend now reads Bearer access tokens from the `Authorization` header, verifies JWT signature and expiry with `JWT_SECRET`, validates the decoded token payload shape, resolves the current user identity through a short-TTL cache with database fallback, rejects missing/invalid/expired tokens with stable error codes, rejects suspended/deleted users, attaches the resolved identity to `req.user`, and then calls `next()`.

### Files Changed For Milestone 5

```text
src/middleware/authenticate.ts
src/middleware/authUserCache.ts
src/types/express.d.ts
src/modules/auth/auth.types.ts
src/utils/jwt.ts
src/config/env.ts
src/config/config.ts
.env.example
PHASE_2_DOCUMENTATION.md
```

### Authentication Middleware Responsibilities

File:

```text
src/middleware/authenticate.ts
```

Current request flow:

```text
read Authorization header
  -> require Bearer <token>
  -> verify JWT signature and expiry
  -> validate decoded payload fields
  -> try auth user cache by user id
  -> on cache miss, load users row from Supabase/Postgres
  -> if company, load companies row for verification_status
  -> reject suspended/deleted users
  -> attach typed req.user
  -> call next()
```

Why this matters for KUPC:

Authentication is the single gate in front of student profiles, company dashboards, jobs, swiping, matches, chat, resumes, admin actions, and future analytics. Controllers should not re-parse tokens or guess who the user is. They should receive a request that has already been authenticated and can safely read `req.user`.

### Authorization Header Handling

The middleware expects:

```http
Authorization: Bearer <access_token>
```

Failure behavior:

```text
missing or malformed Bearer token -> HTTP 401, code MISSING_TOKEN
```

Why this matters for KUPC:

The frontend and API clients need one standard way to send access tokens. Returning `MISSING_TOKEN` makes it clear that the request did not reach authentication because no usable credential was provided. This is different from an invalid token, where a credential was provided but failed verification.

### JWT Signature, Expiry, And Payload Validation

File:

```text
src/utils/jwt.ts
```

The JWT helper now verifies:

- The token signature using `JWT_SECRET`.
- The token expiry configured through `JWT_EXPIRES_IN`.
- `sub` exists and is a string.
- `email` exists and is a string.
- `role` exists and is one of `STUDENT`, `COMPANY`, or `ADMIN`.
- `sessionId` exists and is a string.

Failure behavior:

```text
expired token -> HTTP 401, code TOKEN_EXPIRED
invalid signature or malformed payload -> HTTP 401, code INVALID_TOKEN
```

Why this matters for KUPC:

JWT verification should not stop at "the signature is valid." Protected routes also need the token to carry the exact fields the backend expects. Validating the payload shape prevents malformed or incomplete tokens from producing confusing runtime behavior deeper in controllers and services.

### User Identity Cache

File:

```text
src/middleware/authUserCache.ts
```

Current implementation:

```text
in-memory Map
short TTL
cache key = user id
database fallback on cache miss
```

Environment variable:

```env
AUTH_USER_CACHE_TTL_SECONDS=30
```

Why this matters for KUPC:

Every protected request needs user identity. Without caching, a busy dashboard, chat page, or swipe screen can repeatedly hit the database just to resolve the same user. A short TTL reduces repeated lookups while keeping account-status changes reasonably fresh.

Production note:

The Phase 2 PDF calls for Redis as the short-TTL cache. This codebase does not yet include Redis infrastructure or a Redis client dependency, so Milestone 5 introduces a cache abstraction with an in-memory backend. The route and middleware code now use the abstraction, which means the implementation can be swapped to Redis later without changing protected route handlers.

Security note:

Because user identity is cached briefly, account suspension or company verification changes may take up to `AUTH_USER_CACHE_TTL_SECONDS` to be reflected for already cached users. Keep this TTL short. For production, Redis plus explicit cache invalidation on admin account-status changes is recommended.

### Database Fallback

On cache miss, the middleware loads:

```text
users.id
users.email
users.role
users.email_verified
users.status
```

For company users, it also loads:

```text
companies.verification_status
```

Why this matters for KUPC:

The JWT proves that a token was signed by the backend, but the database still controls current account state. This is what lets the platform block suspended or deleted users even if their access token has not expired yet.

### Suspended And Deleted Account Blocking

If the resolved user has:

```text
status != active
```

the middleware returns:

```text
HTTP 403
code: ACCOUNT_SUSPENDED
```

Why this matters for KUPC:

Access tokens are stateless and may remain cryptographically valid until their short expiry. Checking account status on every authenticated request gives admins a way to cut off suspended or deleted accounts before token expiry, which is important for moderation and platform safety.

### Typed req.user

Files:

```text
src/types/express.d.ts
src/modules/auth/auth.types.ts
```

Current `req.user` shape:

```ts
{
  id: string;
  sessionId: string;
  role: Role;
  email: string;
  emailVerified: boolean;
  status: 'active' | 'suspended' | 'deleted';
  verificationStatus?: 'pending' | 'approved' | 'rejected';
}
```

Why this matters for KUPC:

Controllers and later modules can access identity safely without `any` casts. Student routes can use `req.user.id` as the owner id. Company routes can check `req.user.verificationStatus`. Logout and refresh-token work can use `req.user.sessionId` to connect requests back to a concrete login session.

### Protecting Routes

Milestone 5 is already used by the company verification document placeholder:

```text
POST /api/v1/auth/company/verification-documents
  -> authenticate
  -> authorize(Role.COMPANY)
  -> validate(companyVerificationDocumentSchema)
  -> authController.createCompanyVerificationDocument
```

Example pattern for future routes:

```ts
router.get('/profile', authenticate, profileController.getMyProfile);
```

Why this matters for KUPC:

Every private feature should use the same authentication entry point. That keeps route behavior predictable and prevents controller-level security drift as the project grows into profiles, resumes, jobs, swipes, matches, chat, notifications, and admin tools.

### Error Codes Used By Milestone 5

Current authentication middleware error codes:

```text
MISSING_TOKEN
INVALID_TOKEN
TOKEN_EXPIRED
ACCOUNT_SUSPENDED
```

Why this matters for KUPC:

The frontend can respond differently to each failure. `MISSING_TOKEN` can redirect to login, `TOKEN_EXPIRED` can trigger refresh-token rotation via `POST /api/v1/auth/refresh`, `INVALID_TOKEN` can force a clean sign-out, and `ACCOUNT_SUSPENDED` can show an account-status message.

### Milestone 5 Caveats

Current caveats:

- Redis is not wired yet; the cache abstraction currently uses an in-memory TTL cache.
- Session existence is not checked during `authenticate` yet; that belongs with future session-aware hardening.
- Production tests for token expiry, malformed tokens, suspended users, and cache behavior are still pending.

Why this matters for KUPC:

Milestone 5 now gives the backend a usable protected-route gate. The remaining caveats are infrastructure and hardening work that should be addressed before production, especially Redis-backed cache invalidation.

## Current Verification

Command run:

```bash
node node_modules/typescript/bin/tsc --noEmit
```

Result:

```text
Passes
```

Important environment note:

The TypeScript check had to be run outside the sandbox because pnpm symlinked packages in `node_modules` triggered a Windows `EPERM` read error inside the sandbox. The compile itself passed successfully.

## What Has Not Been Implemented Yet

The following are still pending:

- Full repository coverage for all later milestones.
- Full typed auth error subclasses.
- Production TOTP verification for admin login.
- Production OTP email delivery.
- True transaction/RPC for student and company registration.

## Immediate Blockers

Before running the backend normally, `.env` must be updated with real values:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
JWT_EXPIRES_IN=15m
REFRESH_EXPIRES_IN=30d
OTP_LENGTH=6
OTP_EXPIRES_IN=10m
OTP_MAX_ATTEMPTS=5
KU_EMAIL_DOMAIN=ku.edu.np
ADMIN_PASSWORD_LOGIN_ENABLED=false
```

Other blockers before completing Phase 2:

- Apply the Phase 2 migration in your Supabase project (see `supabase/README.md`).
- Required tables are defined in-repo:
  - `users`
  - `students`
  - `companies`
  - `sessions`
  - `refresh_tokens`
  - `student_otps`
  - `company_requests`
- A test framework should be kept green (`npm test`).
- Admin TOTP is not implemented yet. Password-only admin login is feature-flagged through `ADMIN_PASSWORD_LOGIN_ENABLED` and must stay disabled outside local/demo use.

## Phase 2 Data Model Reference

Phase 2 expects these tables:

### users

Purpose:

Stores the shared identity row for every student, company, and admin.

Columns used in Phase 2:

- `id`
- `email`
- `role`
- `email_verified`
- `status`
- `created_at`

### students

Purpose:

Stores student-specific identity/profile seed data.

Columns used in Phase 2:

- `id`
- `ku_id`
- `full_name`

More profile fields are expected in Phase 3.

### companies

Purpose:

Stores company identity and verification state.

Columns used in Phase 2:

- `id`
- `company_name`
- `website`
- `verification_status`
- `verified_at`

### sessions

Purpose:

Tracks login sessions and devices.

Columns used in Phase 2:

- `id`
- `user_id`
- `device_info`
- `ip_address`
- `created_at`
- `expires_at`

### refresh_tokens

Purpose:

Stores hashed refresh tokens for rotation and reuse detection.

Columns used in Phase 2:

- `id`
- `user_id`
- `session_id`
- `token_hash`
- `expires_at`
- `revoked`
- `created_at`

### student_otps

Purpose:

Stores hashed OTPs for KU student email verification.

Columns used in Phase 2:

- `id`
- `email`
- `otp_hash`
- `attempts`
- `expires_at`
- `consumed_at`
- `created_at`

### company_requests

Purpose:

Stores placeholder company verification document metadata in Phase 2.

Columns used in Phase 2:

- `id`
- `company_id`
- `document_type`
- `file_url`
- `status`

## Next Implementation Order

Recommended order from here:

1. Replace development OTP console delivery with a real email provider or Supabase email OTP integration.
2. Add registration RPCs for true transaction behavior.
3. Implement production admin TOTP enrollment and verification.

## Exit Checklist For Full Phase 2

- All auth endpoints validate request bodies with Zod.
- Student KU email validation works.
- Student OTP verification works.
- Tokens are not issued before student verification.
- Company registration creates `verification_status = pending`.
- Pending companies can log in but are blocked from restricted actions.
- Admin login route is separate from normal login.
- Access tokens are short-lived.
- Refresh tokens rotate on every use.
- Reuse of a revoked refresh token revokes the session family.
- Logout revokes the active refresh token and removes the session row.
- `req.user` is populated by authentication middleware.
- RBAC returns 403 for wrong-role access.
- Central error handler returns stable auth error codes.
- Supabase service-role key is only used in trusted backend code.
- `tsc --noEmit` passes.
- Phase 2 testing matrix passes.

## Milestone 6 — Role-Based Authorization (RBAC) (Completed)

Milestone 6 adds role-based authorization for protected routes using the `Role` enum and the `authorize()` middleware factory.

### Role Enum

```ts
enum Role {
  STUDENT = 'STUDENT',
  COMPANY = 'COMPANY',
  ADMIN = 'ADMIN',
}
```

Source of truth:

- `src/modules/auth/auth.constants.ts`

### authorize() Middleware Factory

File:

```text
src/middleware/authorize.ts
```

Behavior:

- If `req.user` is missing (meaning `authenticate` did not run or did not attach identity), return:
  - HTTP 401
  - code `MISSING_TOKEN`
- If `req.user.role` is not within the allowed roles list, return:
  - HTTP 403
  - code `INSUFFICIENT_ROLE`

Important ordering rule:

```text
Request -> authenticate -> authorize(...) -> controller
```

`authorize()` depends on `req.user`, so it must always run after `authenticate`.

### RBAC Smoke Routes (for verification & tests)

Milestone 6 introduces a minimal set of protected routes used to verify RBAC behavior:

```text
GET /api/v1/rbac/admin/dashboard   (ADMIN only)
GET /api/v1/rbac/student/dashboard (STUDENT only)
GET /api/v1/rbac/company/dashboard (COMPANY only)
```

File:

```text
src/routes/rbac.ts
```

### Test Cases (Automated)

Test file:

```text
src/__tests__/rbac.test.ts
```

Cases covered:

- Student token hitting an ADMIN-only route → 403 `INSUFFICIENT_ROLE`
- Company token hitting a STUDENT-only route → 403 `INSUFFICIENT_ROLE`
- No token at all hitting any protected route → 401 `MISSING_TOKEN`
- Valid token, correct role → 200 and controller executes

## Milestone 7 — `GET /api/v1/auth/me` (Completed)

Milestone 7 adds a simple authenticated identity endpoint so the frontend can restore session state and render role-aware UI.

### Route

```text
GET /api/v1/auth/me
```

### Behavior

- Requires `authenticate`.
- If the request is unauthenticated, returns:
  - HTTP 401
  - code `MISSING_TOKEN`
- If authenticated, returns:
  - HTTP 200
  - `data` containing the current `req.user` payload (see `AuthenticatedUser` type).

### Files

```text
src/modules/auth/auth.routes.ts
src/modules/auth/auth.controller.ts
src/modules/auth/auth.service.ts
```

### Test Cases (Automated)

Test file:

```text
src/__tests__/auth.me.test.ts
```

Cases covered:

- No token → 401 `MISSING_TOKEN`
- Valid token → 200 and returns user payload

## Milestone 8 — Refresh Token Rotation (Completed)

Milestone 8 adds refresh-token rotation so the frontend can obtain a new access/refresh token pair without forcing a full login.

### Route

```text
POST /api/v1/auth/refresh
```

### Request Body

```json
{
  "refresh_token": "<opaque refresh token>"
}
```

Validated by `refreshTokensSchema` in `src/modules/auth/auth.validation.ts`.

### Behavior

- Looks up the provided refresh token by SHA-256 hash.
- If missing/unknown → HTTP 401, code `INVALID_TOKEN`.
- If expired → HTTP 401, code `TOKEN_EXPIRED`.
- If already revoked (reuse detected):
  - Revokes all refresh tokens for the session family.
  - Deletes the parent session row.
  - Returns HTTP 401, code `REFRESH_TOKEN_REUSE_DETECTED`.
- On successful rotation:
  - Marks the old refresh token as revoked.
  - Creates a new refresh token under the same session.
  - Issues a new short-lived access JWT.
  - Returns HTTP 200 with `access_token`, `refresh_token`, and `user`.

### Files

```text
src/modules/auth/auth.routes.ts
src/modules/auth/auth.controller.ts
src/modules/auth/auth.service.ts
src/modules/auth/auth.validation.ts
src/database/refreshTokens.repository.ts
src/database/sessions.repository.ts
src/middleware/validate.ts
```

### Repository Methods Added

```text
refreshTokensRepository.findByHash
refreshTokensRepository.revokeById
refreshTokensRepository.revokeBySessionId
sessionsRepository.deleteById
```

### Test Cases (Automated)

Test file:

```text
src/__tests__/auth.refresh.test.ts
```

Cases covered:

- Valid refresh token → 200 and returns rotated tokens
- Reused (revoked) refresh token → 401 `REFRESH_TOKEN_REUSE_DETECTED` and session family revoked

## Milestone 9 — Logout (Completed)

Milestone 9 adds session logout so the frontend can end the active login session and invalidate refresh tokens for the current device/session.

### Route

```text
POST /api/v1/auth/logout
```

### Behavior

- Requires `authenticate` (Bearer access token).
- If unauthenticated → HTTP 401, code `MISSING_TOKEN`.
- Uses `req.user.sessionId` to identify the active login session.
- On success:
  - Revokes all refresh tokens linked to the session (`revokeBySessionId`).
  - Deletes the parent session row (`deleteById`).
  - Clears the in-memory auth user cache entry for the user.
  - Returns HTTP 200 with `{ logged_out: true }`.

Note: access JWTs remain valid until natural expiry because JWT verification is stateless. Refresh and future rotation for that session will fail after logout because the session row and refresh tokens are revoked. Logout now also requires `{ "refresh_token": "..." }` in the request body per the Phase 2 spec (`LogoutSchema`).

### Files

```text
src/modules/auth/auth.routes.ts
src/modules/auth/auth.controller.ts
src/modules/auth/auth.service.ts
src/database/refreshTokens.repository.ts
src/database/sessions.repository.ts
src/middleware/authUserCache.ts
```

### Test Cases (Automated)

Test file:

```text
src/__tests__/auth.logout.test.ts
```

Cases covered:

- No token → 401 `MISSING_TOKEN`
- Valid token → 200, revokes session refresh tokens, deletes session, clears user cache

## Milestone 10 — Protected Student & Admin Smoke-Test Endpoints (Completed)

Milestone 10 adds first-class protected dashboard smoke routes for student and admin domains. These are separate from the RBAC verification routes in Milestone 6 and provide stable integration targets for frontend/manual testing.

### Routes

```text
GET /api/v1/student/dashboard (STUDENT only)
GET /api/v1/admin/dashboard   (ADMIN only)
```

### Behavior

Both routes use the standard protected-route stack:

```text
Request -> authenticate -> authorize(Role.<STUDENT|ADMIN>) -> handler
```

Responses:

- Unauthenticated → HTTP 401, code `MISSING_TOKEN`
- Wrong role → HTTP 403, code `INSUFFICIENT_ROLE`
- Correct role → HTTP 200 with `{ ok: true, role: <role> }`

### Files

```text
src/routes/student.ts
src/routes/admin.ts
src/routes/index.ts
```

### Relationship To Milestone 6 RBAC Routes

Milestone 6 RBAC routes under `/api/v1/rbac/*` remain the middleware verification harness. Milestone 10 routes mirror that behavior under domain-specific prefixes (`/student`, `/admin`) that future student/admin modules can extend.

### Test Cases (Automated)

Test file:

```text
src/__tests__/smoke.dashboards.test.ts
```

Cases covered:

- Student dashboard: no token → 401 `MISSING_TOKEN`
- Student dashboard: ADMIN token → 403 `INSUFFICIENT_ROLE`
- Student dashboard: STUDENT token → 200
- Admin dashboard: no token → 401 `MISSING_TOKEN`
- Admin dashboard: STUDENT token → 403 `INSUFFICIENT_ROLE`
- Admin dashboard: ADMIN token → 200

## Milestone 11 — Phase 2 Testing Matrix (Completed)

Milestone 11 adds automated coverage mapped to the Phase 2 exit checklist, plus a repeatable verification command for TypeScript.

### Automated Matrix Test File

```text
src/__tests__/phase2.matrix.test.ts
```

### Matrix Coverage (Exit Checklist Mapping)

| Exit checklist item | Automated coverage |
| --- | --- |
| All auth endpoints validate request bodies with Zod | Matrix validation tests for student register, company register, login, admin login, verify-otp |
| Student KU email validation works | Non-KU email returns `INVALID_EMAIL_DOMAIN` |
| Admin login route is separate from normal login | Both `/login` and `/admin/login` are mounted and validated |
| Pending companies blocked from restricted actions | `requireVerifiedCompany` returns `PENDING_VERIFICATION` for pending companies |
| Refresh tokens require valid input | Missing refresh token returns `INVALID_TOKEN` |
| Central error handler returns stable auth error codes | Error envelope includes `success: false`, `error.code`, `error.statusCode` |
| RBAC / `/me` / refresh / logout / smoke dashboards | Covered in Milestones 6–10 test files |

### Related Test Suites (Milestones 6–10)

```text
src/__tests__/rbac.test.ts
src/__tests__/auth.me.test.ts
src/__tests__/auth.refresh.test.ts
src/__tests__/auth.logout.test.ts
src/__tests__/smoke.dashboards.test.ts
```

### Verification Commands

```bash
npm test
npm run typecheck
```

`npm test` runs the full automated matrix (Milestones 6–11). `npm run typecheck` runs `tsc --noEmit`.

### Manual Verification (when Supabase is configured)

Use a real `.env` and Supabase tables to manually verify flows that require live Auth/DB integration:

1. Student register → OTP verify → login → `GET /me` → refresh → logout (with `refresh_token` body)
2. Company register (`verification_status = pending`) → login → `POST /jobs` returns `403 PENDING_VERIFICATION`
3. Admin login via `/admin/login` with TOTP (or demo flag locally)
4. Wrong-role access to `/student/dashboard`, `/admin/dashboard`, and `/rbac/*` routes
5. `POST /auth/logout-all` revokes all sessions
6. Browse `/api/docs` for OpenAPI contract

See **Phase 2 Gap Closure** section at the end of this document for full operational checklist.

## Milestone 12 — Phase 2 Database Schema (Completed)

Milestone 12 adds in-repo Supabase SQL migrations for all Phase 2 authentication tables so the backend schema is versioned, reviewable, and repeatable across environments.

### Migration File

```text
supabase/migrations/20260709000000_phase2_auth_schema.sql
```

### Tables Created

```text
users
students
companies
sessions
refresh_tokens
student_otps
company_requests
```

### Schema Highlights

- `users.id` references `auth.users(id)` (Supabase Auth identity linkage).
- `students`, `companies`, `sessions`, `refresh_tokens`, and `company_requests` reference `users` / `companies` with `ON DELETE CASCADE`.
- `refresh_tokens.token_hash` has a unique index for rotation lookups.
- `student_otps` has an index for latest active OTP lookup by email.
- Row Level Security is enabled on all Phase 2 tables (backend uses service-role for trusted access).

### Apply Instructions

See:

```text
supabase/README.md
```

Quick path: paste the migration SQL into the Supabase SQL editor and run it once per project.

### Test Cases (Automated)

Test file:

```text
src/__tests__/phase2.schema.test.ts
```

Cases covered:

- Migration file exists
- All seven Phase 2 tables are defined
- `users.id` links to `auth.users`
- Refresh token hash index exists
- RLS is enabled on Phase 2 tables

---

## Phase 2 Gap Closure — PDF Exit Checklist (Completed 2026-07-09)

This section documents every remaining gap identified against the official spec (`KUPC_Phase2_Authentication_Authorization (1).md`) and explains **what** was implemented, **why** it was needed, and **which files** were touched.

The repo previously used custom milestone numbers (7 = `/me`, 12 = DB schema). The items below are mapped to the **official PDF milestone numbers** so the exit checklist can be verified directly against the spec.

### PDF Milestone Map (Final)

| PDF # | Topic | Status |
| --- | --- | --- |
| 1 | Auth module foundation | Done (Milestone 1) |
| 2 | Student registration & OTP | Done |
| 3 | Company registration | Done |
| 4 | Login (student / company / admin + TOTP) | Done |
| 5 | Authentication middleware | Done |
| 6 | RBAC | Done (Milestone 6) |
| 7 | Pending company middleware | Done |
| 8 | Refresh token rotation | Done (Milestone 8) |
| 9 | Logout & session revocation | Done |
| 10 | Protected endpoints | Done |
| 11 | Error handling & error codes | Done |
| 12 | Request validation (Zod) | Done |
| 13 | Testing matrix | Done (automated + manual guide) |

---

### Gap 1 — Typed Error Subclasses (PDF Milestone 11)

**What it is**

The spec requires auth failures to throw typed `AppError` subclasses — `UnauthorizedError` (401), `ForbiddenError` (403), and `ValidationError` (400) — so the central error handler can map stable machine-readable codes without controllers building error JSON by hand.

**Why it was done**

A single generic `AppError` worked functionally, but middleware and validation layers are the highest-traffic auth code paths. Typed subclasses make intent explicit (`401` vs `403` vs `400`), match the spec's class diagram, and let TypeScript callers distinguish error families with `instanceof` if needed.

**What changed**

File: `src/utils/AppError.ts`

- Added `UnauthorizedError`, `ForbiddenError`, and `ValidationError` extending `AppError`.
- Updated middleware to use them:
  - `src/middleware/authenticate.ts` — `UnauthorizedError` for missing/invalid/expired tokens; `ForbiddenError` for suspended accounts.
  - `src/middleware/authorize.ts` — `UnauthorizedError` / `ForbiddenError` for RBAC failures.
  - `src/middleware/requireVerifiedCompany.ts` — `ForbiddenError` for pending companies.
  - `src/middleware/validate.ts` — `ValidationError` for Zod failures.

The global `errorHandler` did not need changes because all subclasses still extend `AppError`.

---

### Gap 2 — LogoutSchema + Refresh Token Body Validation (PDF Milestones 9 & 12)

**What it is**

The spec defines logout as:

```http
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
{ "refresh_token": "..." }
```

The server must verify the refresh token belongs to the current session, revoke all refresh tokens for that session, delete the session row, and clear cached user identity.

**Why it was done**

Logging out using only the access JWT's `sessionId` works, but it does not prove the client still holds the matching refresh token. Requiring `refresh_token` in the body closes a gap where a stolen access token alone could revoke someone else's session if session IDs were ever guessable. It also matches the Zod schema table in Milestone 12.

**What changed**

- `src/modules/auth/auth.validation.ts` — added `logoutSchema` requiring `refresh_token`.
- `src/modules/auth/auth.routes.ts` — `POST /logout` now runs `validate(logoutSchema)` after `authenticate`.
- `src/modules/auth/auth.service.ts` — `logout()` hashes the provided refresh token, looks it up via `refreshTokensRepository.findByHash`, verifies it matches `req.user.sessionId` and is not revoked, then revokes the session family and deletes the session.
- `src/__tests__/auth.logout.test.ts` — updated for body validation and hash lookup.

---

### Gap 3 — Logout All Devices (PDF Milestone 9 optional hardening)

**What it is**

`POST /api/v1/auth/logout-all` revokes **every** refresh token and deletes **every** session row for the authenticated user — a "log out everywhere" security action.

**Why it was done**

The spec lists this as optional hardening. KUPC admins and students will eventually need to recover from device theft or shared-computer sessions. Implementing it in Phase 2 is low cost because session and refresh-token repositories already exist.

**What changed**

- `src/modules/auth/auth.routes.ts` — `POST /logout-all` with `authenticate` only (no refresh body needed; user identity is enough).
- `src/modules/auth/auth.service.ts` — `logoutAll()` calls `revokeAllByUserId` + `deleteAllByUserId` + cache clear.
- `src/database/sessions.repository.ts` — `deleteAllByUserId`.
- `src/database/refreshTokens.repository.ts` — `revokeAllByUserId`.
- `src/__tests__/auth.logout-all.test.ts` — new test suite.

---

### Gap 4 — Admin TOTP Verification (PDF Milestone 4)

**What it is**

Admin login must require a 6-digit TOTP code in addition to email/password. The spec allows a **demo-only** password path behind `ADMIN_PASSWORD_LOGIN_ENABLED`, but production must enforce 2FA.

**Why it was done**

Admin accounts can approve companies, moderate content, and access sensitive data in later phases. Shipping password-only admin auth without a tracked 2FA path would violate the security model from day one.

**What changed**

- `src/utils/totp.ts` — `verifyAdminTotp()` using `speakeasy` (RFC 6238 TOTP, base32 secret, ±1 window).
- `src/config/env.ts` — `ADMIN_TOTP_SECRET` (optional base32 secret, min 16 chars).
- `src/modules/auth/auth.service.ts` — `adminLogin()`:
  - When `ADMIN_PASSWORD_LOGIN_ENABLED=false` (production default): TOTP required and verified.
  - When demo flag is `true`: password-only allowed for local/hackathon; TOTP still verified if provided.
- `.env.example` — documents both flags.
- `src/__tests__/auth.totp.test.ts` — unit tests for valid/invalid codes.

**Production setup**

1. Generate a secret: `speakeasy generate-secret` (or any base32 TOTP secret).
2. Set `ADMIN_TOTP_SECRET=<base32>` and `ADMIN_PASSWORD_LOGIN_ENABLED=false`.
3. Enroll the secret in Google Authenticator / Authy for admin users.

---

### Gap 5 — Production OTP Email Delivery (PDF Milestone 2)

**What it is**

Student registration must **deliver** the OTP to the student's KU email — not only store a hash in `student_otps`. In development, console output is acceptable; in production, real email delivery is required.

**Why it was done**

Without delivery, student registration is untestable end-to-end in staging/production and violates the Definition of Done ("Students can register with a KU email and verify via OTP").

**What changed**

- `src/utils/email.ts` — `sendStudentOtpEmail()` using `nodemailer` when `OTP_EMAIL_ENABLED=true` and SMTP vars are set.
- `src/config/env.ts` — `OTP_EMAIL_ENABLED`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
- `src/modules/auth/auth.service.ts` — `deliverStudentOtp()` delegates to `sendStudentOtpEmail()`.
- `.env.example` — SMTP template documented.

**Behavior**

| Environment | `OTP_EMAIL_ENABLED` | Result |
| --- | --- | --- |
| development | `false` | OTP logged to console (safe local DX) |
| production | `true` + SMTP | Email sent via configured SMTP relay |
| production | `true` without SMTP | Registration fails fast with clear error |

---

### Gap 6 — Session Existence Check in `authenticate` (PDF Milestone 5)

**What it is**

After JWT signature verification, the middleware must confirm the `sessionId` embedded in the access token still exists in the `sessions` table and has not expired. A valid JWT for a deleted/logged-out session must be rejected.

**Why it was done**

Access tokens are stateless JWTs — they remain cryptographically valid until expiry even after logout. Checking the session row closes the gap between "JWT parses" and "session is still active", which is especially important immediately after logout or admin session revocation.

**What changed**

- `src/database/sessions.repository.ts` — `findById(id)`.
- `src/middleware/authenticate.ts` — `loadUserIdentity()` loads session by `sessionId`, verifies `session.user_id === payload.sub`, and rejects expired sessions before loading user profile.

---

### Gap 7 — Redis-Backed Auth User Cache (PDF Milestone 5)

**What it is**

The spec calls for a short-TTL Redis cache of user identity (`id`, `role`, `status`, `email_verified`) to avoid hitting Postgres on every authenticated request. When Redis is unavailable (local dev), an in-memory fallback is acceptable.

**Why it was done**

In production with multiple API instances, an in-memory cache is per-process and ineffective. Redis provides a shared cache with TTL eviction matching the spec's performance model.

**What changed**

- `src/middleware/authUserCacheStore.ts` — `MemoryAuthUserCacheStore` and `RedisAuthUserCacheStore` (via `ioredis`), selected by `REDIS_URL`.
- `src/middleware/authUserCache.ts` — async facade used by `authenticate` and logout paths.
- `src/config/env.ts` — optional `REDIS_URL`.

**Behavior**

- `REDIS_URL` set → Redis keys `kupc:auth:user:<userId>` with TTL from `AUTH_USER_CACHE_TTL_SECONDS`.
- `REDIS_URL` unset → in-memory `Map` (single-instance dev/test).

---

### Gap 8 — Atomic Registration RPCs (PDF Milestones 2 & 3)

**What it is**

Student registration must insert `users` + `students` in one database transaction. Company registration must insert `users` + `companies` atomically. Previously, two separate repository calls could leave orphaned rows if the second insert failed.

**Why it was done**

Partial registration states (Auth user exists, `users` row exists, but `students` missing) are painful to debug and violate the spec's "same transaction" requirement. PostgreSQL RPC functions with `SECURITY DEFINER` run both inserts in one transaction.

**What changed**

- `supabase/migrations/20260709000001_phase2_registration_rpcs.sql`:
  - `register_student_profile(p_user_id, p_email, p_ku_id, p_full_name)`
  - `register_company_profile(p_user_id, p_email, p_company_name, p_website, p_email_verified)`
- `src/database/users.repository.ts` — `registerStudentProfile()` and `registerCompanyProfile()` call `supabaseAdmin.rpc(...)`.
- `src/modules/auth/auth.service.ts` — registration flows use RPC methods instead of separate inserts.
- `supabase/README.md` — apply migrations in order.
- `src/__tests__/phase2.schema.test.ts` — validates RPC migration file exists.

**Note:** Supabase Auth user creation still happens outside Postgres (Supabase API). On failure after Auth user creation, the service still deletes the Auth user as a compensating action — the RPC guarantees atomicity **within** the application database.

---

### Gap 9 — Pending Company Gate on Real Restricted Route (PDF Milestone 7)

**What it is**

`requireVerifiedCompany` must block pending companies from restricted actions such as **job creation**. The middleware must read `verification_status` from the database (not only from JWT claims) and return `403 PENDING_VERIFICATION`.

**Why it was done**

The exit checklist explicitly requires: "Pending-company gate verified against at least one restricted route (job creation)." Middleware unit tests alone do not prove the full `authenticate → authorize → requireVerifiedCompany → controller` pipeline.

**What changed**

- `src/middleware/requireVerifiedCompany.ts` — now `async`; calls `companiesRepository.findByUserId(req.user.id)` and checks `verification_status === 'approved'`.
- `src/routes/jobs.ts` — `POST /api/v1/jobs` placeholder:
  ```text
  authenticate → authorize(COMPANY) → requireVerifiedCompany → 201 placeholder response
  ```
- `src/routes/index.ts` — mounts `/jobs`.
- `src/__tests__/jobs.pending.test.ts` — pending → 403, approved → 201, student → 403 `INSUFFICIENT_ROLE`.

**Design choice:** `POST /auth/company/verification-documents` intentionally does **not** use `requireVerifiedCompany`, because pending companies must still submit verification documents during onboarding.

---

### Gap 10 — Swagger / OpenAPI Documentation (PDF Exit Checklist)

**What it is**

Every auth endpoint must appear in generated Swagger documentation so frontend and QA can discover request/response shapes without reading source code.

**Why it was done**

The exit checklist states: "Every endpoint has a Zod schema and appears in the generated Swagger doc." This is the contract between backend and the Vite frontend team for Phase 3+.

**What changed**

- `src/config/swagger.ts` — OpenAPI 3.0 spec for all Phase 2 auth, protected, and jobs endpoints.
- `src/app.ts` — serves UI at `GET /api/docs` via `swagger-ui-express`.
- `src/__tests__/phase2.swagger.test.ts` — verifies docs route returns 200.

**Intentional omission:** `POST /auth/admin/login` is documented in the spec object but marked as admin-only in the description — it should not be linked from public student/company client SDKs in production frontends.

---

### Gap 11 — Full Testing Matrix Coverage (PDF Milestone 13)

**What it is**

Milestone 13 defines a manual + automated matrix covering students, companies, admins, JWT edge cases, refresh rotation, and pending-company blocking.

**Why it was done**

Phase 2 is a **hard dependency gate** for Phase 3. The matrix proves each milestone independently before profile work begins.

**Automated coverage (50 tests, `npm test`)**

| Test file | PDF matrix area |
| --- | --- |
| `phase2.matrix.test.ts` | Zod validation, KU email, admin route separation, pending gate, error envelope |
| `rbac.test.ts` | RBAC all roles / wrong role 403 |
| `auth.me.test.ts` | `GET /auth/me` |
| `auth.refresh.test.ts` | Rotation + `REFRESH_TOKEN_REUSE_DETECTED` |
| `auth.logout.test.ts` | Logout with `refresh_token` body |
| `auth.logout-all.test.ts` | Logout all devices |
| `auth.totp.test.ts` | Admin TOTP verify |
| `jobs.pending.test.ts` | Pending company blocked on `POST /jobs` |
| `smoke.dashboards.test.ts` | Student/admin dashboard RBAC |
| `phase2.schema.test.ts` | SQL migrations + RPC migration |
| `phase2.swagger.test.ts` | OpenAPI docs served |

**Manual verification (requires live Supabase + `.env`)**

Run after applying both migrations:

1. Student: register KU email → receive OTP (email or console) → verify → login → `/me` → refresh → logout.
2. Company: register → `verification_status=pending` in DB → login succeeds → `POST /jobs` returns `403 PENDING_VERIFICATION`.
3. Admin: login with TOTP → `GET /admin/dashboard` returns 200.
4. Refresh reuse: use a refresh token twice → second call returns `REFRESH_TOKEN_REUSE_DETECTED`.

---

## Operational Checklist Before Production

### Automated setup (recommended)

From `kupc-backend/`:

```bash
npm run setup:phase2   # generates .env: JWT secret, admin TOTP, dev SMTP (Ethereal)
```

Then create a Supabase project (first time): see `supabase/SETUP.md`.

Fill `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `DATABASE_URL` in `.env`, then:

```bash
npm run db:migrate     # applies both SQL migrations
npm test
npm run typecheck
npm run dev            # http://localhost:5000/api/docs
```

### Manual checklist (same steps)

1. Run `supabase/migrations/20260709000000_phase2_auth_schema.sql`
2. Run `supabase/migrations/20260709000001_phase2_registration_rpcs.sql`
3. Set `OTP_EMAIL_ENABLED=true` and configure SMTP (or use Ethereal from `setup:phase2`)
4. Set `ADMIN_TOTP_SECRET` and `ADMIN_PASSWORD_LOGIN_ENABLED=false`
5. Optionally set `REDIS_URL` for multi-instance deployments
6. Run `npm test` and `npm run typecheck`
7. Browse `http://localhost:5000/api/docs` to verify OpenAPI

---

## Phase 2 Exit Checklist — Final Verification

| Exit checklist item | Verified by |
| --- | --- |
| All 13 milestones complete and individually tested | Automated suites above + manual guide |
| Every endpoint has Zod schema + Swagger doc | `auth.validation.ts` + `/api/docs` |
| Every error path returns stable codes, never raw stack traces | `errorHandler` + typed errors |
| Refresh rotation + reuse attack | `auth.refresh.test.ts` |
| RBAC all three roles both directions | `rbac.test.ts`, `smoke.dashboards.test.ts` |
| Pending company blocked on job creation | `jobs.pending.test.ts` |
| Service-role key only in config + trusted services | `supabase.ts` + repositories/services |
| Feature-based module structure | `src/modules/auth/` pattern established |

**Phase 3 (Student & Company Profiles) may begin once migrations are applied in your Supabase project and production env vars are configured.**

