# KUPC Frontend — Phase A (F1–F2)

**Status:** Complete  
**Date:** 2026-07-17  
**Scope:** API client foundation + token/session layer (Phase 5 milestones F1–F2)  
**Depends on:** Backend Phase 2 auth + Phase 5 B1–B5 profile/resume APIs  
**Feeds into:** Phase B (F3–F4 auth screens + routing), then C (F5–F7 live screens)

| Milestone | Topic | Status |
| --- | --- | --- |
| F1 | API client & environment | **Complete** |
| F2 | Token storage & AuthContext | **Complete** |
| F3–F8 | Auth UI, guards, profile/resume wiring | Pending |

---

# What Phase A Is

Phase A does **not** replace the Figma prototype UI. It adds the integration foundation beside `App.tsx` so later milestones can call the real backend without inventing fetch logic per screen.

**Before:** Landing `onEnter(role)` → mock screens; no HTTP.  
**After:** Typed `apiRequest`, `authApi` / `studentsApi` / `companiesApi` / `resumesApi`, `tokenStore`, and `AuthProvider` wrapping the app. Screens still use mocks until Phase B/C.

## Why this comes first

Without a single client and session layer, every screen would invent its own `fetch`, error handling, and token rules. CORS, envelope parsing, and refresh-on-401 must be solved once.

---

# Milestone F1 — API Client & Environment

## What was done

### Environment

| File | Purpose |
| --- | --- |
| `frontend/.env.example` | Committed template: `VITE_API_URL=http://localhost:5000/api/v1` |
| `frontend/.env` | Local copy (gitignored) |
| Root + frontend `.gitignore` | Ignore `frontend/.env` and `dist/` |

**CORS:** Backend already allows `http://localhost:5173` with `Authorization`. No Vite proxy is required. Prefer calling the API origin directly via `VITE_API_URL`.

Health check lives at `{origin}/health` (not under `/api/v1`). Helper: `pingApiOrigin()` in `client.ts`.

### Tooling (also landed in Phase A)

| Item | Path / script |
| --- | --- |
| Strict TypeScript | `tsconfig.json` |
| Vite env types | `src/vite-env.d.ts` |
| ESLint flat config | `eslint.config.js` |
| Prettier | `.prettierrc.json` |
| Scripts | `typecheck`, `lint`, `format`, `build` (typecheck + vite) |
| Package rename | `kupc-frontend`; React/ReactDOM as real dependencies |

### API modules (`src/lib/api/`)

| File | Role |
| --- | --- |
| `types.ts` | DTOs matching backend (AuthTokens, AuthMeUser, StudentProfile, CompanyProfile, ResumeAnalysis, …) |
| `errors.ts` | `ApiError` + `SESSION_EXPIRED_EVENT` |
| `client.ts` | `apiRequest<T>`, Bearer attach, FormData support, 401 → refresh → retry once |
| `authApi.ts` | register / verify-otp / login / admin login / refresh / me / logout |
| `studentsApi.ts` | getMe, updateMe, uploadAvatar, getPublicById |
| `companiesApi.ts` | getMe, updateMe, uploadLogo, getPublicById |
| `resumesApi.ts` | upload, list, getById, getAnalysis, remove |
| `index.ts` | public barrel |

### Envelope contract

Backend returns:

```json
{ "success": true, "data": { ... }, "message": "...", "error": null }
```

On failure:

```json
{ "success": false, "data": null, "message": "...", "error": { "code": "...", "statusCode": 400 } }
```

`apiRequest` returns `data` on success and throws `ApiError` with `code` / `statusCode` on failure.

### FormData

For avatar / logo / resume uploads, pass a `FormData` body. The client **does not** set `Content-Type` so the browser supplies the multipart boundary.

## F1 exit checklist

| Item | Status |
| --- | --- |
| `.env.example` committed; `.env` gitignored | Done |
| Typed modules for auth / students / companies / resumes | Done |
| Envelope unwrap + JSON / FormData | Done |
| No Vite proxy required (CORS documented) | Done |

---

# Milestone F2 — Token Storage & Session Layer

## What was done

### `tokenStore` (`src/lib/auth/tokenStore.ts`)

| Key | Value |
| --- | --- |
| `kupc_access` | Access JWT |
| `kupc_refresh` | Refresh token |

Methods: `getAccessToken`, `getRefreshToken`, `setTokens`, `clear`, `hasSession`.

