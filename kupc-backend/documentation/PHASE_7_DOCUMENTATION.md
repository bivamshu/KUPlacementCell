# KUPC Phase 7 — Swipe Engine

**Status:** B1 complete; B2–B6 / F1–F5 pending  
**Date:** 2026-07-18  
**Depends on:** Phase 2 (Auth), Phase 3B (`swipes` / `matches` repos), Phase 6 (open jobs feed + Discover UI)  
**References:** `KUPC_Phase7_Specification.pdf`  
**Feeds into:** Phase 8 — Chat & Conversations

| Milestone | Side | Topic | Status |
| --- | --- | --- | --- |
| B1 | Backend | Swipes/matches module scaffold & contracts | **Complete** |
| B2 | Backend | Record swipe + feed exclusion | Pending |
| B3 | Backend | Undo window (optional) | Pending |
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
| Stub behavior | Valid student swipe / approved match → 501 `NOT_IMPLEMENTED` |
| Tests | `npm run test:phase7` green |

**What comes next:** Milestone B2 — implement `createSwipe` + exclude swiped job IDs from student `GET /jobs` feed.
