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

## Live features

- Auth: register / OTP / login / admin login / logout
- Student & company profiles (including avatar/logo)
- Resume upload + AI analysis polling

Still mocked until later backend phases: discover, matches, chat, job posts, applicant kanban, admin approval UI.
