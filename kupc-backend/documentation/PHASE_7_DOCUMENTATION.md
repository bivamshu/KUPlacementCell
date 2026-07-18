# KUPC Phase 7 — Swipe Engine

**Status:** B1–B3 complete; B4–B6 / F1–F5 pending  
**Date:** 2026-07-18  
**Depends on:** Phase 2 (Auth), Phase 3B (`swipes` / `matches` repos), Phase 6 (open jobs feed + Discover UI)  
**References:** `KUPC_Phase7_Specification.pdf`  
**Feeds into:** Phase 8 — Chat & Conversations

| Milestone | Side | Topic | Status |
| --- | --- | --- | --- |
| B1 | Backend | Swipes/matches module scaffold & contracts | **Complete** |
| B2 | Backend | Record swipe + feed exclusion | **Complete** |
| B3 | Backend | Undo window (optional) | **Complete** |
| B4 | Backend | Company interest + match create | Pending |
| B5 | Backend | Matches read APIs | Pending |
| B6 | Backend | Swagger, hardening & test matrix | Pending |
| F1 | Frontend | swipesApi + matchesApi | Pending |
| F2 | Frontend | Discover live swipe | Pending |
| F3 | Frontend | Company interest inbox | Pending |
| F4 | Frontend | Matches list live | Pending |
| F5 | Frontend | Polish + docs | Pending |

---

# What Phase 7 Is

Phase 7 turns Discover gestures into durable decisions: students record left/right swipes on open jobs; companies reciprocate inbound interest to create matches. Phase 3B tables and repositories already exist — this phase adds HTTP modules and UI wiring.

**Phase 6** answered: *How does a company post a job, and how does a student find it?*  
**Phase 7** answers: *How does a student express interest, and when does that become a match?*

## Design decisions (locked)

| Decision | Choice | Why |
| --- | --- | --- |
| Module layout | `src/modules/swipes/` + `src/modules/matches/` | Mirrors jobs/students; clear ownership of routes |
| Repositories | Reuse Phase 3B `swipesRepository` / `matchesRepository` | No ad-hoc `.from('swipes')` in feature modules |
| HTTP naming | snake_case on the wire | Matches auth / jobs |
| Right ≠ match | Match only via company reciprocation (`POST /matches`) | Matches seed product model |
| B1 scope | Contracts + auth gates; handlers return `501 NOT_IMPLEMENTED` | Persist = B2; inbound/match = B4; list = B5 |

---

# Milestone B1 — Swipes/Matches Module Scaffold & Contracts

**Status:** Complete  
**Depends on:** Phase 2 auth middleware, Phase 3B swipe/match repos, `requireVerifiedCompany`  
**Does not include:** Real swipe persistence (B2), undo (B3), inbound/match create (B4), match list (B5), Swagger (B6)

## What it is

B1 locks HTTP contracts, Zod validation, DTOs, mappers, and error codes for swipes and matches, then mounts routers at `/api/v1/swipes` and `/api/v1/matches`. Service methods throw `501 NOT_IMPLEMENTED` until B2–B5.

## Why it happens first

Without shared DTOs and route order (`/me`, `/inbound` before `/:jobId`), Discover and company inbox invent incompatible shapes. Auth gates must be proven before persistence logic lands.

## What was decided / locked

### B1.1 HTTP routes (mounted; behavior stubbed)

| Method | Path | Auth | B1 behavior |
| --- | --- | --- | --- |
| `POST` | `/swipes` | Student | Validate body → `501 NOT_IMPLEMENTED` |
| `GET` | `/swipes/me` | Student | `501` |
| `DELETE` | `/swipes/:jobId` | Student | Validate UUID → `501` |
| `GET` | `/swipes/inbound` | Company + verified | `501` (pending → `403 PENDING_VERIFICATION`) |
| `POST` | `/matches` | Company + verified | Validate body → `501` |
| `GET` | `/matches/me` | Student or Company | `501` |

### B1.2 DTOs

- `SwipeDto` — swipe row (snake_case)
- `InboundSwipeDto` — swipe + student summary + job stub (filled in B4)
- `MatchDto` — match row + optional nested cards (filled in B5)
- `CreateSwipeServiceInput` / `CreateMatchServiceInput` — camelCase service shapes

### B1.3 Error codes

