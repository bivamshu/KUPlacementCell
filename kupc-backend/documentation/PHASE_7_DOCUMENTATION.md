# KUPC Phase 7 — Swipe Engine

**Status:** B1–B6 complete; F1–F3 complete; F4–F5 pending  
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
**Depends on:** B1–B6 contracts (swipe/match API live on backend)  
**Does not include:** Discover wiring (F2), company inbox UI (F3), Matches screen (F4)

## What it is

F1 adds typed frontend clients matching the Phase 7 API contract so Discover, inbound, and Matches screens stay thin (same pattern as `jobsApi`).

## Why it happens with B1–B6 done

Screens must not invent fetch shapes. Clients land now so F2–F4 only wire UI.

## Implementation steps (what was done)

1. Extended `frontend/src/lib/api/types.ts` with swipe/match DTOs and request bodies.
2. Created `swipesApi.ts` (`create`, `undo`, `listInbound`, `listMine`) and `matchesApi.ts` (`create`, `listMine`).
3. Exported both from `lib/api/index.ts`.
4. Mapped Phase 7 error codes in `errorMessages.ts`.

## Files touched

| Path | Change |
| --- | --- |
| `frontend/src/lib/api/types.ts` | Swipe/match DTOs |
| `frontend/src/lib/api/swipesApi.ts` | **Created** |
| `frontend/src/lib/api/matchesApi.ts` | **Created** |
| `frontend/src/lib/api/index.ts` | Export clients |
| `frontend/src/lib/api/errorMessages.ts` | Phase 7 codes |
| `frontend/INTEGRATION.md` / `README.md` | Status notes |
| `documentation/PHASE_7_DOCUMENTATION.md` | F1 section |

## Milestone F1 exit checklist

| Item | Done when |
| --- | --- |
| Clients export | `swipesApi` / `matchesApi` importable from `lib/api` |
| Types compile | `npm run typecheck` clean |
| Errors mapped | User-facing strings for swipe/match codes |

**What comes next:** Milestone F2 — wire Discover Like/Nope to `swipesApi.create`.

---

# Milestone F2 — Discover Live Swipe

**Status:** Complete  
**Depends on:** F1 `swipesApi`, B2 feed exclusion  
**Does not include:** Undo UI (optional), company inbox (F3), Matches screen (F4)

## What it is

Discover Like / Nope / drag-end call `POST /swipes`. Success (or `SWIPE_CONFLICT`) advances the deck and removes the card locally. Backend feed exclusion means a refresh does not re-show swiped jobs. Failures surface via `ErrorBanner`.

## Why it happens now

Without persistence, Discover was a local carousel. F2 makes right/left durable so company inbound (F3) and matches (F4) have real data.

## What was decided / locked

| Rule | Behavior |
| --- | --- |
| Persist | `swipesApi.create({ job_id, direction })` before animate-out |
| Conflict | `SWIPE_CONFLICT` → treat as already done; still remove card |
| Other errors | Keep card; `ErrorBanner` + reset drag |
| Local deck | Filter swiped id out of `jobs` (no “restart” of already-swiped cards) |
| In-flight | Disable buttons / drag while request pending |

## Implementation steps (what was done)

1. Replaced local-only `advance` with `recordSwipe` on Discover.
2. Wired drag end + Like/Nope buttons; removed `// MOCK: Phase 7` persistence comments.
3. Updated empty state for deck-exhausted vs truly empty feed.
4. Updated INTEGRATION / README status notes.

## Files touched

| Path | Change |
| --- | --- |
| `frontend/src/app/screens/DiscoverPage.tsx` | Live swipe persistence |
| `frontend/INTEGRATION.md` / `README.md` | Status |
| `documentation/PHASE_7_DOCUMENTATION.md` | F2 section |

## Milestone F2 exit checklist

| Item | Done when |
| --- | --- |
| Persist | Reload does not re-show swiped job |
| Errors | ErrorBanner on non-conflict failure |
| Conflict | Duplicate swipe skips card without blocking |
| Copy | No “swipe is local” / MOCK persistence comments |

**What comes next:** Milestone F3 — company interest inbox (`GET /swipes/inbound` + Match action).

---

# Milestone F3 — Company Interest Inbox

**Status:** Complete  
**Depends on:** F1 clients, B4 inbound + match create  
**Does not include:** Matches list live UI (F4), chat (Phase 8), applicant kanban

## What it is

Companies open **Interest** (`/app/applicants`) to see students who right-swiped their jobs and can **Match** via `POST /matches`. Already-matched rows are marked from `GET /matches/me`. Dashboard links to the inbox.

## Why it happens now

F2 persists student likes; without an inbox, companies cannot reciprocate. Matching unlocks the Matches screen (F4).

## What was decided / locked

| Rule | Behavior |
| --- | --- |
| Route | Reuse `/app/applicants` (nav label **Interest**); replace mock kanban |
| Load | `swipesApi.listInbound` + `matchesApi.listMine` for matched keys |
| Match | `matchesApi.create({ job_id, student_id })` → mark row Matched |
| Conflict | `MATCH_CONFLICT` treated as already matched |
| Empty | EmptyState → manage job posts |

## Implementation steps (what was done)

1. Added `CompanyInterestPage` with list + Match action.
2. Wired route in `App.tsx`; renamed company nav item to Interest.
3. Added Company Dashboard quick action “Student interest”.
4. Updated INTEGRATION / README / Phase 7 docs.

## Files touched

| Path | Change |
| --- | --- |
| `frontend/src/app/screens/CompanyInterestPage.tsx` | **Created** |
| `frontend/src/app/App.tsx` | Route → Interest page |
| `frontend/src/app/prototypeNav.ts` | Label Interest |
| `frontend/src/app/prototypeScreens.tsx` | Dashboard CTA |
| `frontend/INTEGRATION.md` / `README.md` | Status |
| `documentation/PHASE_7_DOCUMENTATION.md` | F3 section |

## Milestone F3 exit checklist

| Item | Done when |
| --- | --- |
| Inbox live | Shows student right-swipes on own jobs |
| Match action | Creates match; row shows Matched |
| Nav / dashboard | Reachable from sidebar + dashboard |
| Types | `npm run typecheck` clean |

**What comes next:** Milestone F4 — live Matches page via `matchesApi.listMine`.
