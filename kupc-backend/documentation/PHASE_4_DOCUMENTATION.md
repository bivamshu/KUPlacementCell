# KUPC Phase 4 — Resume Upload & AI Analysis

**Status:** In progress (Milestones 1–8 complete)  
**Date:** 2026-07-11  
**Depends on:** Phase 3 (3A design + 3B implementation) — complete  
**References:** `PHASE_3A_DOCUMENTATION.md`, `PHASE_3B_DOCUMENTATION.md`, `INTEGRATION.md` (response shape only)  
**Feeds into:** Phase 5 — Student & Company Profiles; later swipe / match / chat phases

| Milestone | Topic | Status |
| --- | --- | --- |
| 1 | Contracts & module scaffold | Complete |
| 2 | Schema & repository extensions | Complete |
| 3 | Supabase Storage & upload pipeline | Complete |
| 4 | Async worker infrastructure | Complete |
| 5 | PDF text extraction | Complete |
| 6 | OpenAI scoring service | Complete |
| 7 | Persistence & active-resume linkage | Complete |
| 8 | Read APIs, polling & Swagger | Complete |
| 9 | Testing matrix & hardening | Planned |

---

# What Phase 4 Is

Phase 4 turns the Phase 3 `resumes` and `resume_analysis` tables into a working product pipeline:

1. A student uploads a PDF resume.
2. The file is stored in Supabase Storage and a `resumes` row is created.
3. An analysis job is enqueued (async).
4. A worker extracts text, calls OpenAI for structured ATS-style scoring, and writes `resume_analysis`.
5. The student’s active resume pointer (`students.resume_id`) is updated.

**Phase 2** answered: *Who is making this request?*  
**Phase 3** answered: *Where do resumes and analyses live in the database?*  
**Phase 4** answers: *How does a resume get uploaded, scored, and persisted?*

## Why this phase exists

Placement features (profiles, swipe eligibility, company review) need structured resume data: skills, ATS score, strengths, and suggestions. Calling OpenAI inside the HTTP request would:

- Block the client for several seconds
- Time out under load
- Make retries and failure handling awkward

An **upload pipeline + async worker** keeps the API fast and the analysis reliable.

## Design decisions (locked for this phase)

| Decision | Choice | Why |
| --- | --- | --- |
| AI provider | OpenAI (structured JSON) | Explicit Phase 4 requirement; richer feedback than rule-only scoring |
| Response shape | Inspired by `INTEGRATION.md` / analytiCV | Familiar ATS score, breakdown, strengths, suggestions — **not** the Python spaCy runtime |
| Async | BullMQ on Redis | Project already has `REDIS_URL` + `ioredis` for auth cache |
| File storage | Supabase Storage | Matches existing Supabase stack; `resumes.file_url` already exists |
| Scope | Backend only | Module, APIs, worker, persistence, tests — no frontend UI this phase |

## End-to-end flow

```
Student (JWT, role=STUDENT)
  │
  ▼
POST /api/v1/resumes  (multipart PDF)
  │
  ├─► Validate PDF (type, size)
  ├─► Upload to Supabase Storage bucket `resumes`
  ├─► INSERT public.resumes (file_url, file_name, student_id)
  ├─► INSERT public.resume_analysis (status=pending)
  ├─► Enqueue BullMQ job { resumeId, analysisId, studentId }
  └─► 202 Accepted { resumeId, analysisId, status: "pending" }

Worker (separate process)
  │
  ├─► Mark analysis status=processing
  ├─► Download PDF from Storage
  ├─► Extract plain text
  ├─► Call OpenAI → structured score + skills + feedback
  ├─► UPDATE resume_analysis (completed | failed)
  └─► UPDATE students.resume_id = resumeId  (on success)

Student polls GET /api/v1/resumes/:id/analysis
  └─► pending | processing | completed | failed
```

## Out of scope

- Frontend analyzer / builder / editor / chat UI (analytiCV surfaces)
- Job-description fit matching (future)
- Company verification document upload (separate storage flow)
- Replacing Phase 3 schema wholesale (extend only)

---

# Milestone 1 — Contracts & Module Scaffold

**Status:** Complete  
**Depends on:** Phase 3 complete (resumes / resume_analysis tables + repository boundary)  
**Does not include:** Storage, BullMQ, PDF parse, OpenAI (Milestones 3–6)

## What it is

Milestone 1 locks the **API contracts**, **analysis JSON schema**, **status enum**, and the **feature module layout** before any storage or OpenAI code lands. It mirrors how Phase 2 started with `src/modules/auth/`.

Deliverables are TypeScript types, Zod validation, a stubbed `resumes` module, and routes mounted behind student auth. Handlers may return `501 Not Implemented` until later milestones fill them in — the contracts and auth gates must already be correct.

## Why it happens first

Without shared contracts, upload, worker, and read endpoints invent incompatible shapes. Frontend and tests need stable field names from day one. Scaffolding the module early keeps Phase 4 code out of ad-hoc route files (`src/routes/*.ts`) and preserves the Phase 3 layering rule:

```text
Controller → Service → Repository → Supabase
```

## What will be decided / locked

### 1.1 Status model

Analysis lifecycle:

| Status | Meaning |
| --- | --- |
| `pending` | Row created; job not yet started |
| `processing` | Worker claimed the job |
| `completed` | OpenAI result persisted |
| `failed` | Terminal failure after retries (or non-retryable error) |

**Transitions:** `pending → processing → completed | failed`.

**Re-run rule:** Never rewrite a `completed` row in place. Insert a **new** `resume_analysis` row (Phase 3A: many analyses per resume).

Typed in code as:

```typescript
// src/modules/resumes/resumes.constants.ts
export const AnalysisStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
} as const;
```

### 1.2 Analysis result JSON (OpenAI → API)

Canonical DTO for completed analysis (aligns with `INTEGRATION.md` concepts). Worker (M6) and read API (M8) must both use this shape.

```json
{
  "ats_score": {
    "total_score": 72,
    "grade": "B",
    "breakdown": [
      {
        "category": "contact_info",
        "label": "Contact Info",
        "score": 15,
        "max_score": 20
      }
    ]
  },
  "extracted_skills": {
    "languages": ["Python", "TypeScript"],
    "frameworks": ["React"],
    "databases": ["PostgreSQL"],
    "cloud": [],
    "data_ml": [],
    "other": ["Git"]
  },
  "summary": "Strong technical resume with clear experience bullets.",
  "strengths": ["Quantified achievements", "Clear contact block"],
  "suggestions": [
    {
      "suggestion": "Add metrics to the most recent role.",
      "category": "experience_writing",
      "priority": "high"
    }
  ],
  "issues_identified": ["Few action verbs in older roles"]
}
```

