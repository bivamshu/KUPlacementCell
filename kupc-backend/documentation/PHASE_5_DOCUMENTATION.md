# KUPC Phase 5 — Student & Company Profiles + Frontend Integration Foundation

**Status:** Phase 5 complete (Backend B1–B5 + Frontend F1–F8)  
**Date:** 2026-07-17  
**Depends on:** Phase 2 (Auth), Phase 3B (DB/repos), Phase 4 (Resumes)  
**References:** `KUPC_Phase5_Specification.pdf`, `frontend/documentation/PHASE_A_DOCUMENTATION.md`, `frontend/documentation/PHASE_B_E_DOCUMENTATION.md`, `frontend/INTEGRATION.md`  
**Feeds into:** Phase 6 — Job Posting & Discovery

| Milestone | Side | Topic | Status |
| --- | --- | --- | --- |
| B1 | Backend | Students profile module | **Complete** |
| B2 | Backend | Companies profile module | **Complete** |
| B3 | Backend | Avatar & logo storage | **Complete** |
| B4 | Backend | Swagger, errors, hardening | **Complete** |
| B5 | Backend | Phase 5 test matrix | **Complete** |
| F1 | Frontend | API client & environment | **Complete** |
| F2 | Frontend | Token storage & AuthContext | **Complete** |
| F3 | Frontend | Auth screens | **Complete** |
| F4 | Frontend | Guards & role routing | **Complete** |
| F5 | Frontend | Student profile wiring | **Complete** |
| F6 | Frontend | Company profile editor | **Complete** |
| F7 | Frontend | Resume analyzer wiring | **Complete** |
| F8 | Frontend | UX polish & INTEGRATION.md | **Complete** |

---

# What Phase 5 Is

Phase 5 makes the product usable end-to-end for authenticated students and companies by delivering **profile APIs** on the backend and (in later milestones) wiring the frontend prototype to real backend services — starting with auth, profiles, and resume analysis.

**Phase 2** answered: *Who is making this request?*  
**Phase 3** answered: *Where do student/company rows live?*  
**Phase 4** answered: *How does a resume get uploaded and scored?*  
**Phase 5** answers: *How does a user read and update their profile, and how does the frontend stop using mock data?*

## Why this phase exists

Backend Specification v2.0 listed Job Posting as “Phase 5,” but the earlier Profiles work was never shipped as HTTP APIs. Phase 4 docs explicitly target Profiles next. The frontend still has essentially **0% API integration** — job endpoints would have no consumer. Company verification middleware and job posting also need real company identity and profile metadata first.

## Design decisions (locked for this phase)

| Decision | Choice | Why |
| --- | --- | --- |
| Module layout | Mirror `src/modules/resumes/` | Same Controller → Service → Repository layering |
| Repositories | Reuse Phase 3 `studentsRepository` / `companiesRepository` | No new table access in feature modules |
| HTTP field naming | snake_case on the wire | Matches auth (`full_name`) and resumes (`file_name`) |
| Service update input | camelCase (`UpdateStudentProfileInput`) | Matches `StudentProfileUpdate` in the repository |
| Mount path | Plural `/students`, `/companies` | Distinct from stub `/student` dashboard route |
| Scope of B1 | Students only (no avatar upload, no Swagger) | Avatar = B3; OpenAPI = B4 |

## Out of scope for Phase 5 overall

- Job posting / discovery (Phase 6)
- Swipe / match / chat
- Admin company approval UI (backend verification status already exists)
- Full App.tsx → react-router rewrite (optional stretch)

---

# Milestone B1 — Students Profile Module

**Status:** Complete  
**Depends on:** Phase 2 auth middleware (`authenticate` / `authorize`), `studentsRepository`, Phase 4 `resumesRepository` (optional active-resume join)  
**Does not include:** Avatar upload (B3), companies module (B2), Swagger paths (B4), full Phase 5 matrix (B5)

## What it is

Milestone B1 exposes authenticated student profile **read/update** and a **public card** endpoint for any authenticated role. It turns the Phase 3 `students` table into a usable product surface without inventing new database access.

