# KUPC Phase 7 — Swipe Engine

**Status:** Complete (B1–B6, F1–F5)  
**Date:** 2026-07-18  
**Depends on:** Phase 2 (Auth), Phase 3B (`swipes` / `matches` repos), Phase 6 (open jobs feed + Discover UI)  
**References:** `KUPC_Phase7_Specification.pdf`  
**Feeds into:** Phase 8 — Chat & Conversations

| Milestone | Side | Topic | Status |
| --- | --- | --- | --- |
| B1 | Backend | Swipes/matches module scaffold & contracts | **Complete** |
| B2 | Backend | Record swipe + feed exclusion | **Complete** |
| B3 | Backend | Undo window (optional) | **Complete** |
| B4 | Backend | Company interest + match create | **Complete** |
| B5 | Backend | Matches read APIs | **Complete** |
| B6 | Backend | Swagger, hardening & test matrix | **Complete** |
| F1 | Frontend | swipesApi + matchesApi | **Complete** |
| F2 | Frontend | Discover live swipe | **Complete** |
| F3 | Frontend | Company interest inbox | **Complete** |
| F4 | Frontend | Matches list live | **Complete** |
| F5 | Frontend | Polish + docs | **Complete** |

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

---

# Milestone B4 — Company Interest + Match Creation

**Status:** Complete  
**Depends on:** B2 right-swipes, `requireVerifiedCompany`, Phase 3B swipe/match repos  
**Does not include:** `GET /matches/me` nested cards (B5), chat threads (Phase 8), match notifications (optional / deferred), inbound UI (F3)

## What it is

Verified companies list students who **right-swiped** their jobs via `GET /swipes/inbound`, then reciprocate with `POST /matches` `{ job_id, student_id }` to create a durable match. Right alone never creates a match.

## Why it happens now

Discover (student → job) is useless for hiring without a company inbox and an explicit reciprocation write. Matching unlocks Phase 8 chat and the Matches list (B5).

## What was decided / locked

| Rule | Behavior |
| --- | --- |
| Inbound filter | `direction === 'right'` for caller’s `company_id` only |
| Hydration | Batch `studentsRepository.findByIds` + `jobsRepository.findByIds`; drop rows missing student/job |
| Ownership | Job must belong to caller → else `403 MATCH_FORBIDDEN` |
| Prerequisite | `findStudentRightSwipe` required → else `403 MATCH_FORBIDDEN` |
| Idempotent create | Existing triple → return existing MatchDto (no 409); unique race → re-read |
| Nested MatchDto | Flat row only in B4; nested cards in B5 |
| Chat / notifications | Not created here (Phase 8 / optional later) |

## Endpoints (live)

| Method | Path | Success |
| --- | --- | --- |
| `GET` | `/swipes/inbound` | `200` InboundSwipeDto[] |
| `POST` | `/matches` | `201` MatchDto |

Still stubbed: `GET /swipes/me` (`501`). Nested match cards land in B5.

## Implementation steps (what was done)

1. Added `studentsRepository.findByIds` and inbound mappers (`toInboundSwipeDto`).
2. Implemented `swipesService.listInbound` — resolve company → right-swipes → hydrate cards.
3. Implemented `matchesService.create` — own job + right-swipe gate → create or return existing.
4. Added `phase7.matches.test.ts`; dropped inbound/match create scaffold `501` stubs.

## Files touched

| Path | Change |
| --- | --- |
| `src/database/students.repository.ts` | `findByIds` |
| `src/modules/swipes/swipes.mapper.ts` | Inbound DTO helpers |
| `src/modules/swipes/swipes.service.ts` | Live `listInbound` |
| `src/modules/matches/matches.service.ts` | Live `create` |
| `src/__tests__/phase7.matches.test.ts` | **Created** |
| `src/__tests__/phase7.scaffold.test.ts` | Dropped B4 stubs |
| `documentation/PHASE_7_DOCUMENTATION.md` | B4 section |

## Milestone B4 exit checklist