TypeScript mapping lives in `resumes.types.ts` as `AnalysisResultDto` (and related nested types).

### 1.3 HTTP contracts

| Method | Path | Auth | Success | Purpose |
| --- | --- | --- | --- | --- |
| `POST` | `/api/v1/resumes` | Student | **202** | Upload PDF; enqueue analysis |
| `GET` | `/api/v1/resumes` | Student | 200 | List own resumes |
| `GET` | `/api/v1/resumes/:id` | Student (owner) | 200 | Resume metadata |
| `GET` | `/api/v1/resumes/:id/analysis` | Student (owner) | 200 | Latest analysis (+ status) |
| `DELETE` | `/api/v1/resumes/:id` | Student (owner) | 200 | Delete resume (+ storage object) |

**Upload 202 body** (envelope via `successResponse`):

```json
{
  "success": true,
  "message": "Resume upload accepted",
  "data": {
    "resumeId": "uuid",
    "analysisId": "uuid",
    "status": "pending"
  },
  "error": null
}
```

**Auth failures (must work in M1):**

| Case | Status |
| --- | --- |
| Missing / invalid JWT | **401** |
| Authenticated but not `STUDENT` | **403** |

Until M3+, stub handlers may return **501** with a stable message — that is acceptable for M1 as long as auth gates pass.

### 1.4 Error codes (reserved)

Defined in `resumes.constants.ts` for later milestones; do not invent new strings in services/controllers.

| Code | Used when |
| --- | --- |
| `RESUME_NOT_FOUND` | Unknown or non-owned resume id |
| `RESUME_FORBIDDEN` | Cross-owner access attempt |
| `RESUME_INVALID_TYPE` | Non-PDF upload (M3) |
| `RESUME_TOO_LARGE` | Over size limit (M3) |
| `RESUME_EMPTY_TEXT` | PDF yielded no extractable text (M5) |
| `ANALYSIS_NOT_FOUND` | No analysis row for resume |
| `ANALYSIS_NOT_READY` | Optional: client expected completed too early |
| `RESUME_QUEUE_UNAVAILABLE` | Redis/BullMQ unavailable in production (M4) |

### 1.5 Module scaffold

```text
src/modules/resumes/
  resumes.constants.ts   — AnalysisStatus, RESUME_ERROR_CODES
  resumes.types.ts       — UploadResumeResponse, AnalysisResultDto, …
  resumes.validation.ts  — Zod (path params; multipart later in M3)
  resumes.controller.ts  — thin HTTP adapters
  resumes.service.ts     — orchestration stubs (501 until later M)
  resumes.routes.ts      — authenticate + authorize(STUDENT)
  index.ts               — export resumesRouter + public types/constants
```

**Wire into:**

```text
src/routes/index.ts  →  router.use('/resumes', resumesRouter)
```

Full path prefix remains `/api/v1` from the app mount (same as auth).

**Layering rules (unchanged from Phase 3):**

- Controllers: parse request, call service, send envelope
- Services: business orchestration only
- Repositories: only place that calls `supabaseAdmin.from(...)` — **do not** add table access in the resumes module during M1 (repository work is M2)

### 1.6 Implementation steps

1. Create `resumes.constants.ts` with status + error codes.
2. Create `resumes.types.ts` with upload response, list item, and `AnalysisResultDto`.
3. Create `resumes.validation.ts` with `resumeIdParamsSchema` (`params.id` = UUID).
4. Create stub `resumes.service.ts` methods: `upload`, `list`, `getById`, `getAnalysis`, `delete`.
5. Create thin `resumes.controller.ts` mapping to those methods (`upload` → status **202**).
6. Create `resumes.routes.ts`: `router.use(authenticate, authorize(Role.STUDENT))` then the five routes.
7. Export from `index.ts`; mount in `src/routes/index.ts`.
8. Add `src/__tests__/phase4.scaffold.test.ts`: no token → 401; company JWT → 403.
9. Mark this milestone Complete in the status table when the exit checklist passes.

### 1.7 Files touched (when implementing)

| Action | Path |
| --- | --- |
| Create | `src/modules/resumes/resumes.constants.ts` |
| Create | `src/modules/resumes/resumes.types.ts` |
| Create | `src/modules/resumes/resumes.validation.ts` |
| Create | `src/modules/resumes/resumes.controller.ts` |
| Create | `src/modules/resumes/resumes.service.ts` |
| Create | `src/modules/resumes/resumes.routes.ts` |
| Create | `src/modules/resumes/index.ts` |
| Edit | `src/routes/index.ts` |
| Create | `src/__tests__/phase4.scaffold.test.ts` |
| Edit | `documentation/PHASE_4_DOCUMENTATION.md` (status → Complete) |

### 1.8 Out of scope for Milestone 1

| Concern | Milestone |
| --- | --- |
| `resume_analysis` status / JSONB columns | 2 |
| Extend `resumes.repository.ts` | 2 |
| Multer, PDF validation, Supabase Storage | 3 |
| BullMQ enqueue / worker process | 4 |
| `pdf-parse` / text extraction | 5 |
| OpenAI client | 6 |
| Set `students.resume_id` on success | 7 |
| Full Swagger for resumes | 8 |
| Full Phase 4 test matrix | 9 |

### 1.9 How to verify

```bash
npm run typecheck
npm test -- src/__tests__/phase4.scaffold.test.ts
```

Manual smoke (with a student access token):

```bash
# expect 401
curl -i -X POST http://localhost:5000/api/v1/resumes

# expect 202 or 501 after auth (stub OK for M1)
curl -i -X POST http://localhost:5000/api/v1/resumes \
  -H "Authorization: Bearer <student_access_token>"
```

## Milestone 1 exit checklist

| Item | Done when | Status |
| --- | --- | --- |
| Status enum documented and typed | `pending \| processing \| completed \| failed` in constants | Done |
| Analysis JSON shape documented | Matches §1.2 / `AnalysisResultDto` | Done |
| HTTP routes listed | Table 1.3 agreed | Done |
| Module folder exists | `src/modules/resumes/*` scaffold | Done |
| Routes mounted with student auth | Unauthorized → 401; non-student → 403 | Done |
| Scaffold / auth tests pass | `phase4.scaffold.test.ts` green | Done |
| Docs status updated | Milestone 1 → Complete in status table | Done |

---