Deliverables: TypeScript DTOs, Zod validation, mappers, error codes, service/controller/routes under `src/modules/students/`, mount at `/api/v1/students`, and HTTP + unit tests under `src/__tests__/phase5.*`.

## Why it happens first

Without a students module, companies (B2) have no pattern to copy, frontend profile screens (F5) have nothing to call, and avatar upload (B3) has nowhere to persist `profile_picture_url`. Locking contracts and auth gates first mirrors how Phase 4 started with the resumes scaffold.

## What was decided / locked

### B1.1 HTTP contracts

| Method | Path | Auth | Success | Purpose |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/students/me` | Student | 200 | Own profile + optional active resume summary |
| `PATCH` | `/api/v1/students/me` | Student | 200 | Update allowed profile fields |
| `GET` | `/api/v1/students/:id` | Any authenticated role | 200 | Public student card (no `phone` / `ku_id`) |

**Auth failures:**

| Case | Status | Code |
| --- | --- | --- |
| Missing / invalid JWT | **401** | `MISSING_TOKEN` (or related auth codes) |
| Authenticated but not `STUDENT` on `/me` | **403** | `INSUFFICIENT_ROLE` |
| Unknown student id | **404** | `STUDENT_NOT_FOUND` |
| Invalid UUID / invalid PATCH body (e.g. `cgpa` > 4) | **400** | `VALIDATION_ERROR` |

Route order: register `/me` **before** `/:id` so `"me"` is never captured as an id. `/:id` also requires a UUID via Zod.

### B1.2 Response DTOs

**Own profile** (`StudentProfileDto`) — snake_case:

```json
{
  "id": "uuid",
  "ku_id": "078bct000",
  "full_name": "Test Student",
  "graduation_year": 2026,
  "department": "Computer Engineering",
  "phone": "9800000000",
  "degree": "B.E.",
  "cgpa": 3.5,
  "bio": "Hello",
  "profile_picture_url": null,
  "resume_id": "uuid-or-null",
  "active_resume": {
    "id": "uuid",
    "file_name": "resume.pdf",
    "uploaded_at": "2026-07-11T09:00:00.000Z"
  },
  "created_at": "...",
  "updated_at": "..."
}
```

When `resume_id` is null or the resume row is missing, `active_resume` is `null`.

**Public card** (`StudentPublicCardDto`) — same fields **except** `phone`, `ku_id`, and `active_resume` are omitted (private / not needed for discover).

### B1.3 PATCH body (allowed fields)

Snake_case on the wire; at least one field required:

| Field | Rules |
| --- | --- |
| `full_name` | optional string, 2–100 chars |
| `phone` | optional string or `null` / `""` (clears) |
| `degree` | optional string or null/empty |
| `bio` | optional string or null/empty (max 2000) |
| `department` | optional string or null/empty |
| `cgpa` | optional number 0–4, or `null` |
| `graduation_year` | optional integer 2000–2100, or `null` |

**Not allowed via PATCH:** `profile_picture_url` (B3 avatar upload), `resume_id` (Phase 4 worker owns active resume), `ku_id` (identity from registration).

Validated body is mapped to camelCase `UpdateStudentProfileInput` before `studentsRepository.updateProfile`.

### B1.4 Error codes

Defined in `students.constants.ts` / helpers in `students.errors.ts`:

| Code | HTTP | Used when |
| --- | --- | --- |
| `STUDENT_NOT_FOUND` | 404 | No `students` row for JWT user or `:id` |
| `STUDENT_PROFILE_FORBIDDEN` | 403 | Reserved for future ownership / cross-access cases |
| `INVALID_PROFILE_PAYLOAD` | 400 | Reserved for service-level payload rejects |
| `VALIDATION_ERROR` | 400 | Zod failures via shared `validate` middleware (invalid `cgpa`, bad UUID, empty PATCH) |

### B1.5 Module layout

```text
src/modules/students/
  students.constants.ts   — STUDENT_ERROR_CODES
  students.types.ts       — StudentProfileDto, StudentPublicCardDto, UpdateStudentProfileInput
  students.validation.ts  — updateStudentProfileSchema, studentIdParamsSchema
  students.errors.ts      — AppError helpers
  students.mapper.ts      — Record → DTO; snake PATCH → camel update input
  students.service.ts     — getMe, updateMe, getPublicById
  students.controller.ts  — thin successResponse adapters
  students.routes.ts      — authenticate + role gates
  index.ts                — export studentsRouter + public types/constants
