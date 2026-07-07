# KUPC Phase 2 - Authentication & Authorization

Source document reviewed: `KUPC_Phase2_Authentication_Authorization.pdf`

Status date: 2026-07-07

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

Milestone 1 is now implemented as foundation scaffolding. It does not implement registration, login, OTP, refresh-token rotation, or logout yet. Its purpose is to prepare the backend so those features can be added cleanly in later milestones.

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
  role: Role;
  email: string;
  emailVerified: boolean;
  status: 'active' | 'suspended' | 'deleted';
  verificationStatus?: 'pending' | 'approved' | 'rejected';
}
```

Why this matters for KUPC:

Every protected route will eventually depend on `req.user`. Student-only routes, company-only routes, admin routes, and pending-company checks need a consistent identity shape.

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

### 12. Added Middleware Placeholders

Files:

- `src/middleware/authenticate.ts`
- `src/middleware/authorize.ts`
- `src/middleware/requireVerifiedCompany.ts`
- `src/middleware/attachUser.ts`

Current state:

- `authenticate.ts` is a placeholder and returns 501.
- `authorize.ts` checks `req.user.role` and enforces allowed roles.
- `requireVerifiedCompany.ts` checks that the user is a company and has `verificationStatus = approved`.
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

### 13. Added Repository Placeholders

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

### 14. Added Utility Placeholders

Files:

- `src/utils/jwt.ts`
- `src/utils/auth.ts`

Planned use:

- `jwt.ts` will sign and verify access tokens.
- `auth.ts` will hold password/OTP/token hashing helpers.

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

The access token powers immediate protected API access. The refresh token supports long-lived login sessions and prepares the backend for Milestone 8 refresh-token rotation.

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

## Current Verification

Command run:

```bash
tsc --noEmit
```

Result:

```text
Passes
```

Important environment note:

The TypeScript check had to be run outside the sandbox because pnpm symlinked packages in `node_modules` triggered a Windows `EPERM` read error inside the sandbox. The compile itself passed successfully.

## What Has Not Been Implemented Yet

The following are still pending:

- Company registration controller/service logic.
- Company verification document placeholder endpoint.
- Login endpoint.
- Admin login endpoint.
- JWT signing and verification.
- Refresh token generation, hashing, storage, and rotation.
- Session tracking.
- Logout.
- `GET /api/v1/auth/me`.
- Student dashboard smoke route.
- Admin dashboard smoke route.
- Full repository coverage for all later milestones.
- Full typed auth error subclasses.
- Production OTP email delivery.
- True transaction/RPC for student registration.
- Tests.

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
```

Other blockers before completing Phase 2:

- Database schema/migrations are not present in the repo.
- Required tables need to exist in Supabase/Postgres:
  - `users`
  - `students`
  - `companies`
  - `sessions`
  - `refresh_tokens`
  - `student_otps`
  - `company_requests`
- A test framework is not configured.
- Admin TOTP needs a decision:
  - implement full TOTP now, or
  - feature-flag a demo-only password path with a tracked TODO.

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

1. Create/verify Supabase tables for `users`, `students`, `sessions`, `refresh_tokens`, and `student_otps`.
2. Replace development OTP console delivery with a real email provider or Supabase email OTP integration.
3. Add a registration RPC for true transaction behavior.
4. Build `POST /api/v1/auth/register/company`.
5. Build company verification document placeholder endpoint.
6. Build `POST /api/v1/auth/login`.
7. Build `POST /api/v1/auth/admin/login`.
8. Implement `authenticate`.
9. Finalize `authorize`.
10. Finalize `requireVerifiedCompany`.
11. Build refresh-token rotation.
12. Build logout.
13. Add protected smoke-test endpoints.
14. Add tests/manual verification for the Phase 2 matrix.

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