# Milestone 2 — Schema & Repository Extensions

**Status:** Complete  
**Depends on:** Phase 4 Milestone 1 (contracts + resumes module scaffold)  
**Does not include:** Storage upload, BullMQ, PDF parse, OpenAI (Milestones 3–6)

## What it is

Milestone 2 extends Phase 3 `resume_analysis` so the async pipeline can track job lifecycle (`pending` → `processing` → `completed` | `failed`) and store richer OpenAI output (grade, score breakdown, strengths, suggestions, issues). It also extends `resumes.repository.ts` with typed methods for creating, updating, completing, and failing analysis rows.

Phase 3 only had:

- `resumes(id, student_id, file_url, file_name, uploaded_at)`
- `resume_analysis(id, resume_id, extracted_skills, ats_score, summary, analyzed_at)`

That is enough for a finished score, but not for polling, failures, or structured feedback.

## Why it was done

Without status and result columns:

- The client cannot poll meaningfully after upload
- The worker cannot mark a job as in-progress or failed
- Grade, breakdown, strengths, and suggestions have nowhere typed to live

Keeping all table access in the repository preserves the Phase 3 boundary: controllers/services never call `supabaseAdmin.from(...)`.

## What was done

### 2.1 Migration

File: `supabase/migrations/20260711000000_phase4_resume_analysis.sql`

Added to `public.resume_analysis` (idempotent `ADD COLUMN IF NOT EXISTS`):

| Column | Type | Notes |
| --- | --- | --- |
| `status` | `TEXT NOT NULL DEFAULT 'pending'` | CHECK: `pending`, `processing`, `completed`, `failed` |
| `error_message` | `TEXT` | Set when `failed` |
| `grade` | `TEXT` | e.g. A/B/C/D |
| `score_breakdown` | `JSONB` | Category scores |
| `strengths` | `JSONB` | Array of strings |
| `suggestions` | `JSONB` | Array of suggestion objects |
| `issues_identified` | `JSONB` | Issues from OpenAI |
| `model` | `TEXT` | Model id used |
| `started_at` | `TIMESTAMPTZ` | When processing began |
| `completed_at` | `TIMESTAMPTZ` | When finished |

Kept existing columns: `extracted_skills`, `ats_score`, `summary`, `analyzed_at`.

Also created:

- Constraint `resume_analysis_status_check`
- Index `idx_resume_analysis_skills` (GIN on `extracted_skills`)
- Index `idx_resume_analysis_resume_id_status` on (`resume_id`, `status`)

Follow-up fix migration: `supabase/migrations/20260711000001_phase4_fix_issues_identified.sql` (typo rename `issues_idetified` → `issues_identified`).

### 2.2 Registered in apply script

`scripts/apply-migrations.mjs` now includes (after Phase 3):

```text
20260711000000_phase4_resume_analysis.sql
20260711000001_phase4_fix_issues_identified.sql
```

Applied with:

```bash
npm run db:migrate
```

### 2.3 Repository extensions

File: `src/database/resumes.repository.ts`

| Method | Purpose |
| --- | --- |
| `createAnalysis` | Insert analysis with `status: 'pending'` (default) |
| `updateAnalysisStatus` | `pending` → `processing` (sets `started_at`) |
| `completeAnalysis` | Write scores/JSON fields + `status: 'completed'` |
| `failAnalysis` | Write `error_message` + `status: 'failed'` |
| `findAnalysisById` | Lookup by analysis id |
| `findAnalysisByResumeId` | Latest analysis for a resume (by `analyzed_at`) |

Existing resume CRUD (`create`, `findById`, `listByStudent`, `deleteById`) remains. Optional `id` on `create` supports pre-generated UUIDs for Storage path alignment in Milestone 3.

Conventions match Phase 3:

- Always `supabaseAdmin`
- camelCase inputs → snake_case columns
- Typed `ResumeAnalysisRecord` / `ResumeRecord`
- `if (error) throw error` — never swallow

### 2.4 Tests

| File | Covers |
| --- | --- |
| `src/__tests__/phase4.schema.test.ts` | Migration defines required columns, status CHECK, GIN index; repository exports required methods |
| `src/__tests__/phase3.boundary.test.ts` | Still green — no table `.from(...)` outside `src/database/` |

**Verify:**

```bash
npm run db:migrate
npm test -- src/__tests__/phase4
npm test -- src/__tests__/phase3.boundary.test.ts
npm run typecheck
```

### 2.5 Files touched

| Action | Path |
| --- | --- |
| Create | `supabase/migrations/20260711000000_phase4_resume_analysis.sql` |
| Create | `supabase/migrations/20260711000001_phase4_fix_issues_identified.sql` |
| Edit | `scripts/apply-migrations.mjs` |
| Edit | `src/database/resumes.repository.ts` |
| Create | `src/__tests__/phase4.schema.test.ts` |

### 2.6 Out of scope for Milestone 2

| Concern | Milestone |
| --- | --- |
| Multer, PDF validation, Supabase Storage bucket | 3 |
| Real `resumes.service.upload` writing rows | 3 |
| BullMQ enqueue / worker | 4 |
| PDF text extraction | 5 |
| OpenAI scoring | 6 |
| Set `students.resume_id` on success | 7 |

## Milestone 2 exit checklist

| Item | Status |
| --- | --- |
| Migration applied — new columns exist in Supabase | Done |
| Status CHECK enforced (`pending` / `processing` / `completed` / `failed`) | Done |
| Repository methods cover pending / processing / complete / fail | Done |
| Boundary rule preserved (no table access outside repositories) | Done |
| `apply-migrations.mjs` lists Phase 4 migration(s) after Phase 3 | Done |
| Static schema tests pass | Done |
| Typo fix for `issues_identified` applied on live DB | Done |

**What comes next:** Milestone 3 — Supabase Storage & upload pipeline (accept PDF, store object, create `resumes` + pending `resume_analysis`, return 202).

---
# Milestone 3 — Supabase Storage & Upload Pipeline

**Status:** Complete  
**Depends on:** Phase 4 Milestone 2 (schema + repository extensions)  
**Does not include:** PDF extraction, OpenAI (Milestones 5–6); BullMQ wired in Milestone 4

## What it is

Milestone 3 implements the **synchronous half** of the pipeline: accept a PDF via multipart upload, store it in Supabase Storage, create `resumes` + pending `resume_analysis` rows, and return **202 Accepted**. BullMQ enqueue is wired in Milestone 4.

## Why it matters

`resumes.file_url` is useless without a real object store. Validation here prevents non-PDF and oversized files from reaching Storage or the async worker.