```

**Wire into:**

```text
src/routes/index.ts  →  router.use('/students', studentsRouter)
```

Full prefix remains `/api/v1` from `app.ts`. Legacy `GET /api/v1/student/dashboard` is unchanged.

**Layering (unchanged from Phase 3/4):**

```text
Controller → Service → Repository → Supabase
```

- Controllers: read `req.user.id` / params, call service, send envelope  
- Services: orchestration only (find, optional resume join, update)  
- Repositories: only `studentsRepository` / `resumesRepository` touch Supabase  

### B1.6 Service behavior

| Method | Behavior |
| --- | --- |
| `getMe(userId)` | `findById`; 404 if null; if `resume_id` set, load resume via `resumesRepository.findById` for `active_resume` |
| `updateMe(userId, input)` | Ensure row exists; `updateProfile`; return mapped DTO with resume summary |
| `getPublicById(id)` | `findById`; 404 if null; public mapper (strips `phone` / `ku_id`) |

### B1.7 Implementation steps (what was done)

1. Created `src/modules/students/` mirroring the resumes module structure.  
2. Added types: `StudentProfileDto`, `StudentPublicCardDto`, `UpdateStudentProfileInput`, `ActiveResumeSummary`.  
3. Added Zod schemas for PATCH body and `:id` UUID params.  
4. Added stable error codes + `AppError` helpers.  
5. Added mappers: full profile, public card, PATCH snake → camel.  
6. Implemented service methods against existing repositories.  
7. Added thin controller + routes (`authenticate` on all; `STUDENT` for `/me`; `STUDENT | COMPANY | ADMIN` for `/:id`).  
8. Exported from `index.ts` and mounted at `/students` in `src/routes/index.ts`.  
9. Added `phase5.students.test.ts` and `phase5.mapper.test.ts`; script `npm run test:phase5`.  
10. Documented this milestone in `PHASE_5_DOCUMENTATION.md`.

### B1.8 Files touched

| Action | Path |
| --- | --- |
| Create | `src/modules/students/students.constants.ts` |
| Create | `src/modules/students/students.types.ts` |
| Create | `src/modules/students/students.validation.ts` |
| Create | `src/modules/students/students.errors.ts` |
| Create | `src/modules/students/students.mapper.ts` |
| Create | `src/modules/students/students.service.ts` |
| Create | `src/modules/students/students.controller.ts` |
| Create | `src/modules/students/students.routes.ts` |
| Create | `src/modules/students/index.ts` |
| Edit | `src/routes/index.ts` |
| Edit | `package.json` (`test:phase5`) |
| Create | `src/__tests__/phase5.students.test.ts` |
| Create | `src/__tests__/phase5.mapper.test.ts` |
| Create | `documentation/PHASE_5_DOCUMENTATION.md` |

### B1.9 Tests

| File | Covers |
| --- | --- |
| `phase5.students.test.ts` | 401/403 on `/me`, 200 profile + `active_resume`, PATCH updates, invalid `cgpa` → 400, public card strips `phone`/`ku_id`, UUID validation, 404 |
| `phase5.mapper.test.ts` | Full vs public mapping; snake → camel update input |

```bash
npm run test:phase5
npm run typecheck
```

**15 tests** across 2 suites (mocked repositories — no live Supabase required).

### B1.10 Out of scope for Milestone B1

| Concern | Milestone |
| --- | --- |
| Companies `GET/PATCH /companies/me` + public card | B2 |
| `POST /students/me/avatar` (multipart) | B3 |
| OpenAPI / Swagger paths for profiles | B4 |
| Consolidated Phase 5 matrix + hardening | B5 |
| Frontend `studentsApi` / profile form wiring | F2 / F5 |

## Milestone B1 exit checklist

| Item | Status |
| --- | --- |
| `GET /students/me` returns 200 with profile for student JWT | Done |
| `GET /students/me` → 401 without token; 403 for company JWT | Done |
| `PATCH` updates only allowed fields | Done |
| Invalid `cgpa` returns 400 with stable error code | Done (`VALIDATION_ERROR`) |
| `GET /students/:id` returns public card without `phone` / `ku_id` | Done |
| Module mounted at `/api/v1/students` | Done |
| `npm run test:phase5` green | Done |

**What comes next:** Milestone B2 — Companies profile module (same layout; public GET only for `verification_status === approved`).

---

# Milestone B2 — Companies Profile Module

**Status:** Complete  
**Depends on:** B1 patterns, `companiesRepository` (Phase 3B)  
**Does not include:** Logo upload (B3), Swagger paths (B4), admin approval endpoints (already exist via Phase 2 verification RPCs)

## What it is

Milestone B2 gives companies self-service profile read/update plus a **public approved-company card**. It copies the B1 module structure exactly, with two company-specific rules:

1. `/companies/me` **must** show `verification_status` and `verified_at` — companies need to see their pending state.
2. The public `GET /companies/:id` returns **404 for pending/rejected companies** so their existence is never leaked to students.

## Why it matters

Job posting (Phase 6) requires `requireVerifiedCompany` context and company profile metadata. Company users also need to self-serve their description/industry/website while waiting for admin approval.

## What was decided / locked

### B2.1 HTTP contracts

| Method | Path | Auth | Success | Purpose |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/companies/me` | Company | 200 | Own profile incl. `verification_status`, `verified_at` |
| `PATCH` | `/api/v1/companies/me` | Company | 200 | Update `company_name`, `website`, `industry`, `description` |
| `GET` | `/api/v1/companies/:id` | Any authenticated role | 200 | Public card — **approved companies only** |

