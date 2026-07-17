# KUPC Frontend ↔ Backend Integration

**Last updated:** 2026-07-17  
**Frontend phases:** A (F1–F2), B (F3–F4), C (F5–F7), E (F8) complete

## How to run the full stack

> **First-time backend setup:** copy `.env.example` to `.env` **only if `.env` does not
> already exist** (copying over an existing `.env` erases your credentials), then fill in
> the required values — see [Backend environment](#backend-environment) below. The API
> will not start and migrations will fail until those values are set.

```bash
# Terminal 1 — API
cd kupc-backend
# first time only — do NOT run if .env already exists:
#   cp .env.example .env   (then fill in the values, see below)
npm run db:migrate     # first time only; includes avatar/logo buckets
npm run dev

# Terminal 2 — resume analysis worker (required for F7)
cd kupc-backend
npm run worker:resumes
# Needs REDIS_URL + OPENAI_API_KEY

# Terminal 3 — frontend
cd frontend
cp .env.example .env
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:5000/api/v1`
- Docs: `http://localhost:5000/api/docs`
- CORS: backend allows `http://localhost:5173` (no Vite proxy)

## Backend environment

Required in `kupc-backend/.env` (all from the [Supabase dashboard](https://supabase.com/dashboard) unless noted):

| Variable | Where to get it |
| --- | --- |
| `SUPABASE_URL` | Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Project Settings → API → `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → `service_role` key |
| `DATABASE_URL` | Project Settings → Database → Connection string → URI (needed for `db:migrate` only) |
| `JWT_SECRET` | Any long random string (e.g. `openssl rand -hex 32` or an online generator) |

Optional: `REDIS_URL` + `OPENAI_API_KEY` (resume analysis worker), SMTP vars (real OTP emails — otherwise the OTP is printed to the API console in dev).

## Frontend environment

| Variable | Example |
| --- | --- |
| `VITE_API_URL` | `http://localhost:5000/api/v1` |

Tokens are stored in `localStorage` as `kupc_access` / `kupc_refresh`.

## Live vs mock screens

| Screen | Status |
| --- | --- |
| Landing, login, register, OTP, admin login | **Live** |
| Student profile (`/app/profile`) | **Live** — GET/PATCH/avatar |
| Company profile (`/app/company-profile`) | **Live** — GET/PATCH/logo + verification badge |
| Resume analyzer (`/app/resume`) | **Live** — upload, poll analysis, list, delete |
| Settings sign-out | **Live** — clears tokens |
| Discover / matches / chat / saved / kanban / admin approval / analytics | **Mock** — Phase 6+ (jobs API scaffold B1/F1 landed; UI wiring F2–F5 pending) |

## Auth flow

1. Student: `/register/student` → OTP email → `/verify-otp` → tokens → `/app/dashboard`
2. Company: `/register/company` → `/login?registered=company` → dashboard (pending verification)
3. Admin: `/login/admin`
4. Session: `AuthProvider` hydrates via `GET /auth/me`; 401 triggers one refresh retry

## Troubleshooting

- **"Failed to fetch" on login/register** — the API isn't running (or isn't on port 5000).
  Start it with `npm run dev` in `kupc-backend` and check `http://localhost:5000/api/v1/health`.
- **`DATABASE_URL is missing` on `db:migrate`** — fill in `DATABASE_URL` in
  `kupc-backend/.env` (Supabase → Settings → Database → Connection string → URI).
- **Login returns 500 / Supabase errors** — `SUPABASE_URL` / keys are empty or wrong in
  `kupc-backend/.env`.

## Manual smoke checklist

- [ ] Student register → OTP → dashboard
- [ ] Wrong password shows error (no silent fail)
- [ ] Refresh on `/app/dashboard` stays authenticated
- [ ] Student cannot open `/app/company-approval` (redirects to dashboard)
- [ ] Logout clears tokens and returns to landing
- [ ] Profile edit + reload persists
- [ ] Avatar / logo upload updates image
- [ ] PDF resume upload → pending → completed (worker running)
- [ ] Discover still works as a mock demo