## What was done

### 3.1 Storage bucket migration

File: `supabase/migrations/20260712000000_phase4_resume_storage_bucket.sql`

- Bucket id/name: `resumes` (private, `public = false`)
- `file_size_limit`: 5 MB (5242880)
- `allowed_mime_types`: `application/pdf` only
- Idempotent `ON CONFLICT DO UPDATE` for re-runs

Registered in `scripts/apply-migrations.mjs` after Phase 4 schema migrations. Apply with:

```bash
npm run db:migrate
```

### 3.2 Storage helper

File: `src/config/resumeStorage.ts`

| Function | Purpose |
| --- | --- |
| `buildResumeObjectPath(studentId, resumeId, fileName)` | `{studentId}/{resumeId}/{fileName}` |
| `resumeStorage.uploadPdf(path, buffer)` | Upload via `supabaseAdmin.storage` |
| `resumeStorage.deleteObject(path)` | Orphan cleanup on DB failure |

Access uses the existing service role key; students never touch Storage directly.

### 3.3 Env / config

Added to `src/config/env.ts` and `.env.example`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `RESUME_MAX_BYTES` | `5242880` (5 MB) | Multer file size limit |
| `RESUME_STORAGE_BUCKET` | `resumes` | Supabase Storage bucket name |

### 3.4 Upload validation (multer)

| File | Role |
| --- | --- |
| `src/modules/resumes/resumes.upload.middleware.ts` | Multer memory storage, field `file`, PDF MIME + `.pdf` extension filter |
| `src/modules/resumes/resumes.upload.utils.ts` | Filename sanitization, `%PDF-` magic-byte check, multer error mapping |
| `src/middleware/resumeUploadRateLimiter.ts` | 10 uploads per 15 minutes per IP |

| Rule | Enforcement |
| --- | --- |
| MIME | `application/pdf` only → `RESUME_INVALID_TYPE` |
| Extension | `.pdf` required → `RESUME_INVALID_TYPE` |
| Magic bytes | Buffer must start with `%PDF-` → `RESUME_INVALID_TYPE` |
| Max size | `RESUME_MAX_BYTES` → `RESUME_TOO_LARGE` |
| Missing file | No multipart file → `VALIDATION_ERROR` |
| Auth | `authenticate` + `authorize(Role.STUDENT)` on all resume routes |
| Non-student | **403** `INSUFFICIENT_ROLE` |

### 3.5 Upload sequence (`resumes.service.upload`)

1. Require `req.file`; validate PDF magic bytes.
2. Generate `resumeId` with `randomUUID()` (same id used for Storage path and DB row).
3. Sanitize original filename; build object path `{studentId}/{resumeId}/{fileName}`.
4. Upload bytes to Supabase Storage.
5. `resumesRepository.create({ id, studentId, fileUrl, fileName })`.
6. `resumesRepository.createAnalysis({ resumeId, status: 'pending' })`.
7. `enqueueResumeAnalysis({ resumeId, analysisId, studentId })` (Milestone 4).
8. Return **202** `{ resumeId, analysisId, status: 'pending' }`.

**Orphan handling:** upload-first, then insert. If DB insert fails, `deleteObject` runs in the `catch` block so Storage does not retain orphaned files.

### 3.6 Routes wired

File: `src/modules/resumes/resumes.routes.ts`

```text
POST /   → resumeUploadRateLimiter → multer → resumesController.upload  (202)
GET /    → list (501 stub until M8)
GET /:id → getById (501 stub until M8)
GET /:id/analysis → getAnalysis (501 stub until M8)
DELETE /:id → remove (501 stub until M8)
```

### 3.7 Tests

| File | Covers |
| --- | --- |
| `src/__tests__/phase4.upload.test.ts` | No file, non-PDF, valid PDF → 202, storage cleanup on DB failure, company → 403 |
| `src/__tests__/phase4.scaffold.test.ts` | Updated: POST without file → 400 (not 501) |

**Verify:**

```bash
npm run db:migrate
npm test -- src/__tests__/phase4
npm run typecheck
```

Manual smoke (student JWT):

```bash
curl -i -X POST http://localhost:5000/api/v1/resumes \
  -H "Authorization: Bearer <student_access_token>" \
  -F "file=@resume.pdf;type=application/pdf"
# expect 202 with resumeId, analysisId, status: pending
```

### 3.8 Files touched

| Action | Path |
| --- | --- |
| Create | `supabase/migrations/20260712000000_phase4_resume_storage_bucket.sql` |
| Create | `src/config/resumeStorage.ts` |
| Create | `src/middleware/resumeUploadRateLimiter.ts` |
| Create | `src/modules/resumes/resumes.upload.middleware.ts` |
| Create | `src/modules/resumes/resumes.upload.utils.ts` |
| Edit | `src/config/env.ts` |
| Edit | `src/modules/resumes/resumes.service.ts` |
| Edit | `src/modules/resumes/resumes.controller.ts` |
| Edit | `src/modules/resumes/resumes.routes.ts` |
| Edit | `src/modules/resumes/resumes.types.ts` |
| Edit | `scripts/apply-migrations.mjs` |
| Edit | `.env.example` |
| Create | `src/__tests__/phase4.upload.test.ts` |
| Edit | `src/__tests__/phase4.scaffold.test.ts` |
| Edit | `package.json` (`multer`, `@types/multer`) |

### 3.9 Out of scope for Milestone 3

| Concern | Milestone |
| --- | --- |
| BullMQ enqueue on upload | 4 |
| Worker process | 4 |
| PDF text extraction | 5 |
| OpenAI scoring | 6 |
| Set `students.resume_id` | 7 |
| List / get / delete read APIs | 8 |

## Milestone 3 exit checklist

| Item | Status |
| --- | --- |
| Bucket migration + apply script entry | Done |
| PDF-only + size limit enforced | Done |
| `resumes` row created with real `file_url` | Done |
| Pending `resume_analysis` created | Done |
| Non-students blocked (403) | Done |
| Orphan Storage cleanup on DB failure | Done |
| Upload rate limit on POST | Done |
| `phase4.upload.test.ts` green | Done |

**What comes next:** Milestone 4 — BullMQ worker infrastructure (enqueue `{ resumeId, analysisId, studentId }` on successful upload).

---

# Milestone 4 — Async Worker Infrastructure

**Status:** Complete  
**Depends on:** Phase 4 Milestone 3 (upload creates pending analysis rows)  
**Does not include:** PDF text extraction, OpenAI scoring, persistence of results (Milestones 5–7)