**Failures:**

| Case | Status | Code |
| --- | --- | --- |
| Missing JWT | 401 | `MISSING_TOKEN` |
| Student JWT on `/me` | 403 | `INSUFFICIENT_ROLE` |
| No company row / pending / rejected on public GET | 404 | `COMPANY_NOT_FOUND` |
| Invalid website URL, empty PATCH, bad UUID | 400 | `VALIDATION_ERROR` |

### B2.2 The verification_status rule

`verification_status` can **never** be set through PATCH. The Zod body schema uses `.strip()`, so a client sending `{ "verification_status": "approved" }` has that key silently removed; if it was the only key, the "at least one field" refinement rejects with 400. Only the Phase 2 admin verification flow (`companiesRepository.setVerificationStatus`) can change it. This is covered by a dedicated test.

Similarly `logo_url` is not PATCHable — it is written exclusively by the B3 upload endpoint.

### B2.3 Response DTOs

**Own profile** (`CompanyProfileDto`):

```json
{
  "id": "uuid",
  "company_name": "Acme Corp",
  "website": "https://acme.example.com",
  "industry": "Software",
  "description": "We build things",
  "logo_url": null,
  "verification_status": "pending",
  "verified_at": null,
  "created_at": "...",
  "updated_at": "..."
}
```

**Public card** (`CompanyPublicCardDto`) — omits `verification_status`, `verified_at`, and `updated_at`; only ever returned for approved companies.

### B2.4 PATCH body (allowed fields)

| Field | Rules |
| --- | --- |
| `company_name` | optional string, 2–150 chars |
| `website` | optional valid URL, or `null` / `""` (clears) |
| `industry` | optional string or null/empty (max 100) |
| `description` | optional string or null/empty (max 2000) |

### B2.5 Module layout

```text
src/modules/companies/
  companies.constants.ts   — COMPANY_ERROR_CODES
  companies.types.ts       — CompanyProfileDto, CompanyPublicCardDto, UpdateCompanyProfileInput
  companies.validation.ts  — updateCompanyProfileSchema, companyIdParamsSchema
  companies.errors.ts      — AppError helpers
  companies.mapper.ts      — Record → DTO; snake PATCH → camel update input
  companies.service.ts     — getMe, updateMe, getPublicById (approved-only)
  companies.controller.ts  — thin successResponse adapters
  companies.routes.ts      — authenticate + role gates
  index.ts                 — export companiesRouter + public types/constants
```

