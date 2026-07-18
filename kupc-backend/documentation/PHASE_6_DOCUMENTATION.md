# KUPC Phase 6 — Job Posting & Discovery

**Status:** Phase 6 complete (B1–B5, F1–F6)  
**Date:** 2026-07-17 (progress report updated 2026-07-18)  
**Depends on:** Phase 2 (Auth), Phase 3B (`jobs` / `saved_jobs` repos), Phase 5 (profiles + `requireVerifiedCompany`)  
**References:** `KUPC_Phase6_Specification.pdf`  
**Feeds into:** Phase 7 — Swipe Engine (`KUPC_Phase7_Specification.pdf`)  
**Close-out:** See [Remaining Work After Phase 6](#remaining-work-after-phase-6) and [Mini Progress Report](#mini-progress-report-phase-6-close-out) at the end of this file.

| Milestone | Side | Topic | Status |
| --- | --- | --- | --- |
| B1 | Backend | Jobs module scaffold & contracts | **Complete** |
| B2 | Backend | Company job CRUD | **Complete** |
| B3 | Backend | Student discovery feed | **Complete** |
| B4 | Backend | Saved jobs API | **Complete** |
| B5 | Backend | Swagger, hardening & test matrix | **Complete** |
| F1 | Frontend | jobsApi + types | **Complete** |
| F2 | Frontend | Company job posting UI | **Complete** |
| F3 | Frontend | Company manage jobs | **Complete** |
| F4 | Frontend | Student discover feed | **Complete** |
| F5 | Frontend | Saved jobs wiring | **Complete** |
| F6 | Frontend | Job detail + polish + docs | **Complete** |

---

# What Phase 6 Is

Phase 6 turns the Phase 3 **jobs** and **saved_jobs** tables into a product surface: verified companies post roles; students discover, open, and save them. It replaces the Phase 2 `POST /jobs` placeholder and prepares the frontend clients that later milestones wire into Discover / Job Post / Saved screens.

**Phase 5** answered: *Who is this company, and are they verified?*  
**Phase 6** answers: *How does a company post a job, and how does a student find it?*

## Design decisions (locked)

| Decision | Choice | Why |
| --- | --- | --- |
| Module layout | `src/modules/jobs/` mirrors students/resumes | Controller → Service → Repository |
| Repositories | Reuse Phase 3B `jobsRepository` / `savedJobsRepository` | No ad-hoc `.from('jobs')` in feature modules |
| HTTP naming | snake_case on the wire | Matches auth / profiles / resumes |
| Create default | `draft`; publish → `open` | Avoid accidental public posts (B2) |
| B1 scope | Contracts + auth gates; handlers return `501 NOT_IMPLEMENTED` | CRUD = B2; feed = B3; saved = B4 |

---

# Milestone B1 — Jobs Module Scaffold & Contracts

**Status:** Complete  
**Depends on:** Phase 2 auth middleware, Phase 3B `jobsRepository`, `requireVerifiedCompany`  
**Does not include:** Real CRUD (B2), feed filters (B3), saved jobs (B4), Swagger (B5)

## What it is

B1 locks HTTP contracts, Zod validation, DTOs, mappers, and error codes, then replaces `src/routes/jobs.ts` (placeholder `job_id`) with a real module mounted at `/api/v1/jobs`. Service methods throw `501 NOT_IMPLEMENTED` until B2–B4 fill them in.

## Why it happens first

Without shared DTOs and route order (`/me`, `/saved` before `/:id`), company CRUD and student feed invent incompatible shapes. Auth gates must be proven before persistence logic lands.

## What was decided / locked

### B1.1 HTTP routes (mounted; behavior stubbed)

| Method | Path | Auth | B1 behavior |
| --- | --- | --- | --- |
| `POST` | `/jobs` | Company + verified | Validate body → `501 NOT_IMPLEMENTED` |
| `GET` | `/jobs/me` | Company + verified | `501` |
| `GET/PATCH/DELETE` | `/jobs/me/:id` | Company + verified | `501` |
| `POST` | `/jobs/me/:id/publish\|close` | Company + verified | `501` |
| `GET` | `/jobs` | Any authenticated | Query validate → `501` |
| `GET` | `/jobs/:id` | Any authenticated | `501` |
| `GET` | `/jobs/saved` | Student | `501` |
| `POST/DELETE` | `/jobs/:id/save` | Student | `501` |

### B1.2 DTOs

- `JobDto` — full job row (snake_case)
- `JobFeedCardDto` — job + nested `company` summary + `is_saved`
- `CreateJobServiceInput` / `UpdateJobServiceInput` — camelCase service shapes

### B1.3 Error codes

`JOB_NOT_FOUND`, `JOB_FORBIDDEN`, `INVALID_JOB_PAYLOAD`, `INVALID_JOB_TRANSITION`, `SAVED_JOB_NOT_FOUND`, `NOT_IMPLEMENTED`

### B1.4 Validation

- Create: `title` 2–120, `description` 20–10000, optional `location` / `job_type` / `min_cgpa` (0–4)
- Update: at least one field; **status not PATCHable**
- Feed query: `q`, `job_type`, `location`, `min_cgpa`, `limit` (default 20, max 50), `offset`

## Implementation steps (what was done)

1. Created `src/modules/jobs/` (constants, types, validation, errors, mapper, service, controller, routes, index).
2. Wired routes with `authenticate`, `authorize`, `requireVerifiedCompany`, and Zod `validate`.
3. Registered static paths (`/me*`, `/saved`) before `/:id`.
4. Replaced `src/routes/jobs.ts` import in `src/routes/index.ts` with `jobsRouter` from the module; deleted the placeholder file.
5. Added mapper unit tests and HTTP scaffold tests; updated legacy `jobs.pending.test.ts` (no more `placeholder-job-id`).
6. Added `npm run test:phase6`.

## Files touched

| Path | Change |
| --- | --- |
| `src/modules/jobs/*` | **Created** module |
| `src/routes/index.ts` | Import `jobsRouter` from modules |
| `src/routes/jobs.ts` | **Deleted** (placeholder) |
| `src/__tests__/phase6.scaffold.test.ts` | **Created** |
| `src/__tests__/phase6.mapper.test.ts` | **Created** |
| `src/__tests__/jobs.pending.test.ts` | Expect `501 NOT_IMPLEMENTED` for approved company |
| `package.json` | `test:phase6` script |

## Milestone B1 exit checklist

| Item | Done when |
| --- | --- |
| Module folder exists | `src/modules/jobs/*` present |
| Placeholder replaced | Response never includes `placeholder-job-id` |
| Auth gates | No token → 401; student POST → 403; pending company → 403 |
| Validation | Empty create body → 400 `VALIDATION_ERROR` |
| Contracts typed | `JobDto` / Zod schemas match Phase 6 spec §4 |
| Tests | `npm run test:phase6` green |

**What comes next:** Milestone B2 — implement `create` / `listMine` / `update` / `publish` / `close` / `delete` against `jobsRepository`.

---

# Milestone B2 — Company Job CRUD

**Status:** Complete  
**Depends on:** B1 routes/auth gates, `jobsRepository`, `companiesRepository.findByUserId`, `requireVerifiedCompany`  
**Does not include:** Student feed (B3 — already done), saved jobs (B4), Swagger (B5)

## What it is

Verified companies can create jobs as **draft**, list/update their own postings, **publish** (`draft → open`), **close** (`open → closed`), and delete. Ownership is enforced so Company A cannot mutate Company B’s jobs.

## Why draft-then-publish

Incomplete descriptions must not appear on the student feed. Publish is an explicit transition; PATCH never sets `status`.

## What was decided / locked

| Rule | Behavior |
| --- | --- |
| Create default | `status: 'draft'` (overrides repository default of `open`) |
| Company resolve | `companiesRepository.findByUserId(userId)` — in this schema `companies.id === users.id` |
| Ownership | `job.company_id !== company.id` → `403 JOB_FORBIDDEN`; missing → `404 JOB_NOT_FOUND` |
| Publish | Only from `draft`; else `409 INVALID_JOB_TRANSITION` |
| Close | Only from `open`; else `409 INVALID_JOB_TRANSITION` |
| Verification | Pending company blocked by middleware before service (`403 PENDING_VERIFICATION`) |

## Endpoints (live)

| Method | Path | Success |
| --- | --- | --- |
| `POST` | `/jobs` | `201` JobDto (`draft`) |
| `GET` | `/jobs/me` | `200` JobDto[] |
| `GET` | `/jobs/me/:id` | `200` JobDto |
| `PATCH` | `/jobs/me/:id` | `200` JobDto |
| `POST` | `/jobs/me/:id/publish` | `200` JobDto (`open`) |
| `POST` | `/jobs/me/:id/close` | `200` JobDto (`closed`) |
| `DELETE` | `/jobs/me/:id` | `200` `{ deleted: true }` |

## Implementation steps (what was done)

1. Implemented `resolveCompanyId` / `requireOwnedJob` helpers in `jobs.service.ts`.
2. Wired `create` (always draft), `listMine`, `getMine`, `updateMine`, `publish`, `close`, `deleteMine`.
3. Left B4 save handlers as `501 NOT_IMPLEMENTED`.
4. Added `src/__tests__/phase6.jobs.crud.test.ts`; updated scaffold + legacy pending-gate tests to expect `201 draft`.

## Files touched

| Path | Change |
| --- | --- |
| `src/modules/jobs/jobs.service.ts` | Live company CRUD |
| `src/__tests__/phase6.jobs.crud.test.ts` | **Created** |
| `src/__tests__/phase6.scaffold.test.ts` | Create → 201 |
| `src/__tests__/jobs.pending.test.ts` | Create → 201 |

## Milestone B2 exit checklist

| Item | Done when |
| --- | --- |
| Create draft | `POST /jobs` → 201 with `status: draft` |
| List own | `GET /jobs/me` scoped to company |
| Ownership | Foreign job → 403 `JOB_FORBIDDEN` |
| Publish/close | Valid transitions 200; invalid → 409 |
| Verification gate | Pending company → 403 `PENDING_VERIFICATION` |
| Tests | `phase6.jobs.crud` suite green |

**What comes next:** B4 (save/unsave) or F2 (Job Post UI). Published jobs already appear on B3 `GET /jobs`.

---

# Milestone B3 — Student Discovery Feed

**Status:** Complete  
**Depends on:** B1 routes/contracts, Phase 3B `jobsRepository` / `savedJobsRepository`, Phase 5 companies  
**Does not include:** Company CRUD (B2), save/unsave endpoints (B4), frontend Discover UI (F4)

## What it is

B3 makes `GET /jobs` and `GET /jobs/:id` real: open jobs only, optional filters, nested approved-company summary, and `is_saved` for student viewers.

> **Note:** B2 create/publish is live. Open jobs from approved companies appear on this feed after publish.

## Why it can ship before B2

Read-side discovery does not require the write API. Repositories already support inserts; tests mock `listOpenFiltered` / `findById`. Shipping B3 unblocks F4 UI work as soon as open jobs exist.

## What was decided / locked

### B3.1 Feed rules

| Rule | Behavior |
| --- | --- |
| Visibility | Only `status = 'open'` |
| Company gate | Skip / 404 if company `verification_status !== 'approved'` (no leak of pending employers) |
| Draft/closed detail | `404 JOB_NOT_FOUND` (same as missing id) |
| `is_saved` | Set from `saved_jobs` only when viewer role is `STUDENT` |
| Auth | Any authenticated role may list/detail (admin/company preview); bookmarks only for students |

### B3.2 Filters (`GET /jobs` query)

| Param | Effect |
| --- | --- |
| `q` | `title` / `description` ILIKE |
| `job_type` | Exact match |
| `location` | ILIKE |
| `min_cgpa` | Jobs with `min_cgpa IS NULL` **or** `min_cgpa <=` value (roles the viewer can meet) |
| `limit` / `offset` | Pagination (default limit 20, max 50) |

### B3.3 Response shape

`JobFeedCardDto`: full `JobDto` fields + nested `company { id, company_name, logo_url, industry, website }` + `is_saved`.

## Implementation steps (what was done)

1. Added `jobsRepository.listOpenFiltered` (filters + range stay in `src/database/`).
2. Added `companiesRepository.findByIds` for batch company hydrate.
3. Implemented `jobsService.listFeed` / `getPublic`; controller passes `{ id, role }`.
4. Kept B2/B4 methods as `501 NOT_IMPLEMENTED`.
5. Added `src/__tests__/phase6.feed.test.ts`; removed obsolete scaffold “feed stub” assertion.

## Files touched

| Path | Change |
| --- | --- |
| `src/database/jobs.repository.ts` | `ListOpenFilteredInput` + `listOpenFiltered` |
| `src/database/companies.repository.ts` | `findByIds` |
| `src/modules/jobs/jobs.service.ts` | Live `listFeed` / `getPublic` |
| `src/modules/jobs/jobs.controller.ts` | Pass viewer role |
| `src/__tests__/phase6.feed.test.ts` | **Created** |
| `src/__tests__/phase6.scaffold.test.ts` | Dropped B3 stub expectation |

## Milestone B3 exit checklist

| Item | Done when |
| --- | --- |
| Open only | Draft/closed never returned from `GET /jobs` |
| Filters | `job_type` / `q` / `location` / `min_cgpa` forwarded to repository |
| Detail | `GET /jobs/:id` includes company summary for open approved jobs |
| 404 hygiene | Unknown / draft / pending-company → `404 JOB_NOT_FOUND` |
| Tests | `npm run test:phase6` includes feed suite green |

**What comes next:** B4 (save/unsave) or F2/F4 (wire Job Post / Discover UI).

---

# Milestone B4 — Saved Jobs API

**Status:** Complete  
**Depends on:** B3 public job rules, `savedJobsRepository`  
**Does not include:** Frontend Saved screen (F5), Swagger (B5)

## What it is

Students can bookmark open jobs, unsave them, and list bookmarks as hydrated `JobFeedCardDto`s (same shape as the Discover feed).

## What was decided / locked

| Rule | Behavior |
| --- | --- |
| Who | `authorize(Role.STUDENT)` only |
| Save target | Job must be `open` + company `approved`; else `404 JOB_NOT_FOUND` |
| Save | Idempotent upsert → `{ saved: true }` |
| Unsave | Idempotent delete → `{ saved: false }` (no 404 if missing) |
| List | Preserve `saved_at` order; drop closed/deleted/pending-company jobs |
| Student id | `students.id === users.id` (pass auth user id to repository) |

## Endpoints (live)

| Method | Path | Success |
| --- | --- | --- |
| `POST` | `/jobs/:id/save` | `200` `{ saved: true }` |
| `DELETE` | `/jobs/:id/save` | `200` `{ saved: false }` |
| `GET` | `/jobs/saved` | `200` JobFeedCardDto[] (`is_saved: true`) |

## Implementation steps (what was done)

1. Implemented `jobsService.save` / `unsave` / `listSaved`.
2. Added `jobsRepository.findByIds` for batch hydrate on list.
3. Routes were already registered in B1 (`/saved` before `/:id`).
4. Added `src/__tests__/phase6.saved.test.ts`.

## Files touched

| Path | Change |
| --- | --- |
| `src/modules/jobs/jobs.service.ts` | Live save/unsave/listSaved |
| `src/database/jobs.repository.ts` | `findByIds` |
| `src/__tests__/phase6.saved.test.ts` | **Created** |

## Milestone B4 exit checklist

| Item | Done when |
| --- | --- |
| Save open job | `POST` → 200; row via `savedJobsRepository.save` |
| Cannot save draft | 404 `JOB_NOT_FOUND` |
| List | Hydrated cards; closed jobs filtered out |
| Unsave | Idempotent 200 |
| Role gate | Company → 403 |

**What comes next:** B5 (Swagger + matrix) or F2–F5 (frontend wiring).

---

# Milestone B5 — Swagger, Hardening & Test Matrix

**Status:** Complete  
**Depends on:** B1–B4  
**Does not include:** Frontend screens (F2–F6)

## What it is

B5 documents every Phase 6 jobs endpoint in OpenAPI (`/api/docs`), locks hardening checks (no PATCHable `status`, CORS origins, route order), and ships a matrix suite so `npm run test:phase6` is the single backend gate for this phase.

## What was decided / locked

| Check | Evidence |
| --- | --- |
| OpenAPI | `Job`, `JobFeedCard`, `CreateJob`, `UpdateJob`, all `/jobs*` paths in `swagger.ts` |
| No status on PATCH body | Zod `updateJobSchema` has no `status` field; Swagger `UpdateJob` omits it |
| CORS | `localhost:5173` and `5174` (+ 127.0.0.1) in `config.ts` |
| Route order | `/me*`, `/saved` before `/:id` |
| Placeholder gone | `src/routes/jobs.ts` deleted; module mount only |

## Implementation steps (what was done)

1. Extended `src/config/swagger.ts` with job schemas and §4 paths.
2. Removed the Phase 2 placeholder `/jobs` OpenAPI entry (duplicate key) so create + feed share one path object.
3. Added `phase6.swagger.test.ts` and `phase6.matrix.test.ts`.
4. Confirmed `npm run test:phase6` green (54 tests) with `--forceExit`.
5. Updated this documentation file to mark B5 complete.

## Files touched

| Path | Change |
| --- | --- |
| `src/config/swagger.ts` | Job schemas + paths; info description |
| `src/__tests__/phase6.swagger.test.ts` | **Created** |
| `src/__tests__/phase6.matrix.test.ts` | **Created** |
| `documentation/PHASE_6_DOCUMENTATION.md` | B5 section |

## Milestone B5 exit checklist

| Item | Done when |
| --- | --- |
| OpenAPI | All Phase 6 paths at `/api/docs` |
| test:phase6 | Full suite green |
| Hardening | Matrix asserts strip/CORS/route order |
| Docs | PHASE_6_DOCUMENTATION.md covers B1–B5 |

**What comes next:** Frontend F2–F6 (Job Post, manage list, Discover, Saved, detail/polish).

---

# Milestone F1 — jobsApi & Types

**Status:** Complete  
**Depends on:** B1–B4 contracts (jobs API live on backend)  
**Does not include:** UI screens (F2–F6)

## What it is

F1 adds typed frontend clients matching the Phase 6 API contract so later screens stay thin (same pattern as `studentsApi` / `resumesApi`).

## Why it happens with B1

Screens must not invent fetch shapes. Clients can land as soon as contracts are stable, even while backend returns `NOT_IMPLEMENTED`.

## Implementation steps (what was done)

1. Extended `src/lib/api/types.ts` with `JobDto`, `JobFeedCard`, `CreateJobBody`, `UpdateJobBody`, `JobFeedQuery`.
2. Created `src/lib/api/jobsApi.ts` with company manage, feed, and saved methods.
3. Exported `jobsApi` from `src/lib/api/index.ts`.
4. Mapped Phase 6 error codes in `errorMessages.ts` (including `PENDING_VERIFICATION`, `NOT_IMPLEMENTED`).

## Files touched

| Path | Change |
| --- | --- |
| `frontend/src/lib/api/types.ts` | Job DTOs |
| `frontend/src/lib/api/jobsApi.ts` | **Created** |
| `frontend/src/lib/api/index.ts` | Export `jobsApi` |
| `frontend/src/lib/api/errorMessages.ts` | Phase 6 codes |

## Milestone F1 exit checklist

| Item | Done when |
| --- | --- |
| Clients export | `jobsApi` importable from `@/lib/api` / `lib/api` |
| Types compile | `tsc --noEmit` clean for new files |
| Errors mapped | User-facing strings for job error codes |

**What comes next:** Milestone F2 — live Job Post UI after B2 CRUD works.

---

# Milestone F2 — Company Job Posting UI

**Status:** Complete  
**Depends on:** B2, F1, RoleGate `COMPANY`  
**Does not include:** Manage list (F3), Discover (F4)

## What it is

F2 replaces the mock Job Post prototype with a live create/edit form against `POST /jobs` and `PATCH /jobs/me/:id`, plus Publish via `POST /jobs/me/:id/publish`. Draft-first matches backend defaults.

## Implementation steps (what was done)

1. Created `frontend/src/app/screens/JobPostPage.tsx` (title, description, location, job_type, min_cgpa).
2. Wired `/app/job-post` and `/app/job-post/:jobId` in `App.tsx`; removed mock `JobPosting` from `prototypeScreens.tsx`.
3. Create → navigate to edit route; Publish available while status is `draft`; `ErrorBanner` for `PENDING_VERIFICATION` and validation failures.
4. Updated `INTEGRATION.md` Job Post → Live.

## Files touched

| Path | Change |
| --- | --- |
| `frontend/src/app/screens/JobPostPage.tsx` | **Created** |
| `frontend/src/app/App.tsx` | Live routes |
| `frontend/src/app/prototypeScreens.tsx` | Removed mock `JobPosting` |
| `frontend/INTEGRATION.md` | Job Post live |
| `documentation/PHASE_6_DOCUMENTATION.md` | F2 section |

## Milestone F2 exit checklist

| Item | Done when |
| --- | --- |
| Create works | Approved company saves draft via UI |
| Pending blocked | Clear banner for pending verification |
| Edit + publish | `/app/job-post/:id` loads, Publish → `open` |

**What comes next:** Milestone F3 — company manage jobs list (publish/close/delete).

---

# Milestone F3 — Company Manage Jobs

**Status:** Complete  
**Depends on:** B2, F2  
**Does not include:** Student Discover (F4)

## What it is

F3 adds a company-owned job list with publish / close / edit / delete so drafts are not stranded after create and open roles can leave the student feed when closed.

## Implementation steps (what was done)

1. Created `frontend/src/app/screens/CompanyJobsPage.tsx` calling `jobsApi.listMine`.
2. Routed `/app/job-post` → manage list; create form moved to `/app/job-post/new`; edit stays `/app/job-post/:jobId`.
3. Actions update local list state (publish/close) or remove row (delete with confirm).
4. Linked from Company Dashboard quick actions; EmptyState when none.

## Files touched

| Path | Change |
| --- | --- |
| `frontend/src/app/screens/CompanyJobsPage.tsx` | **Created** |
| `frontend/src/app/App.tsx` | List / new / `:jobId` routes |
| `frontend/src/app/screens/JobPostPage.tsx` | Links back to list |
| `frontend/src/app/prototypeScreens.tsx` | Dashboard → manage / post |
| `frontend/INTEGRATION.md` | Manage list live |
| `documentation/PHASE_6_DOCUMENTATION.md` | F3 section |

## Milestone F3 exit checklist

| Item | Done when |
| --- | --- |
| List live | Shows draft / open / closed |
| Transitions | Publish / close update row status |
| Delete | Confirm then row removed |

**What comes next:** Milestone F4 — student Discover feed from `GET /jobs`.

---

# Milestone F4 — Student Discover Feed (Live)

**Status:** Complete  
**Depends on:** B3, F1  
**Does not include:** Match persistence (Phase 7); Saved list screen (F5)

## What it is

F4 replaces mock Discover company cards with `jobsApi.listFeed`, real filters (`q`, `job_type`, `location`, `min_cgpa`), company summary on cards, and bookmark save/unsave. Swipe chrome remains local-only (`// MOCK: Phase 7`).

## Implementation steps (what was done)

1. Created `frontend/src/app/screens/DiscoverPage.tsx`.
2. Wired `/app/discover` to the live screen; removed mock `DiscoverPage` from `prototypeScreens.tsx`.
3. Star control → `jobsApi.save` / `unsave` with optimistic UI.
4. EmptyState / ErrorBanner / LoadingSpinner; filters refetch feed.

## Files touched

| Path | Change |
| --- | --- |
| `frontend/src/app/screens/DiscoverPage.tsx` | **Created** |
| `frontend/src/app/App.tsx` | Import live Discover |
| `frontend/src/app/prototypeScreens.tsx` | Removed mock Discover |
| `frontend/INTEGRATION.md` | Discover → Live |
| `documentation/PHASE_6_DOCUMENTATION.md` | F4 section |

## Milestone F4 exit checklist

| Item | Done when |
| --- | --- |
| Live cards | Published jobs appear after refresh |
| Filters work | Query params change results |
| Mocks scoped | No hardcoded COMPANY seed cards for feed data |

**What comes next:** Milestone F5 — Saved jobs screen from `GET /jobs/saved`.

---

# Milestone F5 — Saved Jobs Wiring

**Status:** Complete  
**Depends on:** B4, F4 bookmark control  
**Does not include:** Job detail page (F6)

## What it is

F5 replaces `mockSavedJobs` with `jobsApi.listSaved` so bookmarks survive reload, and Unsave calls `DELETE /jobs/:id/save`.

## Implementation steps (what was done)

1. Created `frontend/src/app/screens/SavedJobsPage.tsx`.
2. Wired `/app/saved` to the live screen; removed inline mock from `App.tsx`.
3. Deleted `frontend/src/app/mockSavedJobs.ts`.
4. Cards link to `/app/jobs/:id` (detail lands in F6) and optional company website.

## Files touched

| Path | Change |
| --- | --- |
| `frontend/src/app/screens/SavedJobsPage.tsx` | **Created** |
| `frontend/src/app/App.tsx` | Live Saved route |
| `frontend/src/app/mockSavedJobs.ts` | **Deleted** |
| `frontend/INTEGRATION.md` | Saved → Live |
| `documentation/PHASE_6_DOCUMENTATION.md` | F5 section |

## Milestone F5 exit checklist

| Item | Done when |
| --- | --- |
| List persists | Reload still shows bookmarks |
| Unsave works | Row disappears |
| Mock removed | No import of `mockSavedJobs` |

**What comes next:** Milestone F6 — job detail, polish, docs.

---

# Milestone F6 — Job Detail, Polish & Documentation

**Status:** Complete  
**Depends on:** F2–F5  
**Does not include:** Match persistence / swipe engine (Phase 7)

## What it is

F6 adds a full job detail page (description + company context + save), a public company card route, confirms LoadingSpinner / ErrorBanner / EmptyState on all Phase 6 job screens, and finishes INTEGRATION / README / this doc.

## Implementation steps (what was done)

1. Created `JobDetailPage` at `/app/jobs/:id` via `jobsApi.getById` + save toggle.
2. Created `CompanyPublicPage` at `/app/companies/:id` via `companiesApi.getPublicById`.
3. Linked Discover card titles and Saved “View details” into the detail route.
4. Audited Discover / Job Post / Manage / Saved / Detail for shared UI states (already present).
5. Updated `frontend/INTEGRATION.md`, `frontend/README.md`, and this file; marked swipe/chat/kanban as Phase 7+.

## Files touched

| Path | Change |
| --- | --- |
| `frontend/src/app/screens/JobDetailPage.tsx` | **Created** |
| `frontend/src/app/screens/CompanyPublicPage.tsx` | **Created** |
| `frontend/src/app/App.tsx` | `/jobs/:jobId`, `/companies/:companyId` |
| `frontend/src/app/screens/DiscoverPage.tsx` | Title → detail |
| `frontend/INTEGRATION.md` | Detail + company live |
| `frontend/README.md` | Phase 6 complete |
| `documentation/PHASE_6_DOCUMENTATION.md` | F6 + phase exit |

## Milestone F6 exit checklist

| Item | Done when |
| --- | --- |
| Detail page | Open job renders full description + company |
| UX polish | Errors use ErrorBanner on job screens |
| Docs updated | INTEGRATION.md + PHASE_6_DOCUMENTATION.md |
| Mock labels | Swipe / chat / kanban marked Phase 7+ |

**What comes next:** Phase 7 — Swipe Engine (persist likes, mutual matches).

---

# Phase 6 Exit Checklist (Whole Phase)

| # | Criterion | Evidence |
| --- | --- | --- |
| 1 | B1–B5; `npm run test:phase6` green | Backend suite (54 tests) |
| 2 | Swagger documents Phase 6 jobs | `swagger.ts` + `phase6.swagger.test.ts` |
| 3 | Create draft → publish → student feed | B2/B3 + F2–F4 |
| 4 | Pending company → `PENDING_VERIFICATION` | Matrix + UI ErrorBanner |
| 5 | Feed filters + job detail + company card | F4 + F6 |
| 6 | Save / unsave / list persists | B4 + F4/F5 |
| 7 | Close/delete own jobs; not others | B2 + F3 |
| 8 | No mock job data on Discover / Job Post / Saved | F2–F5 |
| 9 | INTEGRATION.md + PHASE_6_DOCUMENTATION.md | This file + frontend docs |
| 10 | `tsc` clean on frontend | `npx tsc --noEmit` |

## Manual smoke script

1. Approve a company so `requireVerifiedCompany` passes.
2. Company → Job Posts → Post a job → Publish.
3. Student → Discover → see job → open detail → Save.
4. Saved → confirm → Unsave → gone.
5. Company → Close job → student feed no longer lists it.
6. Pending company → Job Post submit → pending-verification error.

---

# How to verify Phase 6 (B1–B5 + F1–F6)

```bash
# Backend
cd kupc-backend
npm run test:phase6
npm run typecheck

# Frontend
cd frontend
npx tsc --noEmit
```

Manual (API running):

1. `POST /api/v1/jobs` without `Authorization` → 401  
2. Student JWT → 403 `INSUFFICIENT_ROLE`  
3. Pending company JWT + valid body → 403 `PENDING_VERIFICATION`  
4. Approved company JWT + valid body → `201` with `status: draft`  
5. `POST /jobs/me/:id/publish` → job appears on student `GET /jobs`  
6. Student JWT `GET /api/v1/jobs` → 200 list of open approved jobs (empty if none)  
7. `GET /api/v1/jobs/:id` for an open job → 200 with `company` summary; draft id → 404  
8. Student `POST /jobs/:id/save` → `{ saved: true }`; `GET /jobs/saved` lists it; `DELETE` unsaves

---

# Remaining Work After Phase 6

Phase 6 **milestones are complete**, but the product is not “finished.” The items below are intentionally out of Phase 6 scope, known follow-ups, or deferred UX. Track them in Phase 7+ rather than reopening Phase 6 milestones.

## Backend — remaining / deferred

| Area | Status | Notes |
| --- | --- | --- |
| Swipe write APIs | **Done (Phase 7)** | See `PHASE_7_DOCUMENTATION.md` |
| Match create/list APIs | **Done (Phase 7)** | Interest + Matches UI live |
| Feed excludes swiped jobs | **Done (Phase 7)** | Student `GET /jobs` + Discover |
| Undo swipe | **Done (API)** | B3 `DELETE /swipes/:jobId`; no Discover Undo button |
| Conversations / messages APIs | **Later** | Phase 8+ chat |
| Notifications on match | **Later** | Optional; not wired in Phase 7 |
| Express 5 query validation | **Fixed (hotfix)** | Keep `defineProperty` pattern |
| Job moderation / admin job tools | **Out of scope** | — |
| Semantic / vector ranking | **Out of scope** | Spec deferred |

## Frontend — remaining / deferred

| Area | Status | Notes |
| --- | --- | --- |
| Discover swipe persistence | **Live (Phase 7)** | `swipesApi.create` |
| Matches page | **Live (Phase 7)** | `matchesApi.listMine` |
| Company interest / reciprocate UI | **Live (Phase 7)** | `/app/applicants` Interest |
| Chat | **Mock** | Phase 8+ |
| Applicant kanban | **Mock** | Nav slot reused for Interest |
| Admin company approval / analytics | **Mock** | Separate admin phase |
| Company dashboard stats | **Mock** | Stat cards still hard-coded |
| Discover mobile filters | **Partial** | Filter panel hidden on small screens (`md:block`) — polish backlog |
| Job detail deep-link from swipe card | **Partial** | Title links to detail; drag gesture can fight click — UX polish |

## What Phase 6 intentionally delivered

- Verified companies: draft → publish → close → delete  
- Students: open-job feed, filters, save/unsave, job detail, public company card  
- Swagger + `test:phase6` for jobs APIs  
- Live UI for Job Posts / Discover (data) / Saved / Detail  

---

# Mini Progress Report (Phase 6 Close-Out)

**Date:** 2026-07-18  
**Verdict:** Phase 6 **complete** for planned milestones (B1–B5, F1–F6). Phase 7 (Swipe Engine) has since shipped — see `PHASE_7_DOCUMENTATION.md`.

### Shipped (backend)

| Milestone | Deliverable |
| --- | --- |
| B1 | `src/modules/jobs/` scaffold; placeholder `routes/jobs.ts` removed |
| B2 | Company CRUD: create draft, list/update, publish, close, delete + ownership |
| B3 | `GET /jobs` feed + filters; `GET /jobs/:id` with company card |
| B4 | Save / unsave / list saved |
| B5 | Swagger paths + matrix/swagger tests; `npm run test:phase6` |

**Post-milestone hotfix:** Empty student Discover feed when no query string — Express 5 discarded Zod default `limit`/`offset` via `Object.assign(req.query)`. Fixed in `src/middleware/validate.ts` + NaN-safe range in `listOpenFiltered`.

### Shipped (frontend)

| Milestone | Deliverable |
| --- | --- |
| F1 | `jobsApi` + job DTOs + error messages |
| F2 | `JobPostPage` create/edit + publish |
| F3 | `CompanyJobsPage` manage list |
| F4 | Live `DiscoverPage` feed + filters + bookmark |
| F5 | Live `SavedJobsPage`; removed `mockSavedJobs` |
| F6 | `JobDetailPage`, `CompanyPublicPage`, INTEGRATION/README docs |

### Quality gates (at close-out)

| Gate | Result |
| --- | --- |
| `npm run test:phase6` | Green (incl. feed default limit/offset regression) |
| Frontend `tsc --noEmit` | Clean for Phase 6 screens |
| Seed demo | `SeedPass123!` — `seed.student.001@…` / `seed.company.001@…` |
| Live vs mock | Jobs surfaces live; Matches/Chat/Kanban/Admin still mock |

### Progress snapshot

| Track | Done | Remaining (next) |
| --- | --- | --- |
| Job posting & discovery | **100% of Phase 6 plan** | — |
| Swipe → match loop | 0% product API | **Phase 7** |
| Chat | 0% | Phase 8+ |
| Admin / kanban | Mock only | Later phases |

### Recommended next step

1. Read `documentation/KUPC_Phase7_Specification.pdf`.  
2. Start **B1** (swipes module scaffold) + **F1** (API clients) in parallel.  
3. Prioritize **B2 + F2** so Discover Like/Nope survive reload — highest user-visible gap after Phase 6.

**Blockers for Phase 7:** none from Phase 6; relies on existing `swipes` / `matches` repos and open-job feed.  
**Risk to watch:** Express 5 request query/params mutability — always replace validated query objects, don’t mutate getters.