**Swipes:** `SWIPE_NOT_FOUND`, `SWIPE_CONFLICT`, `SWIPE_JOB_NOT_OPEN`, `SWIPE_UNDO_EXPIRED`, `INVALID_SWIPE_PAYLOAD`, `NOT_IMPLEMENTED`  

**Matches:** `MATCH_NOT_FOUND`, `MATCH_FORBIDDEN`, `MATCH_CONFLICT`, `INVALID_MATCH_PAYLOAD`, `NOT_IMPLEMENTED`

### B1.4 Validation

- Create swipe: `job_id` UUID, `direction` in `left|right`
- Undo params: `jobId` UUID
- Create match: `job_id` + `student_id` UUIDs

## Implementation steps (what was done)

1. Created `src/modules/swipes/` (constants, types, validation, errors, mapper, service, controller, routes, index).
2. Created `src/modules/matches/` with the same layout.
3. Wired routes with `authenticate`, `authorize`, `requireVerifiedCompany`, and Zod `validate`.
4. Registered static paths (`/me`, `/inbound`) before `/:jobId`.
5. Mounted routers in `src/routes/index.ts`.
6. Added mapper unit tests and HTTP scaffold tests; `npm run test:phase7`.

## Files touched

| Path | Change |
| --- | --- |
| `src/modules/swipes/*` | **Created** module |
| `src/modules/matches/*` | **Created** module |
| `src/routes/index.ts` | Mount `/swipes`, `/matches` |
| `src/__tests__/phase7.scaffold.test.ts` | **Created** |
| `src/__tests__/phase7.mapper.test.ts` | **Created** |
| `package.json` | `test:phase7` script |
| `documentation/PHASE_7_DOCUMENTATION.md` | **Created** (this file) |

## Milestone B1 exit checklist

| Item | Done when |
| --- | --- |
| Module folders exist | `src/modules/swipes/*` and `matches/*` present |
| Auth gates | No token → 401; company POST `/swipes` → 403; pending inbound → 403 |
| Validation | Empty swipe/match body → 400 `VALIDATION_ERROR` |
| Contracts typed | DTOs / Zod match Phase 7 spec §4 |
| Stub behavior | Valid student swipe / approved match → 501 `NOT_IMPLEMENTED` (until B2+) |
| Tests | `npm run test:phase7` green |

**What comes next:** Milestone B2 — implement `createSwipe` + exclude swiped job IDs from student `GET /jobs` feed.

---

# Milestone B2 — Record Swipe + Feed Exclusion

**Status:** Complete  
**Depends on:** B1 routes/auth gates, `swipesRepository`, `jobsRepository`, `companiesRepository`  
**Does not include:** Undo (B3), inbound list / match create (B4), match list (B5)

## What it is

Students can `POST /swipes` with `{ job_id, direction }` on **open** jobs from **approved** companies. Duplicate swipes return `409 SWIPE_CONFLICT`. Student `GET /jobs` excludes job IDs already present in `swipes` for that student.

## Why it happens now

Without persistence, Discover only advances a local deck — reload reshuffles the same cards. Feed exclusion must use the same `swipes` rows so Like/Nope survive refresh (frontend F2 will call this API).

## What was decided / locked

| Rule | Behavior |
| --- | --- |
| Open + approved only | Draft/closed → `409 SWIPE_JOB_NOT_OPEN`; missing job → `404 JOB_NOT_FOUND`; pending/non-approved company → `409 SWIPE_JOB_NOT_OPEN` |
| Company id | Taken from the job row (not client-supplied) |
| Duplicate | Pre-check via `findByStudentAndJob` + DB unique → `409 SWIPE_CONFLICT` |
| Feed exclusion | Students only; company/admin feeds pass `excludeJobIds: []` |
| Exclude in repo | `listOpenFiltered({ excludeJobIds })` uses PostgREST `not('id', 'in', …)` |

## Endpoints (live)

| Method | Path | Success |
| --- | --- | --- |
| `POST` | `/swipes` | `201` SwipeDto |
| `GET` | `/jobs` (student) | Omits swiped job IDs |

Still stubbed: `GET /swipes/me`, `DELETE /swipes/:jobId`, `GET /swipes/inbound`, match routes (`501`).

## Implementation steps (what was done)

1. Implemented `swipesService.create` — load job, require `status: open`, require approved company, conflict check, `swipesRepository.create`, map via `toSwipeDto`.
2. Extended `ListOpenFilteredInput` with optional `excludeJobIds`; applied in `jobs.repository.listOpenFiltered`.
3. Updated `jobsService.listFeed` to call `swipesRepository.listJobIdsByStudent(viewer.id)` when `viewer.role === STUDENT`.
4. Added `phase7.swipes.test.ts`; updated scaffold (create → 201) and phase6 feed expectations (`excludeJobIds`).