Mounted at `/companies` in `src/routes/index.ts`.

### B2.6 Service behavior

| Method | Behavior |
| --- | --- |
| `getMe(userId)` | `companiesRepository.findByUserId`; 404 if null |
| `updateMe(userId, input)` | Ensure row exists; `updateProfile`; return DTO |
| `getPublicById(id)` | `findById`; 404 if null **or** `verification_status !== 'approved'` |

### B2.7 Files touched

| Action | Path |
| --- | --- |
| Create | `src/modules/companies/*` (9 files, layout above) |
| Edit | `src/routes/index.ts` (mount `/companies`) |
| Create | `src/__tests__/phase5.companies.test.ts` |

### B2.8 Tests

`phase5.companies.test.ts` — 14 tests: auth matrix (401/403), pending state visible on `/me`, PATCH happy path, `verification_status` strip + empty-body 400, invalid URL 400, public card for approved company (no verification fields), **pending company → 404**, unknown id → 404, UUID validation, error-code exports.

> **Incident note:** while implementing B2, the working-tree copy of `src/database/resumes.repository.ts` (Phase 4) was found truncated (analysis status/JSONB methods missing), which broke compilation of the resumes service. The file was restored from git (`git checkout --`) — no Phase 4 code was rewritten.

## Milestone B2 exit checklist

| Item | Status |
| --- | --- |
| Company can read/update own profile | Done |
| Cannot change `verification_status` via PATCH | Done (stripped + tested) |
| Public GET returns 404 for pending/rejected companies | Done |
| Student JWT cannot PATCH `/companies/me` (403) | Done |
| `npm run test:phase5` green | Done |

**What comes next:** Milestone B3 — avatar & logo storage uploads.

---

# Milestone B3 — Avatar & Logo Storage Uploads

**Status:** Complete  
**Depends on:** B1 + B2 modules, Phase 4 storage pattern (`resumeStorage.ts` + multer memory upload)  
**Does not include:** Image resizing/cropping (frontend concern), Swagger docs (B4)

## What it is

Milestone B3 adds multipart image upload for the **student avatar** and **company logo**. Files land in Supabase Storage; the resulting public URL is written to `students.profile_picture_url` / `companies.logo_url`; the updated profile DTO is returned so the client can render immediately.

## Why public buckets (unlike resumes)

Resumes are **private** — only the owner and the analysis worker touch them. Avatars and logos are rendered publicly in the frontend (`<img src>` on cards and discover screens), so signed URLs per request would be wasteful. The buckets are public-**read**; writes still go exclusively through the API with the service role key. This mirrors the Phase 4 bucket decision but flips `public` to `true`.

## What was decided / locked

### B3.1 HTTP contracts

| Method | Path | Auth | Success | Purpose |
| --- | --- | --- | --- | --- |
| `POST` | `/api/v1/students/me/avatar` | Student | 200 | Multipart image, field `file`; returns full profile DTO |
| `POST` | `/api/v1/companies/me/logo` | Company | 200 | Same pattern; returns company profile DTO |

**Failures:**

| Case | Status | Code |
| --- | --- | --- |
| Non-image mime (or renamed non-image buffer) | 400 | `INVALID_FILE_TYPE` |
| File over 2 MB | 400 | `FILE_TOO_LARGE` |
| Missing file / wrong field name | 400 | `VALIDATION_ERROR` |
| Storage write fails | 500 | `STORAGE_UPLOAD_FAILED` |
| Too many uploads | 429 | rate limit envelope |

### B3.2 Storage layout

| Item | Value |
| --- | --- |
| Buckets | `avatars`, `company-logos` (public read; 2 MB limit; jpeg/png/webp mimes enforced bucket-side too) |
| Object path | `{userId}/{timestamp}.{ext}` — timestamped so a new upload never collides; CDN caches per-URL |
| Migration | `supabase/migrations/20260717000000_phase5_profile_image_buckets.sql` (registered in `apply-migrations.mjs`) |
| Env | `PROFILE_IMAGE_MAX_BYTES` (default 2 MB), `AVATAR_STORAGE_BUCKET`, `COMPANY_LOGO_STORAGE_BUCKET` — Zod-validated in `env.ts` like `RESUME_*` |