| Item | Done when |
| --- | --- |
| Inbound list | Company sees right-swipes on own jobs with student + job |
| Match create | `POST /matches` inserts once |
| Idempotent | Replay returns existing match |
| Ownership | Foreign job → `403 MATCH_FORBIDDEN` |
| No right-swipe | → `403 MATCH_FORBIDDEN` |
| Tests | `phase7.matches` + `npm run test:phase7` green |

**What comes next:** Milestone B5 — `GET /matches/me` with nested job + counterparty cards.

---

# Milestone B5 — Matches Read APIs

**Status:** Complete  
**Depends on:** B4 match rows, `matchesRepository.listByStudent` / `listByCompany`  
**Does not include:** Chat / messages (Phase 8), Swagger (B6), Matches UI (F4)

## What it is

Students and companies call `GET /matches/me` to list their matches. Each card includes the **job** stub plus the **counterparty** (company for students, student for companies). No message history.

## Why it happens now

Create without list leaves F4 with nowhere to render. Role-aware nesting keeps payloads small while giving both sides enough for a Matches screen.

## What was decided / locked

| Rule | Behavior |
| --- | --- |
| Student | `listByStudent(viewer.id)` → nest `job` + `company` |
| Company | Resolve company → `listByCompany` → nest `job` + `student` |
| Missing job | Drop that match from the response |
| Missing counterparty | Still return match with `job` only |
| Empty | `200 []` |
| Auth | Student or Company (route from B1) |

## Endpoints (live)

| Method | Path | Success |
| --- | --- | --- |
| `GET` | `/matches/me` | `200` MatchDto[] (hydrated) |

Still stubbed: `GET /swipes/me` (`501`).

## Implementation steps (what was done)

1. Extended `toMatchDto` / card helpers for nested job, student, company.
2. Implemented `matchesService.listMine` with role-aware list + batch hydrate.
3. Extended `phase7.matches.test.ts`; dropped scaffold `GET /matches/me → 501`.

## Files touched

| Path | Change |
| --- | --- |
| `src/modules/matches/matches.mapper.ts` | Nested card helpers |
| `src/modules/matches/matches.service.ts` | Live `listMine` |
| `src/__tests__/phase7.matches.test.ts` | B5 list cases |
| `src/__tests__/phase7.scaffold.test.ts` | Removed list stub |
| `documentation/PHASE_7_DOCUMENTATION.md` | B5 section |

## Milestone B5 exit checklist

| Item | Done when |
| --- | --- |
| Student list | Matches with `job` + `company` |
| Company list | Matches with `job` + `student` |
| Empty | `200 []` |
| Tests | `phase7.matches` list cases + `npm run test:phase7` green |

**What comes next:** Milestone B6 — Swagger + hardening & test matrix (or start F1 API clients in parallel).

---

# Milestone B6 — Swagger, Hardening & Test Matrix

**Status:** Complete  
**Depends on:** B1–B5  
**Does not include:** Frontend screens (F1–F5), chat (Phase 8)

## What it is

B6 documents every Phase 7 swipe/match endpoint in OpenAPI (`/api/docs`), locks hardening checks (route order, Express 5 `defineProperty` validation, right ≠ match, feed exclusion), and ships matrix + swagger suites so `npm run test:phase7` is the single backend gate for this phase.

## What was decided / locked

| Check | Evidence |
| --- | --- |
| OpenAPI | `Swipe`, `CreateSwipe`, `InboundSwipe`, `Match`, `CreateMatch`, all `/swipes*` + `/matches*` paths |
| Right ≠ match | `CreateSwipe` description; swipe create never calls `matchesRepository.create` |
| Route order | `/me`, `/inbound` before `/:jobId` |
| Express 5 validate | `defineProperty` for query/params (no `Object.assign`) |
| Feed exclusion | `jobs.service` + `listOpenFiltered({ excludeJobIds })` |
| Undo policy | TTL + refuse when match exists |

## Implementation steps (what was done)

1. Extended `src/config/swagger.ts` with swipe/match schemas and §4 paths; updated info description for Phase 7.
2. Added `phase7.swagger.test.ts` and `phase7.matrix.test.ts`.
3. Confirmed `npm run test:phase7` green with `--forceExit`.
4. Updated this documentation file to mark B6 complete.