### Client refresh behavior

1. Request with `Authorization: Bearer <access>` when token present (unless `skipAuth`).
2. On **401**: single shared `tryRefreshTokens()` → `POST /auth/refresh` with refresh token.
3. On success: store new pair, retry original request once (`_retried`).
4. On failure: `tokenStore.clear()` + dispatch `kupc:session-expired`.

Login/register/refresh calls use `skipAuth: true` so they never recurse into refresh.

### `AuthProvider` / `useAuth` (`src/lib/auth/AuthContext.tsx`)

| Field | Meaning |
| --- | --- |
| `status` | `idle` → `loading` → `authenticated` \| `anonymous` |
| `user` | `AuthMeUser` from `GET /auth/me` (camelCase) |
| `role` | `user.role` or `null` |
| `login` / `adminLogin` | API → save tokens → `/me` |
| `acceptTokens` | For OTP verify (F3) when tokens return without a separate login |
| `logout` | Best-effort `POST /auth/logout` → clear → anonymous |
| `refreshUser` | Re-run hydrate from `/me` |

**Mount:** if access token exists → `/auth/me`; else → `anonymous`.  
**Session expired event:** clears React auth state when the client gives up on refresh.

### Root wiring

```tsx
// src/main.tsx
<AuthProvider>
  <App />
</AuthProvider>
```

`App.tsx` still uses the demo role switcher — **Phase B** replaces that with real auth screens and guards. `useAuth()` is available now for any screen that needs it.

## Important type note

| Endpoint | User shape |
| --- | --- |
| Login / refresh / verify-otp | `user` with **snake_case** (`email_verified`, `verification_status`) |
| `GET /auth/me` | **camelCase** (`emailVerified`, `verificationStatus`, `sessionId`) |

`AuthContext` always stores the `/me` shape (`AuthMeUser`).

## F2 exit checklist

| Item | Status |
| --- | --- |
| Tokens in localStorage under `kupc_*` keys | Done |
| Bearer attached on authenticated calls | Done |
| 401 → refresh → retry once; else session-expired | Done |
| AuthProvider on mount hydrates from `/me` | Done |
| `useAuth()` exported | Done |

---

# How to verify Phase A

1. Backend running on port 5000 with CORS allowing `http://localhost:5173`.
2. `cd frontend && cp .env.example .env && npm install && npm run typecheck`
3. `npm run dev` — app still shows the prototype (expected).
4. Browser console smoke (after login via API tool / curl and injecting tokens, or temporary call):

```js
// After manually: localStorage.setItem('kupc_access', '...'); localStorage.setItem('kupc_refresh', '...');
// then reload — AuthProvider should hydrate.

import { studentsApi, getApiBaseUrl, pingApiOrigin } from './src/lib/api';
// Or from a temporary button in App during local testing:
await pingApiOrigin(); // { ok: true, status: 200 }
getApiBaseUrl(); // http://localhost:5000/api/v1
```

5. Manual token inject test:
   - Login via `POST /api/v1/auth/login` (e.g. Swagger or curl).
   - Set `kupc_access` / `kupc_refresh` in DevTools.
   - Reload → `useAuth().status` becomes `authenticated` and `user` matches `/auth/me`.

```bash
npm run typecheck
npm run lint
```

---

# Files touched

| Action | Path |
| --- | --- |
| Create | `tsconfig.json`, `eslint.config.js`, `.prettierrc.json` |
| Create | `.env.example`, `.env` (local) |
| Create | `src/vite-env.d.ts` |
| Create | `src/lib/api/*` |
| Create | `src/lib/auth/*` |
| Edit | `src/main.tsx` (AuthProvider) |
| Edit | `package.json` (scripts, name, react deps, tooling) |
| Edit | `.gitignore` (root + frontend) |
| Edit | `App.tsx` / two ui files (minimal fixes so strict `tsc` passes) |
| Create | `documentation/PHASE_A_DOCUMENTATION.md` |

---

# Out of scope (next phases)

| Concern | Phase |
| --- | --- |
| Login / register / OTP UI | B (F3) |
| react-router + role guards; remove demo switcher | B (F4) |
| Live student/company profile + resume analyzer | C (F5–F7) |
| Split App.tsx / design-system cleanup | D |
| Tests + INTEGRATION.md | E (F8) |
