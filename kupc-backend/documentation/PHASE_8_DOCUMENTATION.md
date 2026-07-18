# KUPC Phase 8 — Chat & Conversations

**Status:** B1 complete; B2–B6 / F1–F5 pending  
**Date:** 2026-07-18  
**Depends on:** Phase 2 (Auth), Phase 3B (`conversations` / `messages` repos), Phase 7 (live matches)  
**References:** `KUPC_Phase8_Specification.pdf`  
**Feeds into:** Richer notifications UX; optional realtime transport upgrades

| Milestone | Side | Topic | Status |
| --- | --- | --- | --- |
| B1 | Backend | Chat module scaffold & contracts | **Complete** |
| B2 | Backend | Ensure conversation + list mine | Pending |
| B3 | Backend | Send / list / mark-read messages | Pending |
| B4 | Backend | Match → conversation hook | Pending |
| B5 | Backend | Notifications (optional) | Pending |
| B6 | Backend | Swagger, hardening & test matrix | Pending |
| F1 | Frontend | conversationsApi + messagesApi | Pending |
| F2 | Frontend | Matches → Chat entry | Pending |
| F3 | Frontend | Live Chat page | Pending |
| F4 | Frontend | Notifications polish (optional) | Pending |
| F5 | Frontend | Polish + docs | Pending |

---

# What Phase 8 Is

Phase 8 turns a **match** into a durable 1:1 conversation: both parties open a thread, exchange messages, and (later) see read state. Phase 3B tables and repositories already exist — this phase adds the HTTP module and Chat UI wiring.

**Phase 7** answered: *How does interest become a match?*  
**Phase 8** answers: *How do matched parties talk about the role?*

## Design decisions (locked)

| Decision | Choice | Why |
| --- | --- | --- |
| Module layout | `src/modules/conversations/` | Messages nested under conversation routes; mirrors jobs/swipes |
| Repositories | Reuse Phase 3B `conversationsRepository` / `messagesRepository` | No ad-hoc `.from('conversations')` in feature modules |
| HTTP naming | snake_case on the wire | Matches auth / jobs / swipes |
| One thread per match | Unique `match_id`; ensure is idempotent | Matches seed + Phase 3B model |
| B1 scope | Contracts + auth gates; handlers return `501 NOT_IMPLEMENTED` | Ensure/list = B2; messages = B3 |
| Realtime MVP | Polling (later F3); SSE/WebSocket optional | Campus demo does not need sockets day one |

---

# Milestone B1 — Chat Module Scaffold & Contracts

**Status:** Complete  
**Depends on:** Phase 2 auth middleware, Phase 3B conversation/message repos  
**Does not include:** Real ensure/list (B2), send/list/read messages (B3), match hook (B4), Swagger (B6)

## What it is

B1 locks HTTP contracts, Zod validation, DTOs, mappers, and error codes for conversations and messages, then mounts the router at `/api/v1/conversations`. Service methods throw `501 NOT_IMPLEMENTED` until B2–B3.

## Why it happens first

Without shared DTOs and route order (`/me`, `/ensure`, `/:id/messages` before bare `/:id`), Chat and Matches invent incompatible shapes. Auth gates must be proven before persistence logic lands.

## What was decided / locked

### B1.1 HTTP routes (mounted; behavior stubbed)

| Method | Path | Auth | B1 behavior |
| --- | --- | --- | --- |
| `GET` | `/conversations/me` | Student or Company | `501 NOT_IMPLEMENTED` |
| `POST` | `/conversations/ensure` | Student or Company | Validate `{ match_id }` → `501` |
| `GET` | `/conversations/:id` | Student or Company | Validate UUID → `501` |
| `GET` | `/conversations/:id/messages` | Student or Company | Validate + default `limit` → `501` |
| `POST` | `/conversations/:id/messages` | Student or Company | Validate `{ content }` → `501` |
| `POST` | `/conversations/:id/read` | Student or Company | Validate UUID → `501` |

### B1.2 DTOs

- `ConversationDto` — id, match_id, created_at (+ optional nested job/counterparty/last_message/unread in B2)
- `MessageDto` — id, conversation_id, sender_id, content, sent_at, read_at
- `EnsureConversationServiceInput` / `CreateMessageServiceInput` — camelCase service shapes
- `MarkReadResult` — `{ updated: number }`

### B1.3 Error codes

`CONVERSATION_NOT_FOUND`, `CONVERSATION_FORBIDDEN`, `MESSAGE_NOT_FOUND`, `INVALID_MESSAGE_PAYLOAD`, `INVALID_CONVERSATION_PAYLOAD`, `NOT_IMPLEMENTED`

### B1.4 Validation

- Ensure: `match_id` UUID  
- Message: trimmed `content` length 1…4000 (`MESSAGE_CONTENT_MAX_LENGTH`)  
- List messages query: `limit` 1–100 default 50; optional `before` UUID  
- Params: conversation `id` UUID  

## Implementation steps (what was done)

1. Created `src/modules/conversations/` (constants, types, validation, errors, mapper, service, controller, routes, index).
2. Registered static paths (`/me`, `/ensure`) and nested `/:id/messages` / `/:id/read` before bare `/:id`.
3. Mounted router in `src/routes/index.ts`.
4. Added mapper unit tests and HTTP scaffold tests; `npm run test:phase8`.

## Files touched

| Path | Change |
| --- | --- |
| `src/modules/conversations/*` | **Created** module |
| `src/routes/index.ts` | Mount `/conversations` |
| `src/__tests__/phase8.scaffold.test.ts` | **Created** |
| `src/__tests__/phase8.mapper.test.ts` | **Created** |
| `package.json` | `test:phase8` script |
| `documentation/PHASE_8_DOCUMENTATION.md` | **Created** (this file) |

## Milestone B1 exit checklist

| Item | Done when |
| --- | --- |
| Module folder exists | `src/modules/conversations/*` present |
| Auth gates | No token → 401; admin → 403 on participant routes |
| Validation | Empty ensure / blank message → 400 `VALIDATION_ERROR` |
| Contracts typed | DTOs / Zod match Phase 8 spec §4 |
| Stub behavior | Valid student/company calls → 501 `NOT_IMPLEMENTED` |
| Tests | `npm run test:phase8` green |

**What comes next:** Milestone B2 — implement `ensure` + `listMine` (participant checks + nested cards).
