# KUPC Phase 6 — Job Posting & Discovery

**Status:** In progress (B1 + F1 complete)  
**Date:** 2026-07-17  
**Depends on:** Phase 2 (Auth), Phase 3B (`jobs` / `saved_jobs` repos), Phase 5 (profiles + `requireVerifiedCompany`)  
**References:** `KUPC_Phase6_Specification.pdf`  
**Feeds into:** Phase 7 — Swipe Engine

| Milestone | Side | Topic | Status |
| --- | --- | --- | --- |
| B1 | Backend | Jobs module scaffold & contracts | **Complete** |
| B2 | Backend | Company job CRUD | Pending |
| B3 | Backend | Student discovery feed | Pending |
| B4 | Backend | Saved jobs API | Pending |
| B5 | Backend | Swagger, hardening & test matrix | Pending |
| F1 | Frontend | jobsApi + types | **Complete** |
| F2 | Frontend | Company job posting UI | Pending |
| F3 | Frontend | Company manage jobs | Pending |
| F4 | Frontend | Student discover feed | Pending |
| F5 | Frontend | Saved jobs wiring | Pending |
| F6 | Frontend | Job detail + polish + docs | Pending |

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

# Milestone F1 — jobsApi & Types

**Status:** Complete  
**Depends on:** B1 contracts (handlers may still return `501` until B2–B4)  
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

# How to verify B1 + F1

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
4. Approved company JWT + valid body → 501 `NOT_IMPLEMENTED` (until B2)