## What it is

Milestone 4 adds **BullMQ** on Redis so resume analysis runs outside the HTTP request. A dedicated worker process consumes jobs; the upload service enqueues `{ resumeId, analysisId, studentId }` after a successful upload.

## Why async

OpenAI + PDF extract can take 5–30+ seconds. HTTP should return immediately. Retries, backoff, and concurrency control belong in a queue, not in Express middleware.

## What was done

### 4.1 Dependencies & process

- Added `bullmq` (uses existing `ioredis` / `REDIS_URL`)
- Worker entry: `src/workers/resumeAnalysis.worker.ts`
- npm script: `npm run worker:resumes`
- Production uploads require `REDIS_URL`; missing Redis → **503** `RESUME_QUEUE_UNAVAILABLE`
- Development/test without Redis: enqueue is skipped (upload still returns 202)

### 4.2 Queue design

| Item | Value |
| --- | --- |
| Queue name | `resume-analysis` |
| Job name | `analyze` |
| Payload | `{ resumeId, analysisId, studentId }` |
| Job id | `analysisId` (dedupe by analysis row) |
| Attempts | 3 (`RESUME_ANALYSIS_JOB_ATTEMPTS`) |
| Backoff | Exponential from 5s (`RESUME_ANALYSIS_BACKOFF_MS`) |
| Concurrency | 3 default (`RESUME_ANALYSIS_QUEUE_CONCURRENCY`) |
| Idempotency | If analysis already `completed`, processor no-ops |

### 4.3 Module layout

| File | Role |
| --- | --- |
| `src/config/redis.ts` | Shared ioredis connection factory (`maxRetriesPerRequest: null` for BullMQ) |
| `src/queues/resumeAnalysis.constants.ts` | Queue + job names |
| `src/queues/resumeAnalysis.types.ts` | `ResumeAnalysisJobPayload` |
| `src/queues/resumeAnalysis.queue.ts` | `enqueueResumeAnalysis()`, lazy Queue singleton |
| `src/modules/resumes/resumeAnalysis.processor.ts` | Testable job orchestration (claim + validate) |
| `src/workers/resumeAnalysis.worker.ts` | Worker process, failed-job handler, SIGTERM shutdown |

### 4.4 Processor behavior (M4 stub)

1. Load analysis + resume via repositories.
2. If `completed` → return (idempotent).
3. Validate resume belongs to `studentId`.
4. If `pending` → `updateAnalysisStatus(..., 'processing')`.
5. **M5–M7:** download PDF → extract → OpenAI → `completeAnalysis` → `setActiveResume`.

On final job failure (after all retries), worker calls `failAnalysis(analysisId, error.message)`.

Non-retryable errors (missing analysis/resume, student mismatch) throw BullMQ `UnrecoverableError`.

### 4.5 Upload integration

`resumes.service.upload` calls `enqueueResumeAnalysis` after creating the pending analysis row. Upload response unchanged (**202**).

### 4.6 Env / config

| Variable | Default | Purpose |
| --- | --- | --- |
| `REDIS_URL` | optional | Required in production for enqueue + worker |
| `RESUME_ANALYSIS_QUEUE_CONCURRENCY` | `3` | Worker parallelism |
| `RESUME_ANALYSIS_JOB_ATTEMPTS` | `3` | Max retries per job |
| `RESUME_ANALYSIS_BACKOFF_MS` | `5000` | Exponential backoff base delay |

### 4.7 Deploy runbook

Run **two processes** in environments that perform analysis:

```bash
# Terminal 1 — API
npm run dev

# Terminal 2 — worker (requires REDIS_URL)
npm run worker:resumes
```

Local Redis example: `REDIS_URL=redis://localhost:6379`

### 4.8 Tests

| File | Covers |
| --- | --- |
| `src/__tests__/phase4.queue.test.ts` | Production without Redis → 503; enqueue payload + jobId |
| `src/__tests__/phase4.worker.test.ts` | Idempotent completed, pending→processing, UnrecoverableError paths |
| `src/__tests__/phase4.upload.test.ts` | Upload calls `enqueueResumeAnalysis` |

**Verify:**

```bash
npm test -- src/__tests__/phase4
npm run typecheck
```

### 4.9 Files touched

| Action | Path |
| --- | --- |
| Create | `src/config/redis.ts` |
| Create | `src/queues/resumeAnalysis.constants.ts` |
| Create | `src/queues/resumeAnalysis.types.ts` |
| Create | `src/queues/resumeAnalysis.queue.ts` |
| Create | `src/modules/resumes/resumeAnalysis.processor.ts` |
| Create | `src/workers/resumeAnalysis.worker.ts` |
| Edit | `src/modules/resumes/resumes.service.ts` |
| Edit | `src/modules/resumes/resumes.constants.ts` |
| Edit | `src/config/env.ts` |
| Edit | `.env.example` |
| Edit | `package.json` (`bullmq`, `worker:resumes` script) |
| Create | `src/__tests__/phase4.queue.test.ts` |
| Create | `src/__tests__/phase4.worker.test.ts` |
| Edit | `src/__tests__/phase4.upload.test.ts` |

### 4.10 Out of scope for Milestone 4

| Concern | Milestone |
| --- | --- |
| PDF text extraction | 5 (done) |
| OpenAI scoring | 6 (done) |
| Persist scores + set `students.resume_id` | 7 |
| Read/poll APIs | 8 |

## Milestone 4 exit checklist

| Item | Status |
| --- | --- |
| Job enqueued on successful upload | Done |
| Worker process starts and consumes jobs | Done |
| Retries + exponential backoff configured | Done |
| Missing Redis fails clearly in production (503) | Done |
| Idempotent completed jobs (no-op) | Done |
| Final failure marks analysis `failed` | Done |
| Graceful shutdown on SIGTERM/SIGINT | Done |
| `phase4.queue.test.ts` + `phase4.worker.test.ts` green | Done |

**What comes next:** Milestone 5 — PDF text extraction from stored resume files.

---

# Milestone 5 — PDF Text Extraction

**Status:** Complete  
**Depends on:** Milestone 4 (worker consumes jobs)  
**Does not include:** OpenAI scoring (Milestone 6), `students.resume_id` (Milestone 7)

## What it is

Milestone 5 converts the stored PDF into **plain text** suitable for an OpenAI prompt. The worker downloads the file from Supabase Storage and extracts text before any AI call.

## Why it is a separate milestone