## Files touched

| Path | Change |
| --- | --- |
| `src/config/swagger.ts` | Swipe/match schemas + paths; info description |
| `src/__tests__/phase7.swagger.test.ts` | **Created** |
| `src/__tests__/phase7.matrix.test.ts` | **Created** |
| `documentation/PHASE_7_DOCUMENTATION.md` | B6 section |

## Milestone B6 exit checklist

| Item | Done when |
| --- | --- |
| OpenAPI | All Phase 7 paths at `/api/docs` |
| test:phase7 | Full suite green |
| Hardening | Matrix asserts route order / validate / feed exclusion |
| Docs | PHASE_7_DOCUMENTATION.md covers B1–B6 |

**What comes next:** Frontend F1–F5 (`swipesApi` / `matchesApi`, Discover live swipe, company inbox, Matches list, polish).

---

# Milestone F1 — swipesApi & matchesApi

**Status:** Complete  
**Depends on:** Backend B1–B6 (all `/swipes` and `/matches` contracts live)  
**Does not include:** Any screen wiring (F2–F4), undo UI, chat clients

## What it is

F1 is the frontend contract layer for Phase 7. It mirrors how Phase 6 shipped `jobsApi` before Job Post / Discover UI: typed DTOs, thin fetch wrappers, and user-facing error strings — so screens never invent JSON shapes or hard-code status codes.

## Why it ships before UI

Discover, Interest, and Matches all share the same wire format (`snake_case` bodies, envelope `{ success, data, error }`). Landing clients first means F2–F4 stay UI-only and can be reviewed against a single API surface.

## API surface locked in F1

### `swipesApi` (`frontend/src/lib/api/swipesApi.ts`)

| Method | HTTP | Notes |
| --- | --- | --- |
| `create(body)` | `POST /swipes` | `{ job_id, direction: left\|right }` → `SwipeDto` |
| `undo(jobId)` | `DELETE /swipes/:jobId` | Within 30s undo window (B3); unused by F2 UI |
| `listInbound()` | `GET /swipes/inbound` | Verified company; `InboundSwipeDto[]` |
| `listMine()` | `GET /swipes/me` | Optional history; backend may still `501` |

### `matchesApi` (`frontend/src/lib/api/matchesApi.ts`)

| Method | HTTP | Notes |
| --- | --- | --- |
| `create(body)` | `POST /matches` | `{ job_id, student_id }` → `MatchDto` (idempotent) |
| `listMine()` | `GET /matches/me` | Role-aware nested job + counterparty |

### Types (`types.ts`)

- `SwipeDto`, `CreateSwipeBody`, `SwipeDirection`
- `InboundSwipeDto`, `SwipeStudentSummary`, `SwipeUndoResult`
- `MatchDto` (optional nested `job` / `student` / `company`), `CreateMatchBody`

### Error strings (`errorMessages.ts`)

Mapped for: `SWIPE_NOT_FOUND`, `SWIPE_CONFLICT`, `SWIPE_JOB_NOT_OPEN`, `SWIPE_UNDO_EXPIRED`, `INVALID_SWIPE_PAYLOAD`, `MATCH_NOT_FOUND`, `MATCH_FORBIDDEN`, `MATCH_CONFLICT`, `INVALID_MATCH_PAYLOAD`. `NOT_IMPLEMENTED` message generalized beyond jobs-only wording.

## Implementation steps (what was done)

1. Extended `frontend/src/lib/api/types.ts` with the Phase 7 DTOs above.
2. Added `swipesApi.ts` and `matchesApi.ts` using shared `apiRequest`.
3. Re-exported from `lib/api/index.ts`.
4. Wired error codes into `messageFromError`.

## Files touched

| Path | Change |
| --- | --- |
| `frontend/src/lib/api/types.ts` | Swipe/match DTOs |
| `frontend/src/lib/api/swipesApi.ts` | **Created** |
| `frontend/src/lib/api/matchesApi.ts` | **Created** |
| `frontend/src/lib/api/index.ts` | Export clients |
| `frontend/src/lib/api/errorMessages.ts` | Phase 7 codes |
| `documentation/PHASE_7_DOCUMENTATION.md` | F1 section |

