# KUPC Frontend

React + Vite client for Kathmandu University Placement Connect.

## Setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Default API: `http://localhost:5000/api/v1`. See [`INTEGRATION.md`](INTEGRATION.md) for full stack (API + resume worker).

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run typecheck` | Strict TypeScript |
| `npm run lint` | ESLint |
| `npm run build` | Typecheck + production build |
| `npm run format` | Prettier |

## Phase status

| Phase | Milestones | Doc | Status |
| --- | --- | --- | --- |
| **A** | F1–F2 API + AuthContext | [`documentation/PHASE_A_DOCUMENTATION.md`](documentation/PHASE_A_DOCUMENTATION.md) | Complete |
| **B–E** | F3–F8 auth UI, profiles, resume, polish | [`documentation/PHASE_B_E_DOCUMENTATION.md`](documentation/PHASE_B_E_DOCUMENTATION.md) | Complete |
| **6 (jobs)** | Backend B1–B5 + frontend F1–F6 | [`../kupc-backend/documentation/PHASE_6_DOCUMENTATION.md`](../kupc-backend/documentation/PHASE_6_DOCUMENTATION.md) | Complete |
| **7 (swipes)** | Backend B1–B6 + frontend F1–F3 | [`../kupc-backend/documentation/PHASE_7_DOCUMENTATION.md`](../kupc-backend/documentation/PHASE_7_DOCUMENTATION.md) | F1–F3 complete; F4–F5 pending |

## Live features

- Auth: register / OTP / login / admin login / logout
- Student & company profiles (including avatar/logo)
- Resume upload + AI analysis polling
- Jobs: company post/manage, student Discover feed, Saved, job detail, public company card
- Discover live swipe (Like/Nope/drag → `POST /swipes`; feed excludes swiped jobs)
- Company Interest inbox (inbound likes + Match)

Still mocked: Matches list (F4), chat, applicant kanban, admin approval UI, analytics.
