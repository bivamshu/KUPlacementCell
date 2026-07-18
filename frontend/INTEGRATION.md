# KUPC Frontend ↔ Backend Integration

**Last updated:** 2026-07-18  
**Frontend phases:** A–E complete; Phase 6 jobs UI (F1–F6) complete; Phase 7 F1–F3 complete (F4–F5 pending)  

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
| Discover (`/app/discover`) | **Live** — feed, filters, save/unsave, Like/Nope persist via `swipesApi` |
| Job detail (`/app/jobs/:id`) | **Live** — full description, save toggle, company card |
| Public company (`/app/companies/:id`) | **Live** — approved company card from Phase 5 API |
| Saved (`/app/saved`) | **Live** — `GET /jobs/saved` + unsave |
| Job Post list (`/app/job-post`) | **Live** — list own jobs; publish / close / delete |
| Job Post form (`/app/job-post/new`, `/app/job-post/:jobId`) | **Live** — create/edit draft + publish |
| Interest (`/app/applicants`) | **Live** — inbound right-swipes + Match |
| Matches / chat / kanban / admin approval / analytics | **Mock** — Phase 7 F4–F5 + Phase 8 |

## Seed demo accounts

Seed data is created with `npm run db:seed` in `kupc-backend` (~100 students, ~50 companies, ~200 jobs). All seed passwords:

`SeedPass123!`

| Role | Email | Notes |
| --- | --- | --- |
| Student | `seed.student.001@ku.edu.np` | Through `seed.student.100@…` |
| Company (approved) | `seed.company.001@example.com` | Companies `001`–`035` are approved |
| Company (pending) | `seed.company.040@example.com` | Roughly `036`–`045` pending |

After login as student → **Discover** / **Saved**. As approved company → **Job Posts** / **Interest**.

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
- [ ] Discover shows seeded open jobs (student seed account)
- [ ] Job Posts lists seeded roles (approved company seed account)
