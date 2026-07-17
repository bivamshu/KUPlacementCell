# KUPC Frontend — Phases B–E (F3–F8)

**Status:** Complete  
**Date:** 2026-07-17  
**Depends on:** Phase A (F1–F2), Backend Phase 2 + 4 + 5 (B1–B5)  
**Companion docs:** `PHASE_A_DOCUMENTATION.md`, `INTEGRATION.md`

| Milestone | Topic | Status |
| --- | --- | --- |
| F3 | Auth screens | **Complete** |
| F4 | Guards & role routing | **Complete** |
| F5 | Student profile wiring | **Complete** |
| F6 | Company profile editor | **Complete** |
| F7 | Resume analyzer wiring | **Complete** |
| F8 | UX polish & mock cleanup | **Complete** |

---

# Phase B — Auth UI & Routing (F3–F4)

## What changed

Landing no longer calls `onEnter(role)`. All entry points go through real auth routes. The demo **role switcher was removed**. Role always comes from `useAuth().user.role` (JWT / `/auth/me`).

### Routes

| Path | Screen |
| --- | --- |
| `/` | Landing (guest only) |
| `/login` | Student/company login |
| `/login/admin` | Admin login |
| `/register/student` | Student register → OTP |
| `/register/company` | Company register → login banner |
| `/verify-otp` | OTP verify → `acceptTokens` → dashboard |
| `/app/*` | Authenticated shell |

### Guards

- `RequireAuth` — spinner while hydrating; redirect anonymous → `/login`
- `RequireGuest` — authenticated users hitting auth pages → `/app/dashboard`
- `RoleGate` — blocks cross-role screens (e.g. student → company-approval)

### Files

- `src/app/screens/auth/*`
- `src/app/screens/LandingPage.tsx`
- `src/app/guards.tsx`
- `src/app/layout/AppShell.tsx`
- `src/app/App.tsx` (router)
- `src/main.tsx` (`BrowserRouter` + `AuthProvider`)

### Exit checklist F3–F4

| Item | Status |
| --- | --- |
| Student register → OTP → dashboard with JWT | Done |
| Company register → login → shell | Done |
| Admin login route | Done |
| Wrong password shows readable error | Done (`messageFromError`) |
| Unauthenticated refresh cannot stay on dashboard | Done |
| Role mismatch redirects to dashboard | Done |
| Logout clears tokens → landing | Done |

---

# Phase C — Live product screens (F5–F7)

## F5 — Student profile

`StudentProfilePage` loads `studentsApi.getMe()`, editable form (bio, phone, degree, department, cgpa, graduation_year, full_name), avatar upload, active-resume link to analyzer. No `STUDENTS[0]`.

## F6 — Company profile

`CompanyProfilePage` loads `companiesApi.getMe()`, shows verification badge (pending/approved/rejected), PATCH fields, logo upload. Placeholder block removed.

## F7 — Resume analyzer

`ResumeAnalyzerPage`:

1. `resumesApi.upload(pdf)` → 202 pending  
2. Poll `getAnalysis` every 2s (max 60)  
3. Render ATS score, breakdown, strengths, suggestions  
4. List + select + delete resumes  

Requires `npm run worker:resumes` (Redis + OpenAI).

### Files

- `src/app/screens/StudentProfilePage.tsx`
- `src/app/screens/CompanyProfilePage.tsx`
- `src/app/screens/ResumeAnalyzerPage.tsx`

### Exit checklist F5–F7

| Item | Status |
| --- | --- |
| Profile shows live backend data | Done |
| Save persists across reload | Done |
| Avatar / logo upload updates UI | Done |
| Pending company sees verification status | Done |
| PDF upload drives live analysis states | Done (when worker runs) |
| Failed analysis shows recoverable error | Done |

---

# Phase E — Polish (F8)

## Shared UI

- `LoadingSpinner` / `FullPageSpinner`
- `ErrorBanner`
- `EmptyState`
- `messageFromError` for stable API codes

## Mock scoping

Prototype demos live in `prototypeScreens.tsx` with `// MOCK: Phase 6+` on data arrays. Discover, matches, chat, kanban, admin analytics remain demos.

## Docs

- `frontend/INTEGRATION.md` — runbook + live/mock matrix
- This file — milestone narrative
- README + backend `PHASE_5_DOCUMENTATION.md` updated

### Exit checklist F8

| Item | Status |
| --- | --- |
| No `STUDENTS[0]` on profile/resume/auth paths | Done |
| Discover/chat still work as demos | Done |
| `INTEGRATION.md` exists | Done |

---

# Architecture after F8

```text
src/
  main.tsx                 AuthProvider + BrowserRouter
  lib/api/                 Phase A client
  lib/auth/                tokenStore + AuthContext + roleMap
  components/ui-app/       Loading / Error / Empty
  app/
    App.tsx                Routes
    guards.tsx
    layout/AppShell.tsx
    screens/auth/*
    screens/*Profile* / Resume* / Landing*
    prototypeScreens.tsx   MOCK Phase 6+ demos
    prototypeNav.ts
```

**What comes next (product):** Phase 6 job posting / discover API + wire mock screens; optional App.tsx further split / design-system prune (former “Phase D”).