## Milestone F1 exit checklist

| Item | Done when |
| --- | --- |
| Clients export | `import { swipesApi, matchesApi } from '…/lib/api'` works |
| Types compile | `npm run typecheck` clean |
| Errors mapped | Swipe/match codes resolve to readable strings |

**What comes next:** F2 — Discover calls `swipesApi.create` on Like/Nope/drag.

---

# Milestone F2 — Discover Live Swipe

**Status:** Complete  
**Depends on:** F1 `swipesApi`, backend B2 (persist + student feed `excludeJobIds`)  
**Does not include:** Undo button (B3 API exists; no Discover UI), company inbox (F3), Matches (F4)

## What it is

F2 turns Discover from a local card carousel into a durable decision stream. Every Like (right), Nope (left), or drag-past-threshold calls `POST /swipes`. The backend stores the row and excludes that job from future `GET /jobs` feeds for that student.

## Product rules enforced in the UI

| Rule | UI behavior |
| --- | --- |
| Persist before animate | Await `swipesApi.create`, then animate card out |
| Duplicate swipe | `409 SWIPE_CONFLICT` → still remove card (already decided) |
| Other failures | Keep card visible; `ErrorBanner`; reset drag offset |
| No double-submit | `swiping` / `swipingRef` disables buttons and drag |
| Deck hygiene | Remove swiped id from local `jobs[]` (not mere index++) so “restart” cannot resurrect them |
| Empty after swipe-through | `deckExhausted` → “You’re caught up” (vs never-had-jobs empty feed) |
| Refresh | `jobsApi.listFeed` returns only unswiped openings (server-side exclusion) |

Right-swipe alone still **does not** create a match — companies reciprocate in F3.

## Implementation steps (what was done)

1. Replaced local-only `advance` with `recordSwipe` / `finishSwipe` in `DiscoverPage.tsx`.
2. Wired drag-end thresholds (±80px) and Like/Nope buttons to `recordSwipe`.
3. Removed `// MOCK: Phase 7` persistence comments and “swipe is local” copy.
4. Distinguished empty feed vs deck-exhausted empty states.

## Manual smoke (seed)

1. Student `seed.student.001@ku.edu.np` → Discover → Like a few jobs.
2. Refresh Discover → those jobs must not reappear.
3. Force duplicate (if possible) → deck still advances without a blocking error.

## Files touched

| Path | Change |
| --- | --- |
| `frontend/src/app/screens/DiscoverPage.tsx` | Live swipe persistence |
| `frontend/INTEGRATION.md` / `README.md` | Status |
| `documentation/PHASE_7_DOCUMENTATION.md` | F2 section |

## Milestone F2 exit checklist

| Item | Done when |
| --- | --- |
| Persist | Reload does not re-show a swiped job |
| Errors | Non-conflict failures show ErrorBanner |
| Conflict | Duplicate treated as skip |
| Copy | No “local only” / MOCK persistence comments |

**What comes next:** F3 — company Interest inbox + Match.

---

# Milestone F3 — Company Interest Inbox

**Status:** Complete  
**Depends on:** F1 clients, F2 right-swipes in DB, backend B4 (`GET /swipes/inbound`, `POST /matches`)  
**Does not include:** Live Matches grid (F4), chat threads (Phase 8), old applicant kanban

## What it is

F3 gives verified companies a place to see **who liked which job** and to **reciprocate**. The screen reuses the existing `/app/applicants` route (sidebar label **Interest**) so nav/role maps stay stable while replacing the mock kanban.

## Screen behavior

| Concern | Behavior |
| --- | --- |
| Load | Parallel `swipesApi.listInbound()` + `matchesApi.listMine()` |
| Matched keys | `job_id:student_id` set from existing matches so refresh shows **Matched** |
| Match action | `matchesApi.create({ job_id, student_id })` → add key to set |
| Idempotent / conflict | Create already returns existing match; `MATCH_CONFLICT` also marks Matched |
| Empty | CTA to Job Posts |
| Pending company | Middleware `PENDING_VERIFICATION` → ErrorBanner (same as other company writes) |
| Dashboard | Quick action “Student interest” → `/app/applicants` |