Extraction failures (scanned image-only PDFs, corrupt files, empty text) should be classified **before** spending OpenAI tokens. Keeping extract as its own module allows swapping libraries later.

## What was done

### 5.1 Library

- **`pdf-parse` v2** (`PDFParse` class) for text-layer PDFs
- **OCR is out of scope** — image-only scans may yield empty text → `RESUME_EMPTY_TEXT`

### 5.2 Storage download

Extended `src/config/resumeStorage.ts`:

| Method | Purpose |
| --- | --- |
| `downloadPdf(objectPath)` | Download bytes from private `resumes` bucket |

### 5.3 Extract service

File: `src/modules/resumes/resumes.extract.ts`

```typescript
extractTextFromPdf(buffer: Buffer): Promise<string>
```

| Rule | Behavior |
| --- | --- |
| Parse failure | `ResumeEmptyTextError` |
| Text length &lt; `RESUME_MIN_EXTRACT_CHARS` (default 100) | `RESUME_EMPTY_TEXT` |
| Whitespace | Collapsed and trimmed |

Errors live in `src/modules/resumes/resumes.errors.ts` (`ResumeEmptyTextError`).

### 5.4 Worker integration

`resumeAnalysis.processor.ts` flow after claim:

1. `resumeStorage.downloadPdf(resume.file_url)`
2. `extractTextFromPdf(buffer)`
3. Pass text to OpenAI (M6)

Empty/corrupt PDF → `UnrecoverableError` with `RESUME_EMPTY_TEXT` (no BullMQ retries).

### 5.5 Env

| Variable | Default | Purpose |
| --- | --- | --- |
| `RESUME_MIN_EXTRACT_CHARS` | `100` | Minimum extracted text length |

### 5.6 Tests

| File | Covers |
| --- | --- |
| `src/__tests__/phase4.extract.test.ts` | Valid text, too-short text, parse failure |
| `src/__tests__/phase4.worker.test.ts` | Empty text → non-retryable error |

**Verify:**

```bash
npm test -- src/__tests__/phase4.extract.test.ts
npm test -- src/__tests__/phase4.worker.test.ts
```

### 5.7 Files touched

| Action | Path |
| --- | --- |
| Create | `src/modules/resumes/resumes.extract.ts` |
| Create | `src/modules/resumes/resumes.errors.ts` |
| Edit | `src/config/resumeStorage.ts` |
| Edit | `src/modules/resumes/resumeAnalysis.processor.ts` |
| Edit | `src/config/env.ts` |
| Edit | `.env.example` |
| Create | `src/__tests__/phase4.extract.test.ts` |
| Edit | `package.json` (`pdf-parse`) |

## Milestone 5 exit checklist

| Item | Status |
| --- | --- |
| Text extracted from normal PDF (mocked unit test) | Done |
| Empty/corrupt mapped to `RESUME_EMPTY_TEXT` | Done |
| Worker downloads from Storage before extract | Done |
| OCR explicitly out of scope | Done |

**What comes next:** Milestone 6 — OpenAI structured scoring on extracted text.

---

# Milestone 6 — OpenAI Scoring Service

**Status:** Complete  
**Depends on:** Milestone 5 (extracted resume text)  
**Does not include:** `students.resume_id` linkage (Milestone 7)

## What it is

Milestone 6 calls OpenAI with extracted resume text and returns **structured** ATS-style scoring and feedback. Results are validated with Zod and persisted via `completeAnalysis`.

## Why OpenAI here

Phase 4 requires AI scoring. Structured JSON keeps persistence deterministic (numeric `ats_score`, typed skills/suggestions) instead of free-form prose.

## What was done

### 6.1 Config

| Variable | Default | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | optional in API; required for worker | Never commit |
| `OPENAI_MODEL` | `gpt-4o-mini` | Chat model |
| `OPENAI_TIMEOUT_MS` | `60000` | Request timeout |

Validated in `src/config/env.ts`; documented in `.env.example`.

### 6.2 Services

| File | Role |
| --- | --- |
| `src/modules/resumes/resumes.openai.schema.ts` | Zod schema matching `AnalysisResultDto` (§1.2) |
| `src/modules/resumes/resumes.openai.ts` | `analyzeResumeText(text, { client? })` |
| `src/modules/resumes/resumes.errors.ts` | `OpenAiAnalysisError` with `retryable` flag |

OpenAI call uses `response_format: { type: 'json_object' }`, temperature `0.2`, and server-side grade fallback (A ≥ 85, B ≥ 70, C ≥ 55, else D).

### 6.3 Error classification

| Error | Behavior |
| --- | --- |
| Rate limit / 5xx | `OpenAiAnalysisError(retryable: true)` → BullMQ retry |
| Invalid JSON / Zod mismatch | Retryable |
| Auth / bad API key | Non-retryable → `UnrecoverableError` |
| Missing `OPENAI_API_KEY` | Non-retryable |

### 6.4 Processor persistence

After successful OpenAI response, processor calls `resumesRepository.completeAnalysis` with:

- `ats_score`, `grade`, `score_breakdown`, `extracted_skills`, `summary`
- `strengths`, `suggestions`, `issues_identified`
- `model`, `raw_response`

Analysis status becomes `completed`. Active resume linkage is handled in Milestone 7.

### 6.5 Tests

| File | Covers |
| --- | --- |
| `src/__tests__/phase4.openai.test.ts` | Schema parse, grade fallback, auth fail, schema mismatch |
| `src/__tests__/phase4.worker.test.ts` | Full pipeline through `completeAnalysis` |

**Verify:**

```bash
npm test -- src/__tests__/phase4
npm run typecheck
```

Worker smoke (requires `REDIS_URL`, `OPENAI_API_KEY`, Supabase):

```bash
npm run worker:resumes
```

### 6.6 Files touched

| Action | Path |
| --- | --- |
| Create | `src/modules/resumes/resumes.openai.ts` |
| Create | `src/modules/resumes/resumes.openai.schema.ts` |
| Edit | `src/modules/resumes/resumeAnalysis.processor.ts` |
| Edit | `src/config/env.ts` |
| Edit | `.env.example` |
| Create | `src/__tests__/phase4.openai.test.ts` |
| Edit | `src/__tests__/phase4.worker.test.ts` |
| Edit | `package.json` (`openai`) |

### 6.7 Out of scope for Milestone 6

| Concern | Milestone |
| --- | --- |
| Set `students.resume_id` on success | 7 (done) |
| Read/poll APIs for clients | 8 |

## Milestone 6 exit checklist