### B3.3 Upload pipeline (per request)

```text
POST /students/me/avatar  (multipart, field "file")
  │
  ├─► rate limiter (20 / 15 min)
  ├─► multer memory upload: mime whitelist + 2 MB limit
  ├─► magic-byte check (JPEG/PNG/WebP) — renamed PDFs cannot slip through
  ├─► upload to Supabase Storage → public URL
  ├─► studentsRepository.updateProfile({ profilePictureUrl })
  ├─► best-effort delete of the previous object (never fails the request)
  └─► 200 with updated profile DTO
```

The DB update happens **before** old-object cleanup: if cleanup fails, the worst case is an orphaned file, never a broken profile.

### B3.4 Shared middleware

`src/middleware/profileImageUpload.ts` serves both modules:

| Export | Role |
| --- | --- |
| `profileImageUploadMiddleware` | multer memory storage, single `file`, mime filter, size limit |
| `mapProfileImageUploadError` | multer error → `AppError` (`FILE_TOO_LARGE`, field-name `VALIDATION_ERROR`) |
| `assertValidImageBuffer` | magic-byte validation (mirrors Phase 4 `assertValidPdfBuffer`) |
| `profileImageRateLimiter` | 20 uploads / 15 min (clone of `resumeUploadRateLimiter`) |
| `PROFILE_IMAGE_ERROR_CODES` | `INVALID_FILE_TYPE`, `FILE_TOO_LARGE` |

`src/config/profileImageStorage.ts` mirrors `resumeStorage.ts`: `uploadImage`, `deleteObject`, plus `objectPathFromPublicUrl` to recover the object path of the previous image from its stored public URL.

### B3.5 Files touched

| Action | Path |
| --- | --- |
| Create | `supabase/migrations/20260717000000_phase5_profile_image_buckets.sql` |
| Edit | `scripts/apply-migrations.mjs` |
| Edit | `src/config/env.ts` (3 new keys) |
| Create | `src/config/profileImageStorage.ts` |
| Create | `src/middleware/profileImageUpload.ts` |
| Edit | `src/modules/students/*` (service `uploadAvatar`, controller, route `POST /me/avatar`) |
| Edit | `src/modules/companies/*` (service `uploadLogo`, controller, route `POST /me/logo`) |
| Create | `src/__tests__/phase5.upload.test.ts` |

### B3.6 Tests

`phase5.upload.test.ts` — 9 tests: avatar happy path (storage call + repository URL persist), previous-avatar cleanup, non-image mime 400, renamed-buffer magic-byte 400, missing file 400, role 403 on both routes, logo happy path, storage failure → 500 without DB update.

## Milestone B3 exit checklist

| Item | Status |
| --- | --- |
| Valid JPEG/PNG returns 200 with new URL | Done |
| Non-image / >2 MB returns 400 with stable code | Done |
| `students.profile_picture_url` / `companies.logo_url` updated | Done |
| Old image cleanup best-effort, never fails request | Done |
| Rate limiter wired on both upload routes | Done |
| `npm run test:phase5` green | Done |

**What comes next:** Milestone B4 — Swagger paths, error catalog and hardening.

---

# Milestone B4 — Swagger, Error Catalog & Hardening

**Status:** Complete  
**Depends on:** B1–B3 (all routes exist)  
**Completes:** Phase 5 API documentation surface

## What it is

Milestone B4 makes every Phase 5 endpoint discoverable in Swagger UI (`/api/docs`), locks the error-code catalog, and closes the hardening checklist from the spec (CORS, unknown-key stripping, route order).

## What was done

### B4.1 Swagger (`src/config/swagger.ts`)

New tags **Students** and **Companies**; new paths, all with bearer security, request/response schemas and error-code descriptions:

| Path | Operations |
| --- | --- |
| `/students/me` | GET, PATCH |
| `/students/me/avatar` | POST (multipart) |
| `/students/{id}` | GET |
| `/companies/me` | GET, PATCH |
| `/companies/me/logo` | POST (multipart) |
| `/companies/{id}` | GET |