Inbound cards show student summary (name, avatar, department/year), job title/status, and swipe time.

## Implementation steps (what was done)

1. Created `CompanyInterestPage.tsx`.
2. Pointed `App.tsx` `applicants` route at the live page; nav label → Interest.
3. Added Company Dashboard CTA.
4. Documented in INTEGRATION / README / Phase 7.

## Manual smoke (seed)

1. Student right-swipes an **open** job from an **approved** company.
2. Company `seed.company.001@example.com` → Interest → student row appears.
3. Click **Match** → badge **Matched**; student/company both see it after F4 on Matches.

## Files touched

| Path | Change |
| --- | --- |
| `frontend/src/app/screens/CompanyInterestPage.tsx` | **Created** |
| `frontend/src/app/App.tsx` | Route swap |
| `frontend/src/app/prototypeNav.ts` | Label Interest |
| `frontend/src/app/prototypeScreens.tsx` | Dashboard CTA |
| `documentation/PHASE_7_DOCUMENTATION.md` | F3 section |

## Milestone F3 exit checklist

| Item | Done when |
| --- | --- |
| Inbox live | Right-swipes on own jobs listed |
| Match action | Creates match; UI shows Matched |
| Navigation | Sidebar + dashboard reach the page |
| Types | `npm run typecheck` clean |

**What comes next:** F4 — Matches page reads `matchesApi.listMine`.

---

# Milestone F4 — Matches List Live

**Status:** Complete  
**Depends on:** F1 `matchesApi`, F3 match creation (or seed matches), backend B5 nested `GET /matches/me`  
**Does not include:** Chat / conversations (Phase 8), match filters, notifications

## What it is

F4 replaces the prototype `MatchesPage` hardcoded `MATCHES` grid with a live list from `GET /matches/me`. Students see the **company** counterparty + job; companies see the **student** counterparty + job. Chat remains explicitly disabled until Phase 8.

## Why it happens now

After F3, matches exist in the database but both sides still saw fake Leapfrog/Fusemachines cards. F4 closes the loop: swipe → match → shared Matches screen.

## UI / data rules

| Rule | Behavior |
| --- | --- |
| Data source | Only `matchesApi.listMine()` — no hardcoded match arrays for this screen |
| Student card | Company name + logo (or initials), job title, matched date |
| Company card | Student name + avatar (or initials), job title, matched date |
| Job link | Student → `/app/jobs/:jobId`; Company → `/app/job-post/:jobId` |
| Chat | Disabled button labeled **Chat (Phase 8)** (tooltip explains) |
| Empty (student) | CTA → Discover |
| Empty (company) | CTA → Interest inbox |
| Errors | ErrorBanner + empty list |
| Mock cleanup | Prototype `MatchesPage` removed; `MATCHES` constant kept only for ChatPage demo |

## Implementation steps (what was done)

1. Added `frontend/src/app/screens/MatchesPage.tsx` with role-aware cards.
2. Wired `/app/matches` in `App.tsx` to the live page (dropped `MatchesRoute` wrapper).
3. Removed exported mock `MatchesPage` from `prototypeScreens.tsx`.
4. Expanded Phase 7 frontend documentation (F1–F4 detail) and status tables.

## Manual smoke (end-to-end)

1. Student likes a job (F2).
2. Company Matches from Interest (F3).
3. Both accounts open **Matches** → same connection appears with correct counterparty.
4. Job link opens the right manage/detail route per role.
5. Chat control stays disabled.

## Files touched

| Path | Change |
| --- | --- |
| `frontend/src/app/screens/MatchesPage.tsx` | **Created** (live) |
| `frontend/src/app/App.tsx` | Route → live MatchesPage |
| `frontend/src/app/prototypeScreens.tsx` | Removed mock MatchesPage |
| `frontend/INTEGRATION.md` / `README.md` | Status |
| `documentation/PHASE_7_DOCUMENTATION.md` | Detailed F1–F4 |