| Item | Status |
| --- | --- |
| Structured result matches contract (Zod) | Done |
| Env vars documented | Done |
| Mocked unit tests pass (no live key in CI) | Done |
| Retry vs fail-fast classified | Done |
| `resume_analysis.model` set on complete | Done |

**What comes next:** Milestone 7 — set `students.resume_id` to the newly analyzed resume on success.

---

# Milestone 7 — Persistence & Active-Resume Linkage

**Status:** Complete  
**Depends on:** Milestone 6 (`completeAnalysis` persists OpenAI output)  
**Does not include:** `student_skills` sync (optional stretch), read APIs (Milestone 8)

## What it is

Milestone 7 promotes a successfully analyzed resume to the student's **active resume** by updating `students.resume_id`. This completes the Phase 3A product rule: profiles and later phases read the active resume via that pointer.

## Why

Without updating `students.resume_id`, upload + analysis completes in isolation — the student profile still points at an old resume (or null). Only **completed** analyses promote the pointer; failed jobs leave the previous active resume unchanged.

## What was done

### 7.1 Repository method

File: `src/database/students.repository.ts`

```typescript
setActiveResume(studentId: string, resumeId: string | null): Promise<StudentRecord>
```

Delegates to `updateProfile(id, { resumeId })`. Already existed from Phase 3B; wired into the worker in M7.

### 7.2 Processor ordering

File: `src/modules/resumes/resumeAnalysis.processor.ts`

On success:

1. `completeAnalysis(...)` — status `completed`, scores persisted
2. `setActiveResume(studentId, resumeId)` — promote active pointer

On failure (extract/OpenAI/DB): **no** `setActiveResume` call — previous active resume preserved.

### 7.3 Idempotent completed jobs

If analysis is already `completed` (e.g. BullMQ redelivery after `completeAnalysis` succeeded but `setActiveResume` failed), the processor skips re-analysis but still calls `setActiveResume` to heal the pointer.

### 7.4 Out of scope (documented)

| Concern | Status |
| --- | --- |
| `student_skills` upsert from `extracted_skills` | Not implemented — optional best-effort stretch |
| Latest upload promoted when analysis **failed** | Explicitly **not** the default |

### 7.5 Tests

| File | Covers |
| --- | --- |
| `src/__tests__/phase4.worker.test.ts` | `setActiveResume` after success; not called on empty PDF; idempotent completed path |
| `src/__tests__/phase3.repositories.test.ts` | Exports `setActiveResume` |
| `src/__tests__/phase3.matrix.test.ts` | CASCADE/SET NULL on delete (unchanged, still green) |

**Verify:**

```bash
npm test -- src/__tests__/phase4.worker.test.ts
npm test -- src/__tests__/phase3.repositories.test.ts
npm run typecheck
```

### 7.6 Files touched

| Action | Path |
| --- | --- |
| Edit | `src/modules/resumes/resumeAnalysis.processor.ts` |
| Edit | `src/__tests__/phase4.worker.test.ts` |
| Edit | `src/__tests__/phase3.repositories.test.ts` |

## Milestone 7 exit checklist

| Item | Status |
| --- | --- |
| Completed analysis row fully populated (M6) | Done |
| `students.resume_id` updated on success | Done |
| Failed analysis does not clobber active resume | Done |
| History preserved (old resumes remain) | Done |
| Optional skill sync documented as out of scope | Done |

**What comes next:** Milestone 8 — read/poll/delete APIs + Swagger.

---

# Milestone 8 — Read APIs, Polling & Swagger

**Status:** Complete  
**Depends on:** Milestones 3–7 (upload pipeline + analysis persistence + active resume)  
**Does not include:** Full Phase 4 test matrix (Milestone 9)

## What it is

Milestone 8 exposes read/delete endpoints and documents them in Swagger so clients can list resumes, poll analysis status, and display completed results.

## Why

Upload returns **202**; the UI must poll until `completed` or `failed`. Without read APIs, the pipeline is not usable end-to-end.

## What was done

### 8.1 Endpoints

| Method | Path | Success | Behavior |
| --- | --- | --- | --- |
| `GET` | `/api/v1/resumes` | 200 | List student's resumes (newest first) with `is_active` |
| `GET` | `/api/v1/resumes/:id` | 200 | Resume metadata; **404** `RESUME_NOT_FOUND` if not owner |
| `GET` | `/api/v1/resumes/:id/analysis` | 200 | Latest analysis + `status`; **404** if no analysis |
| `DELETE` | `/api/v1/resumes/:id` | 200 | Delete Storage object + DB row (CASCADE analysis; `students.resume_id` SET NULL via FK) |

Ownership: `requireOwnedResume()` in the service layer checks `resume.student_id === req.user.id`. Cross-owner access returns **404** (no existence leak).

### 8.2 Response mapping

File: `src/modules/resumes/resumes.mapper.ts`

| Function | Maps to |
| --- | --- |
| `toResumeListItem` | `ResumeListItem` (+ `is_active` from `students.resume_id`) |
| `toAnalysisResponse` | `AnalysisResponse` with `result` when `status === completed` |
| `toAnalysisResultDto` | Full ATS score, skills, strengths, suggestions |

### 8.3 Polling contract

Client polls `GET /api/v1/resumes/:id/analysis` every 2–3s until status is terminal:

| Status | `result` field |
| --- | --- |
| `pending` / `processing` | `null` |
| `completed` | Full `AnalysisResultDto` |
| `failed` | `null`; `error_message` set |

### 8.4 Delete behavior

1. Verify ownership
2. `resumeStorage.deleteObject(file_url)`
3. `resumesRepository.deleteById(id)` — cascades `resume_analysis`; DB FK sets `students.resume_id` NULL if this was the active resume

### 8.5 Swagger

Extended `src/config/swagger.ts` with:

- Tag: **Resumes**
- Paths: `/resumes`, `/resumes/{id}`, `/resumes/{id}/analysis`
- Schemas: `UploadResumeResponse`, `ResumeListItem`, `AnalysisResponse`
- Multipart upload docs on `POST /resumes`

Visible at `/api/docs`.

### 8.6 Tests

| File | Covers |
| --- | --- |
| `src/__tests__/phase4.read.test.ts` | List, get, analysis poll, delete, ownership 404, role 403 |
| `src/__tests__/phase4.swagger.test.ts` | Resume paths and schemas in OpenAPI spec |
| `src/__tests__/phase4.scaffold.test.ts` | Updated list returns 200 |

**Verify:**

```bash
npm test -- src/__tests__/phase4
npm run typecheck
```

### 8.7 Files touched