New component schemas: `StudentProfile`, `StudentPublicCard`, `UpdateStudentProfile`, `CompanyProfile`, `CompanyPublicCard`, `UpdateCompanyProfile`. The public card schemas intentionally omit `phone` / `ku_id` / `verification_status` so the docs match the actual field-stripping behavior — this is asserted by a test.

### B4.2 Phase 5 error catalog (stable codes)

| Code | HTTP | Source |
| --- | --- | --- |
| `STUDENT_NOT_FOUND` | 404 | students service |
| `STUDENT_PROFILE_FORBIDDEN` | 403 | reserved (students) |
| `COMPANY_NOT_FOUND` | 404 | companies service (also used for pending/rejected public GET — no existence leak) |
| `COMPANY_NOT_PUBLIC` | — | reserved (defined, intentionally unused: returning it would leak existence) |
| `COMPANY_PROFILE_FORBIDDEN` | 403 | reserved (companies) |
| `INVALID_PROFILE_PAYLOAD` | 400 | reserved (both) |
| `INVALID_FILE_TYPE` | 400 | image upload middleware |
| `FILE_TOO_LARGE` | 400 | image upload middleware |
| `STORAGE_UPLOAD_FAILED` | 500 | avatar/logo services |
| `VALIDATION_ERROR` | 400 | shared Zod `validate` middleware |
| `MISSING_TOKEN` / `INSUFFICIENT_ROLE` | 401 / 403 | Phase 2 auth middleware |

### B4.3 Hardening checklist

| Item | Result |
| --- | --- |
| CORS allows Vite origin | Already configured: `http://localhost:5173` in `config.cors.allowedOrigins`, `Authorization` in allowed headers — no change needed |
| PATCH rejects/strips unknown keys | Zod `.strip()` on both PATCH schemas; `verification_status` strip covered by test |
| Route order | `/me` and `/me/avatar` (or `/me/logo`) registered before `/:id` in both routers |
| `/:id` UUID-validated | `studentIdParamsSchema` / `companyIdParamsSchema` |
| Typecheck | `tsc --noEmit` clean |

### B4.4 Files touched

| Action | Path |
| --- | --- |
| Edit | `src/config/swagger.ts` (6 new paths, 6 new schemas, updated description) |
| Create | `src/__tests__/phase5.swagger.test.ts` |

### B4.5 Tests

`phase5.swagger.test.ts` — 5 tests: all six path keys exist, GET+PATCH present on both `/me` routes, all six schemas defined, public card schemas omit private fields.

## Milestone B4 exit checklist

| Item | Status |
| --- | --- |
| Swagger UI lists all Phase 5 endpoints with schemas | Done |
| Error codes documented with stable strings | Done |
| CORS verified for frontend origin | Done |
| Typecheck passes | Done |

**What comes next:** Milestone B5 — consolidated Phase 5 test matrix.

---

# Milestone B5 — Phase 5 Test Matrix

**Status:** Complete  
**Depends on:** B1–B4 (all backend surfaces)  
**Completes:** Phase 5 backend quality gate

## What it is