## Milestone F4 exit checklist

| Item | Done when |
| --- | --- |
| List live | Real matches from API for student and company |
| Mock removed | Matches screen does not use hardcoded MATCHES data |
| Empty / errors | EmptyState + ErrorBanner behave correctly |
| Chat deferred | Button disabled with Phase 8 label |
| Types | `npm run typecheck` clean |

**What comes next:** Milestone F5 — polish, INTEGRATION close-out, and whole-phase smoke notes.

---

# Milestone F5 — Polish & Documentation

**Status:** Complete  
**Depends on:** F1–F4 screens + B1–B6 APIs  
**Does not include:** Chat (Phase 8), Discover undo button, `GET /swipes/me` history UI, dashboard fake stats

## What it is

F5 closes Phase 7: docs and integration notes match the shipped product, live-vs-mock tables are accurate, Interest/Matches get light polish (refresh), and the whole-phase exit checklist + smoke script are recorded here.

## Why it is the last milestone

Backend and UI paths already work end-to-end after F4. Without a docs/smoke close-out, the next phase inherits ambiguous “still mock?” state (the same gap Phase 6 left for swipes). F5 makes Phase 7 **auditable**: what shipped, what is deferred, how to verify.

## What was decided / locked

| Item | Decision |
| --- | --- |
| Docs of record | `PHASE_7_DOCUMENTATION.md` (this file) + `frontend/INTEGRATION.md` + `frontend/README.md` |
| Undo UI | API (B3) exists; Discover does **not** expose Undo in Phase 7 |
| `GET /swipes/me` | Contract exists; may `501`; no student history screen |
| Chat | Disabled on Matches; prototype Chat page remains mock |
| Interest route id | Keep `/app/applicants` + screen id `applicants` (nav label Interest) |
| Polish | Refresh on Interest + Matches; no redesign of Discover deck |

## Implementation steps (what was done)

1. Added Refresh actions on Interest and Matches.
2. Marked all milestones complete; removed duplicate F5 status row.
3. Expanded INTEGRATION smoke checklist with the swipe → match path.
4. Wrote whole-phase exit checklist, deferred work, and mini progress report below.
5. Confirmed frontend `typecheck` and documented backend `test:phase7` as the API gate.

## Files touched

| Path | Change |
| --- | --- |
| `frontend/src/app/screens/CompanyInterestPage.tsx` | Refresh control |
| `frontend/src/app/screens/MatchesPage.tsx` | Refresh control |
| `frontend/INTEGRATION.md` | Phase 7 complete + smoke |
| `frontend/README.md` | Phase 7 complete |
| `documentation/PHASE_7_DOCUMENTATION.md` | F5 + phase exit |

## Milestone F5 exit checklist

| Item | Done when |
| --- | --- |
| Docs | INTEGRATION + PHASE_7_DOCUMENTATION cover Discover / Interest / Matches |
| Live vs mock | Tables no longer call Matches or Discover swipe “mock” |
| Smoke script | Written and runnable on seed accounts |
| Types | `npm run typecheck` clean |

---

# Phase 7 Exit Checklist (Whole Phase)

| # | Criterion | Owner | Status |
| --- | --- | --- | --- |
| 1 | B1–B6 complete; `npm run test:phase7` green | Backend | **Met** |
| 2 | Swagger documents swipe + match endpoints (`/api/docs`) | Backend | **Met** |
| 3 | Student swipe persists; feed excludes that job after reload | Both | **Met** |
| 4 | Duplicate swipe → `409 SWIPE_CONFLICT` (UI treats as skip) | Both | **Met** |
| 5 | Company inbound + reciprocate creates match | Both | **Met** |
| 6 | `GET /matches/me` works for student and company | Both | **Met** |
| 7 | Discover UI persists via `swipesApi` (not local-only) | Frontend | **Met** |
| 8 | Matches screen not using mock `MATCHES` for data | Frontend | **Met** |
| 9 | INTEGRATION.md + PHASE_7_DOCUMENTATION.md written | Both | **Met** |
| 10 | `test:phase6` still green; frontend `tsc` clean | Both | **Met** |