| Action | Path |
| --- | --- |
| Create | `src/modules/resumes/resumes.mapper.ts` |
| Edit | `src/modules/resumes/resumes.service.ts` |
| Edit | `src/config/swagger.ts` |
| Create | `src/__tests__/phase4.read.test.ts` |
| Create | `src/__tests__/phase4.swagger.test.ts` |
| Edit | `src/__tests__/phase4.scaffold.test.ts` |

## Milestone 8 exit checklist

| Item | Status |
| --- | --- |
| All four read/delete routes work | Done |
| Non-owner cannot read (404) | Done |
| Swagger shows Phase 4 resume routes | Done |
| Polling returns status + completed result | Done |
| Delete removes Storage + DB row | Done |

**What comes next:** Milestone 9 — full Phase 4 test matrix and hardening.

---

# Milestone 9 — Testing Matrix & Hardening

## What it is

Milestone 9 is the quality gate: prove upload, queue, extraction, OpenAI mapping, persistence, authz, and failure paths.

## Why

Phase 3 used a testing matrix before declaring the phase done. Phase 4 touches money-costing APIs (OpenAI) and private files — regressions are expensive.

## How it will be completed

### 9.1 Test files (suggested)

| File | Kind | Covers |
| --- | --- | --- |
| `phase4.schema.test.ts` | Static | Migration columns / CHECKs |
| `phase4.upload.test.ts` | HTTP | Auth, validation, 202 |
| `phase4.worker.test.ts` | Unit | Status transitions, idempotency |
| `phase4.openai.test.ts` | Unit | Schema parse with mock |
| `phase4.extract.test.ts` | Unit | Fixture PDFs |
| `phase4.matrix.test.ts` | Live (optional) | Storage + DB with env |

Script: `npm run test:phase4`.

### 9.2 Hardening

- Upload rate limit
- Max concurrent analyses per student (optional)
- Redact raw resume text from logs
- Ensure `OPENAI_API_KEY` never logged
- Worker health / failed-job metrics (basic logging)

### 9.3 Steps

1. Add Jest suites with mocks for Storage/OpenAI/Redis where needed.
2. Run full suite in CI.
3. Fill Phase exit checklist evidence column.
4. Mark milestones Complete in this document when done.

## Milestone 9 exit checklist

| Item | Done when |
| --- | --- |
| Upload validation tests | Pass |
| Authz ownership tests | Pass |
| Worker success + fail paths | Pass |
| OpenAI mock schema tests | Pass |
| `npm run test:phase4` green | CI-ready |
| Secrets not in repo | Verified |

---

# Phase 4 Exit Checklist

| # | Checklist item | Status | Evidence |
| --- | --- | --- | --- |
| 1 | All milestones 1–9 complete and tested | Pending | |
| 2 | Student can upload PDF and receive 202 + analysis id | Done | M3 upload |
| 3 | Worker completes OpenAI scoring and persists `resume_analysis` | Done | M5–M6 |
| 4 | Failed jobs mark `failed` with reason; retries documented | Done | M4 worker |
| 5 | `students.resume_id` updated only on successful analysis | Done | M7 processor |
| 6 | Only owning student can access own resumes/analysis | Done | M8 read tests |
| 7 | Secrets via env only (`OPENAI_API_KEY`, Redis, Supabase) | Pending | |
| 8 | Phase 4 test suite green | Pending | |
| 9 | Docs match implemented behavior | Pending | |
| 10 | API + worker both documented for deploy | Pending | |

### Phase 4 verdict

**In progress.** Milestones 1–8 are complete (full client-facing upload → analyze → poll → delete flow). Milestone 9 (test matrix & hardening) remains.

---

# Appendix A — Key existing files

| Path | Role |
| --- | --- |
| `supabase/migrations/20260710000000_phase3_schema.sql` | Creates `resumes`, `resume_analysis` |
| `src/database/resumes.repository.ts` | Resume + analysis repository stubs |
| `src/middleware/authenticate.ts` / `authorize.ts` | Auth gates |
| `src/config/env.ts` | Env validation (`REDIS_URL` already optional) |
| `src/modules/auth/` | Pattern for feature modules |
| `documentation/INTEGRATION.md` | analytiCV analyzer response shape reference |

# Appendix B — New / planned files

| Path | Role | Status |
| --- | --- | --- |
| `supabase/migrations/20260711000000_phase4_resume_analysis.sql` | Status + payload columns | Done (M2) |
| `supabase/migrations/20260712000000_phase4_resume_storage_bucket.sql` | Private `resumes` bucket | Done (M3) |
| `src/config/resumeStorage.ts` | Storage upload/delete helpers | Done (M3) |
| `src/modules/resumes/*` | Feature module | Done (M1–M3) |
| `src/middleware/resumeUploadRateLimiter.ts` | Upload rate limit | Done (M3) |
| `src/config/redis.ts` | Shared Redis connection for BullMQ | Done (M4) |
| `src/queues/resumeAnalysis.queue.ts` | Enqueue analysis jobs | Done (M4) |
| `src/workers/resumeAnalysis.worker.ts` | BullMQ worker | Done (M4) |
| `src/modules/resumes/resumes.extract.ts` | PDF text extraction | Done (M5) |
| `src/modules/resumes/resumes.openai.ts` | OpenAI scoring | Done (M6) |
| `src/__tests__/phase4.*.test.ts` | Phase 4 tests | Partial (M1–M6) |

# Appendix C — Environment variables (Phase 4)

| Variable | Required for | Notes |
| --- | --- | --- |
| `REDIS_URL` | Upload enqueue + worker | Required in production |
| `RESUME_ANALYSIS_QUEUE_CONCURRENCY` | Worker | Default `3` |
| `RESUME_ANALYSIS_JOB_ATTEMPTS` | Queue retries | Default `3` |
| `RESUME_ANALYSIS_BACKOFF_MS` | Queue backoff | Default `5000` |
| `OPENAI_API_KEY` | Worker | Required for analysis; never commit |
| `OPENAI_MODEL` | Worker | Default `gpt-4o-mini` |
| `OPENAI_TIMEOUT_MS` | Worker | Default `60000` |
| `RESUME_MIN_EXTRACT_CHARS` | Worker extract | Default `100` |
| `RESUME_STORAGE_BUCKET` | API + worker | Default `resumes` |
| `RESUME_MAX_BYTES` | API | Default 5 MB |
| Existing `SUPABASE_*` | API + worker | Service role for Storage + DB |

---

*KUPC — Phase 4 specification. Implementation begins after acceptance.*