Milestone B5 is the quality gate: a consolidated test inventory, structural guards (mirroring Phase 4's `phase4.matrix.test.ts`), and a single CI entrypoint (`npm run test:phase5`) — with a regression check that Phase 4 stays green.

## What was done

### B5.1 Test matrix (`npm run test:phase5`)

| File | Kind | Covers |
| --- | --- | --- |
| `phase5.students.test.ts` | HTTP | Auth matrix, GET/PATCH happy paths, cgpa validation, public card stripping, 404s, UUID params |
| `phase5.companies.test.ts` | HTTP | Pending state on `/me`, PATCH, `verification_status` strip, pending-company 404, role gates |
| `phase5.upload.test.ts` | HTTP | Avatar/logo happy paths, mime + magic-byte rejects, old-image cleanup, storage failure 500, role gates |
| `phase5.swagger.test.ts` | Static | All six profile paths + schemas on `swaggerSpec`; public schemas omit private fields |
| `phase5.mapper.test.ts` | Unit | Full vs public DTO mapping; snake → camel PATCH input |
| `phase5.matrix.test.ts` | Static | Suite inventory, module file inventory, migration registration, script presence, route mounting/order, rate limiter wiring, env keys, no PATCHable `verification_status` |

**54 tests** across 6 suites (all mocked — no live Supabase/Storage required in CI).

```bash
npm run test:phase5   # 54 tests, 6 suites — green
npm run test:phase4   # 62 tests, 11 suites — still green (no regressions)
npm run typecheck     # clean
```

### B5.2 Structural guards (matrix highlights)

| Guard | Why |
| --- | --- |
| `/me` registered before `/:id` in both routers | "me" must never be captured as a UUID param |
| `verification_status` not a Zod-typed PATCH field | Companies can never self-approve |
| Rate limiter present on both image upload routes | Abuse protection stays wired |
| Phase 5 bucket migration in `apply-migrations.mjs` | Fresh environments get the buckets |
| `PROFILE_IMAGE_*` env keys in `env.ts` | Fail-fast config contract |

### B5.3 Files touched

| Action | Path |
| --- | --- |
| Create | `src/__tests__/phase5.matrix.test.ts` |
| Edit | `documentation/PHASE_5_DOCUMENTATION.md` (milestone statuses) |

## Milestone B5 exit checklist

| Item | Status |
| --- | --- |
| `npm run test:phase5` exits 0 | Done (54 tests) |
| `npm run test:phase4` still green | Done (62 tests) |
| `PHASE_5_DOCUMENTATION.md` checked in with milestone status | Done |

---

# Phase 5 Backend Summary

All five backend milestones are complete. The API now exposes:

| Method | Path | Auth |
| --- | --- | --- |
| `GET` / `PATCH` | `/api/v1/students/me` | Student |
| `POST` | `/api/v1/students/me/avatar` | Student |
| `GET` | `/api/v1/students/:id` | Any authenticated |
| `GET` / `PATCH` | `/api/v1/companies/me` | Company |
| `POST` | `/api/v1/companies/me/logo` | Company |
| `GET` | `/api/v1/companies/:id` | Any authenticated (approved companies only) |

All endpoints are documented in Swagger UI at `/api/docs` and covered by the `test:phase5` matrix.

**Deployment note:** run `npm run db:migrate` (or apply `20260717000000_phase5_profile_image_buckets.sql` manually) so the `avatars` and `company-logos` buckets exist before using the upload endpoints.

# Remaining work after Phase 5

Frontend F1–F8 and backend B1–B5 are complete. See:

- `frontend/INTEGRATION.md`
- `frontend/documentation/PHASE_A_DOCUMENTATION.md`
- `frontend/documentation/PHASE_B_E_DOCUMENTATION.md`

**Next product phase:** Backend Specification v2.0 Job Posting & Discovery (Phase 6), then replace remaining frontend mocks (discover, matches, chat, kanban).

---

# How to verify the backend manually

1. Start API (`npm run dev`) with Phase 2+ env configured; run `npm run db:migrate` once for the new buckets.
2. Register/login as a student; obtain access token.
3. `GET /api/v1/students/me` with `Authorization: Bearer <token>` → 200 profile.
4. `PATCH /api/v1/students/me` with `{ "bio": "Updated" }` → 200; GET again confirms.
5. `PATCH` with `{ "cgpa": 5 }` → 400.
6. `POST /api/v1/students/me/avatar` with a JPEG in field `file` → 200 with `profile_picture_url`; URL is publicly fetchable.
7. Login as company; `GET /api/v1/students/me` → 403; `GET /api/v1/students/<student-uuid>` → 200 without `phone`/`ku_id`.
8. `GET /api/v1/companies/me` → 200 with `verification_status: "pending"`; `PATCH` description → 200; `PATCH { "verification_status": "approved" }` alone → 400.
9. `POST /api/v1/companies/me/logo` with a PNG → 200 with `logo_url`.
10. As a student, `GET /api/v1/companies/<pending-company-uuid>` → 404; approve the company (admin flow), then → 200 public card.
11. Open `/api/docs` — Students and Companies tags list all six endpoints.