## Manual smoke script (seed)

Password for all seed users: `SeedPass123!`

1. Login `seed.student.001@ku.edu.np` → **Discover** → Like (right) an open job.
2. Refresh Discover → same job must **not** reappear.
3. Login `seed.company.001@example.com` (or the company that owns that job) → **Interest** → see the student → **Match**.
4. Both accounts → **Matches** → see the connection; job link works; Chat stays disabled.
5. Student tries the same job again (if still in a stale local deck) → conflict handled; after refresh the job stays out.
6. Pending company (`seed.company.040@example.com`) must not use Interest / Match mutating routes (`403 PENDING_VERIFICATION`).

## Quality gates

```bash
# Backend
cd kupc-backend
npm run test:phase7
npm run test:phase6   # still green

# Frontend
cd frontend
npm run typecheck
```

OpenAPI: `http://localhost:5000/api/docs` — Swipes + Matches tags.

---

# Remaining Work After Phase 7

Phase 7 **milestones are complete**. Items below are intentionally out of scope or deferred to Phase 8+.

## Backend — deferred

| Area | Status | Notes |
| --- | --- | --- |
| `GET /swipes/me` history | Stub / optional | May still return `501`; not required for Discover MVP |
| Match notifications | Deferred | `notificationsRepository` exists; not wired on match create |
| Conversation create on match | Deferred | Phase 8 owns `conversations` / `messages` |
| Undo beyond 30s / soft-delete | Out of scope | Hard delete within TTL only |

## Frontend — deferred

| Area | Status | Notes |
| --- | --- | --- |
| Chat UI | **Mock** | Phase 8 |
| Discover Undo button | Not built | B3 API ready if product wants it |
| Student swipe history screen | Not built | Would use `GET /swipes/me` |
| Applicant kanban | **Mock** | Not Phase 7 (Interest replaced that nav slot’s purpose) |
| Company/student dashboard stats | **Mock** | Hard-coded StatCards |
| Admin approval / analytics | **Mock** | Separate workstream |
| Discover filters on mobile | Partial | Filter aside still `md:block` |

## What Phase 7 intentionally delivered

- Students: durable Like/Nope; feed excludes swiped jobs  
- Companies: Interest inbox + Match  
- Both: live Matches list with nested counterparty + job  
- APIs + Swagger + `test:phase7`  
- Right ≠ match until company reciprocates  

---

# Mini Progress Report (Phase 7 Close-Out)

**Date:** 2026-07-18  
**Verdict:** Phase 7 **complete** for planned milestones (B1–B6, F1–F5). Ready for Phase 8 — Chat & Conversations.

### Shipped (backend)

| Milestone | Deliverable |
| --- | --- |
| B1 | `swipes` + `matches` modules; routes mounted; auth gates |
| B2 | `POST /swipes`; student feed `excludeJobIds` |
| B3 | `DELETE /swipes/:jobId` within 30s; refuse if match exists |
| B4 | `GET /swipes/inbound`; idempotent `POST /matches` |
| B5 | `GET /matches/me` nested cards |
| B6 | Swagger + matrix/swagger tests |

### Shipped (frontend)

| Milestone | Deliverable |
| --- | --- |
| F1 | `swipesApi` / `matchesApi` + error messages |
| F2 | Live Discover swipe persistence |
| F3 | Interest inbox + Match |
| F4 | Live Matches page |
| F5 | Docs, smoke script, refresh polish |

### Progress snapshot

| Area | Before Phase 7 | After Phase 7 |
| --- | --- | --- |
| Discover Like/Nope | Local deck only | Persisted swipes |
| Company reciprocation | None | Interest + Match |
| Matches screen | Fake companies | Live `GET /matches/me` |
| Chat | Mock | Still mock (Phase 8) |

**Next phase:** Phase 8 — open conversation threads per match; wire Chat UI; do not invent ad-hoc chat outside match-scoped conversations.