## Files touched

| Path | Change |
| --- | --- |
| `src/modules/swipes/swipes.service.ts` | Live `create` |
| `src/modules/jobs/jobs.service.ts` | Student exclude swiped IDs |
| `src/database/jobs.repository.ts` | `excludeJobIds` filter |
| `src/__tests__/phase7.swipes.test.ts` | **Created** |
| `src/__tests__/phase7.scaffold.test.ts` | Create → 201 |
| `src/__tests__/phase6.feed.test.ts` | Mock swipes + `excludeJobIds` |
| `documentation/PHASE_7_DOCUMENTATION.md` | B2 section |

## Milestone B2 exit checklist

| Item | Done when |
| --- | --- |
| Swipe persists | `POST /swipes` → 201 SwipeDto |
| Deck shrinks | Swiped id passed as `excludeJobIds` on student feed |
| Closed/draft blocked | `409 SWIPE_JOB_NOT_OPEN` |
| Duplicate blocked | `409 SWIPE_CONFLICT` |
| Tests | `phase7.swipes` + `npm run test:phase7` green |

**What comes next:** Milestone B3 — optional undo within a short TTL.

---
U
# Milestone B3 — Undo Window

**Status:** Complete  
**Depends on:** B2 swipe persistence, `swipesRepository`, `matchesRepository`  
**Does not include:** Inbound list / match create (B4), match list (B5), Discover Undo UI (F2)

## What it is

Students can `DELETE /swipes/:jobId` to reverse a swipe **within** `SWIPE_UNDO_WINDOW_SECONDS` (30s). After a successful undo the job can reappear on `GET /jobs` because feed exclusion reads live `swipes` rows. Outside the window → `409 SWIPE_UNDO_EXPIRED`. If a match already exists for that student/job/company → refuse with `409 MATCH_CONFLICT` (no cascade delete).

## Why it happens now

Discover needs a short “oops” path after Like/Nope without reopening permanent history edits. Hard-delete keeps Phase 3B schema simple; refusing undo after match avoids orphaning chat/match state later.

## What was decided / locked

| Rule | Behavior |
| --- | --- |
| Window | `Date.now() - swiped_at > 30s` → `409 SWIPE_UNDO_EXPIRED` |
| Missing swipe | `404 SWIPE_NOT_FOUND` |
| Match exists | `matchesRepository.findByTriple` hit → `409 MATCH_CONFLICT` (refuse) |
| Delete style | Hard delete via `deleteByStudentAndJob` |
| Auth | Student only (route already gated in B1) |

## Endpoints (live)

| Method | Path | Success |
| --- | --- | --- |
| `DELETE` | `/swipes/:jobId` | `200` `{ deleted: true }` |

Still stubbed: `GET /swipes/me`, `GET /swipes/inbound`, match routes (`501`).

## Implementation steps (what was done)

1. Added `swipesRepository.deleteByStudentAndJob`.
2. Implemented `swipesService.undo` — find swipe → refuse if match → enforce TTL → delete.
3. Dropped scaffold `DELETE → 501` expectation; extended `phase7.swipes.test.ts` with B3 cases.

## Files touched

| Path | Change |
| --- | --- |
| `src/database/swipes.repository.ts` | `deleteByStudentAndJob` |
| `src/modules/swipes/swipes.service.ts` | Live `undo` |
| `src/modules/swipes/swipes.constants.ts` | Undo window comment |
| `src/__tests__/phase7.swipes.test.ts` | B3 undo suite |
| `src/__tests__/phase7.scaffold.test.ts` | Removed DELETE stub |
| `documentation/PHASE_7_DOCUMENTATION.md` | B3 section |

## Milestone B3 exit checklist

| Item | Done when |
| --- | --- |
| Undo works | Within TTL → 200; swipe row deleted |
| Expired blocked | Outside TTL → `409 SWIPE_UNDO_EXPIRED` |
| Match refuse | Existing match → `409 MATCH_CONFLICT` |
| Missing | No swipe → `404 SWIPE_NOT_FOUND` |
| Tests | `phase7.swipes` B3 cases + `npm run test:phase7` green |

**What comes next:** Milestone B4 — company inbound interest + match create.
