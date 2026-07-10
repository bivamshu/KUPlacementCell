# KUPC Phase 3B — Database Implementation

**Status date:** 2026-07-10  
**Depends on:** Phase 3A (design complete)  
**Source spec:** `documentation/KUPC_Phase3_Database_Design_Data_Modeling.md`

Phase 3B turns the Phase 3A paper design into executable Supabase SQL, then indexes, RLS, seed data, repositories, and tests.

| Milestone | Topic | Status |
| --- | --- | --- |
| 5 | PostgreSQL schema conventions | Complete |
| 6 | Supabase table implementation | Complete |
| 7 | Indexing strategy | Complete |
| 8 | Row Level Security policies | Complete |
| 9 | Seed data | Complete |
| 10 | Repository layer | Complete |
| 11 | Testing matrix | Partial (static schema + index + RLS + seed + repository tests) |

---

# Milestone 5 — PostgreSQL Schema Conventions (Complete)

## What it is

Milestone 5 locks low-level SQL conventions before any `CREATE TABLE` runs:

1. Which Postgres types to use
2. How primary keys work
3. How foreign keys delete
4. Which constraints every table must use

No tables are created in this milestone. It is the design gate for Milestone 6.

## Why it was done

Without shared conventions, each migration invents its own types (`VARCHAR` vs `TEXT`, `TIMESTAMP` vs `TIMESTAMPTZ`, integer IDs vs UUIDs). That creates inconsistent schemas that are expensive to retrofit after profiles, swiping, and chat depend on them.

## What was decided

### 5.1 Data types

| Type | Used for | Why |
| --- | --- | --- |
| `UUID` | Every PK and FK | Safe in URLs; does not leak row counts or creation order |
| `TEXT` | Names, descriptions, URLs | No length penalty vs `VARCHAR(n)` in Postgres |
| `BOOLEAN` | Flags (e.g. `email_verified`) | Clear true/false |
| `TIMESTAMPTZ` | Every `created_at` / `updated_at` / `*_at` | Timezone-aware; never bare `TIMESTAMP` |
| `INTEGER` | Whole numbers / years | Exact integers |
| `NUMERIC(p,s)` | `cgpa`, `ats_score` | Exact decimal; avoid float rounding |
| `JSONB` | Skills payloads, notifications, analytics | Indexable binary JSON |

Rules:

- Always `TIMESTAMPTZ`, never `TIMESTAMP`
- Always `JSONB`, never plain `JSON` for KUPC semi-structured fields
- Enable `pgcrypto` once so `gen_random_uuid()` works

### 5.2 Primary keys

Default pattern:

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

Identity inheritance (`students` + `companies` only):

```sql
id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE
```

Join tables use composite PKs:

- `student_skills (student_id, skill_id)`
- `saved_jobs (student_id, job_id)`

### 5.3 Foreign keys & ON DELETE

| Relationship | ON DELETE | Why |
| --- | --- | --- |
| students / companies → users | CASCADE | Profile cannot outlive identity |
| resumes → students | CASCADE | Orphaned resumes are useless |
| resume_analysis → resumes | CASCADE | Analysis belongs to the file |
| jobs → companies | CASCADE | Jobs die with company |
| swipes / matches → students, companies, jobs | CASCADE | History meaningless without either side |
| messages → conversations | CASCADE | Messages die with thread |
| students.resume_id → resumes | SET NULL | Deleting active resume must not delete student |
| analytics_events.user_id → users | SET NULL | Keep aggregate history after user deletion |

### 5.4 Constraints

| Constraint | Purpose | Examples |
| --- | --- | --- |
| `UNIQUE` | No duplicates | `students.ku_id`, `skills.name`, swipe/match triples |
| `NOT NULL` | Required fields | `jobs.title`, `messages.content` |
| `CHECK` | Allowed values | `cgpa` 0–4, job status, swipe direction |
| `DEFAULT` | Server defaults | `created_at`, `verification_status = pending` |

---

# Milestone 6 — Supabase Table Implementation (Complete)

## What it is

Milestone 6 is the direct SQL implementation of every entity from Phase 3A / Milestones 1–5:

- Extend Phase 2 `students` and `companies` with profile columns
- Create all new domain tables in dependency order
- Resolve the `students.resume_id` ↔ `resumes.student_id` circular FK
- Rename `company_requests` → `company_verification_requests`
- Attach `updated_at` triggers
- Enable RLS on new tables (policies come in Milestone 8)

## Why it was done

Phase 3A designed the data model on paper. Milestone 6 makes that model real in Supabase so later phases (profiles, resumes, jobs, swiping, chat) have tables to read and write.

This phase is a hard dependency gate: Phase 4+ must not start until the schema exists and matches the ER design.

## What was done

### Migration file

```text
supabase/migrations/20260710000000_phase3_schema.sql
```

Applied via:

```bash
npm run db:migrate
```

`scripts/apply-migrations.mjs` now includes this file after the two Phase 2 migrations.

### 1. Extended `students`

Phase 2 already had: `id`, `ku_id`, `full_name`, `graduation_year`, `department`.

Added:

| Column | Type | Notes |
| --- | --- | --- |
| `phone` | TEXT | Optional |
| `degree` | TEXT | Optional |
| `cgpa` | NUMERIC(3,2) | CHECK 0–4 |
| `bio` | TEXT | Optional |
| `profile_picture_url` | TEXT | Optional |
| `resume_id` | UUID | Active resume pointer (FK added after `resumes`) |
| `created_at` | TIMESTAMPTZ | Default `now()` |
| `updated_at` | TIMESTAMPTZ | Trigger-maintained |

**Why ALTER instead of recreate:** preserves existing Phase 2 student rows and registration RPCs.

### 2. Extended `companies`

Phase 2 already had: `id`, `company_name`, `website`, `verification_status`, `verified_at`.

Added:

| Column | Type | Notes |
| --- | --- | --- |
| `industry` | TEXT | Optional |
| `description` | TEXT | Optional |
| `logo_url` | TEXT | Optional |
| `created_at` | TIMESTAMPTZ | Default `now()` |
| `updated_at` | TIMESTAMPTZ | Trigger-maintained |

### 3. Created new tables (dependency order)

| Table | Purpose |
| --- | --- |
| `skills` | Canonical skill tags |
| `resumes` | Uploaded resume files per student |
| `resume_analysis` | Parsed / scored output per resume |
| `student_skills` | M:N student ↔ skill + proficiency |
| `jobs` | Company job / internship postings |
| `swipes` | Student left/right decisions on jobs |
| `matches` | Mutual right-swipe outcomes |
| `saved_jobs` | Bookmarks without swiping |
| `conversations` | One chat thread per match (1:1) |
| `messages` | Chat messages (`sender_id` → `users`) |
| `notifications` | In-app alerts |
| `reports` | Moderation reports |
| `analytics_events` | Product analytics log |

### 4. Circular FK resolution

Problem:

```text
students.resume_id → resumes.id
resumes.student_id → students.id
```

Solution used in the migration:

1. Add `students.resume_id` as a nullable column **without** FK
2. Create `resumes` with FK to `students`
3. `ALTER TABLE students ADD CONSTRAINT students_resume_id_fkey ... ON DELETE SET NULL`

**Why SET NULL:** deleting the active resume must clear the pointer, not delete the student.

### 5. Renamed verification requests table

```sql
ALTER TABLE company_requests RENAME TO company_verification_requests;
ALTER TABLE company_verification_requests ALTER COLUMN file_url DROP NOT NULL;
```

**Why rename:** matches Phase 3A / official Phase 3 naming.  
**Why nullable `file_url`:** Phase 2 placeholder allowed metadata-first submission; full uploads come later.

### 6. `updated_at` triggers

Created `public.set_updated_at()` and attached it to:

- `students`
- `companies`
- `jobs`

**Why:** Postgres does not auto-update `updated_at`. A trigger keeps timestamps correct even if a code path forgets to set them.

### 7. RLS enabled (policies deferred)

RLS was enabled on every new Phase 3 table. Policies are Milestone 8. Until then, the backend continues to use the **service-role** client for trusted server-side access (same pattern as Phase 2).

### 8. Application code alignment

Updated:

```text
src/database/companyRequests.repository.ts
```

- `.from('company_requests')` → `.from('company_verification_requests')`
- `file_url` typed as `string | null`
- `fileUrl` optional on create

### 9. Verification

Automated static test:

```text
src/__tests__/phase3.schema.test.ts
```

Covers:

- Migration file exists
- `students` / `companies` extensions
- All new tables defined
- Rename to `company_verification_requests`
- `students.resume_id` FK
- `set_updated_at` triggers
- RLS enabled on key new tables

Live Supabase apply confirmed tables present, including:

`analytics_events`, `company_verification_requests`, `conversations`, `jobs`, `matches`, `messages`, `notifications`, `reports`, `resume_analysis`, `resumes`, `saved_jobs`, `skills`, `student_skills`, `swipes`

---

## Files touched in Milestone 6

```text
supabase/migrations/20260710000000_phase3_schema.sql   (new)
scripts/apply-migrations.mjs                            (include Phase 3 migration)
src/database/companyRequests.repository.ts              (table rename)
src/__tests__/phase3.schema.test.ts                     (new)
supabase/README.md                                      (Phase 3 tables documented)
documentation/PHASE_3B_DOCUMENTATION.md                 (this file)
```

---

## Milestone 6 exit checklist

| Item | Status |
| --- | --- |
| Phase 2 `students` / `companies` extended via ALTER | Done |
| All Phase 3 domain tables created | Done |
| Circular `resume_id` FK resolved | Done |
| `company_requests` renamed | Done |
| `updated_at` triggers attached | Done |
| RLS enabled on new tables | Done |
| Migration applied to Supabase | Done |
| Repository points at new table name | Done |
| Static schema tests added | Done |

---

## What comes next

| Milestone | Next deliverable |
| --- | --- |
| **10** | Repository files per table under `src/database/` |
| **11** | Full CRUD / cascade / uniqueness / RLS / `EXPLAIN ANALYZE` test matrix |

---

# Milestone 7 — Indexing Strategy (Complete)

## What it is

Milestone 7 adds explicit Postgres indexes on foreign keys and filter columns used in hot-path queries.

**Important Postgres fact:** creating a foreign key does **not** automatically index the referencing column. Only the referenced primary key is indexed by default. Without child-side indexes, queries like “all jobs for this company” or “all swipes for this student” become sequential scans once tables grow past a few thousand rows.

## Why it was done

KUPC will repeatedly query:

| Hot path | Query pattern | Index that helps |
| --- | --- | --- |
| Student job feed | `jobs WHERE status = 'open'` | `idx_jobs_status`, `idx_jobs_open_company_id` |
| Company dashboard | `jobs WHERE company_id = ?` | `idx_jobs_company_id` |
| Admin verification queue | `companies WHERE verification_status = 'pending'` | `idx_companies_verification_status` |
| Avoid re-serving swipe cards | `swipes WHERE student_id = ?` | `idx_swipes_student_id` |
| Company swipe analytics | `swipes WHERE company_id = ?` | `idx_swipes_company_id` |
| Match lists | `matches WHERE student_id / company_id = ?` | `idx_matches_*` |
| Chat history | `messages WHERE conversation_id = ?` | `idx_messages_conversation_id` |
| Notification bell | `notifications WHERE user_id = ?` | `idx_notifications_user_id` |
| Profile resume history | `resumes WHERE student_id = ?` | `idx_resumes_student_id` |
| Student login / register | `students WHERE ku_id = ?` | `idx_students_ku_id` (also UNIQUE) |

Those lookups must stay fast after seed data (100+ students, 200+ jobs) and real usage.

## What was done

### Migration file

```text
supabase/migrations/20260710000001_phase3_indexes.sql
```

Registered in `scripts/apply-migrations.mjs`:

```js
const migrations = [
  '20260709000000_phase2_auth_schema.sql',
  '20260709000001_phase2_registration_rpcs.sql',
  '20260710000000_phase3_schema.sql',
  '20260710000001_phase3_indexes.sql'
];
```

Applied with:

```bash
npm run db:migrate
```

### Indexes created

| Index | Table | Columns / predicate | Reason |
| --- | --- | --- | --- |
| `idx_students_ku_id` | students | `(ku_id)` | Registration / login lookup (also covered by UNIQUE) |
| `idx_companies_verification_status` | companies | `(verification_status)` | Admin pending filter |
| `idx_jobs_company_id` | jobs | `(company_id)` | Company dashboard |
| `idx_jobs_status` | jobs | `(status)` | Student feed filter |
| `idx_jobs_open_company_id` | jobs | `(company_id) WHERE status = 'open'` | Smaller partial index for open jobs |
| `idx_swipes_student_id` | swipes | `(student_id)` | Exclude already-swiped jobs |
| `idx_swipes_company_id` | swipes | `(company_id)` | Company swipe history |
| `idx_matches_student_id` | matches | `(student_id)` | Student match list |
| `idx_matches_company_id` | matches | `(company_id)` | Company match list |
| `idx_messages_conversation_id` | messages | `(conversation_id)` | Chat history |
| `idx_notifications_user_id` | notifications | `(user_id)` | Notification inbox |
| `idx_resumes_student_id` | resumes | `(student_id)` | Profile resume history |

### Concepts used

**B-tree index (default)**  
Best for equality and range lookups on scalar columns (`company_id = ?`, `status = 'open'`).

**Partial index**  
`idx_jobs_open_company_id` only indexes rows where `status = 'open'`. Smaller and faster when most queries care about open jobs and many rows are closed/draft.

**UNIQUE already implies an index**  
`students.ku_id` and swipe/match uniqueness constraints already create indexes. Explicit `idx_students_ku_id` is kept for naming clarity; swipe `UNIQUE (student_id, company_id, job_id)` already supports “has this student swiped this job?” checks.

**Deferred: GIN on JSONB**  
Indexes on `resume_analysis.extracted_skills` and `analytics_events.metadata` are deferred until Phase 4/5 needs JSON containment queries (e.g. “skills contains React”).

### How to verify in Supabase

List indexes:

```sql
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

Optional planner check (more meaningful after seed data exists):

```sql
EXPLAIN ANALYZE
SELECT * FROM public.jobs WHERE status = 'open';
```

Prefer `Index Scan` / `Bitmap Index Scan` over a plain `Seq Scan` on large tables. Full `EXPLAIN ANALYZE` verification is part of Milestone 11.

### Test file

```text
src/__tests__/phase3.indexes.test.ts
```

Static checks that the migration defines every required index name and the open-jobs partial predicate. Run:

```bash
npm test
```

## Files touched

```text
supabase/migrations/20260710000001_phase3_indexes.sql
scripts/apply-migrations.mjs
src/__tests__/phase3.indexes.test.ts
documentation/PHASE_3B_DOCUMENTATION.md
supabase/README.md
```

## Milestone 7 exit checklist

| Item | Status |
| --- | --- |
| Index migration file created | Done |
| All hot-path indexes from the Phase 3 spec included | Done |
| Partial open-jobs index included | Done |
| Swipe indexes included | Done |
| Registered in `apply-migrations.mjs` | Done |
| Applied to Supabase (`npm run db:migrate`) | Done |
| Static index tests pass | Done |
| Docs updated | Done |

## What comes next

**Milestone 8 — RLS policies** (RLS is already enabled on tables; write the actual `CREATE POLICY` statements).

---

# Milestone 8 — Row Level Security Policies (Complete)

## What it is

Milestone 8 writes the actual `CREATE POLICY` statements for every Phase 2/3 table. RLS was already **enabled** in the schema migrations; without policies, authenticated JWT clients would be denied (or over-permitted, depending on defaults). The KUPC Express API continues to use the **service_role** key, which bypasses RLS — these policies protect direct anon/authenticated Supabase access.

## Why it was done

Profiles, jobs, swipes, matches, and chat all contain private data. Policies enforce:

| Rule | Example |
| --- | --- |
| Own-row access | Student can only `SELECT`/`UPDATE` their own `students` row |
| Public-read where intentional | Anyone authenticated can view `companies` with `verification_status = 'approved'` |
| Open feed | Students can `SELECT` jobs where `status = 'open'` |
| Participant-only | Match/conversation/message access only if `auth.uid()` is the student or company on the match |
| Server-owned writes | Match inserts stay on service_role (no client INSERT policy on `matches`) |

## What was done

### Migration file

```text
supabase/migrations/20260710000002_phase3_rls_policies.sql
```

Registered in `scripts/apply-migrations.mjs` and applied with `npm run db:migrate`.

Policies are idempotent: each uses `DROP POLICY IF EXISTS` before `CREATE POLICY`.

### Policy map (summary)

| Area | Policies |
| --- | --- |
| `students` | Own-row SELECT / UPDATE / INSERT |
| `companies` | Own-row ALL + authenticated SELECT of approved companies |
| `jobs` | Company manages own jobs; SELECT open jobs |
| `resumes` / `resume_analysis` | Student owns resumes; analysis via resume ownership subquery |
| `skills` / `student_skills` | Authenticated read skills; students manage own skill links |
| `swipes` / `matches` | Students manage own swipes; companies view swipes on their jobs; participants view matches |
| `conversations` / `messages` | Participant SELECT; participants send/update messages |
| `notifications` / `saved_jobs` / `reports` | Own-row read/update; students manage saved jobs; users file/view own reports |
| `company_verification_requests` | Company manages own requests |
| `users` / `analytics_events` | Own-row SELECT; users insert own analytics |

### Test file

```text
src/__tests__/phase3.rls.test.ts
```

Static checks that required policy names and `auth.uid()` / `service_role` notes are present.

## Files touched

```text
supabase/migrations/20260710000002_phase3_rls_policies.sql
scripts/apply-migrations.mjs
src/__tests__/phase3.rls.test.ts
documentation/PHASE_3B_DOCUMENTATION.md
supabase/README.md
```

## Milestone 8 exit checklist

| Item | Status |
| --- | --- |
| RLS policy migration created | Done |
| Owner / participant / public-read rules covered | Done |
| Idempotent DROP + CREATE | Done |
| Registered + applied via `db:migrate` | Done |
| Static RLS tests pass | Done |
| Docs updated | Done |

---

# Milestone 9 — Seed Data (Complete)

## What it is

Milestone 9 loads realistic demo data into a **local or staging** Supabase project so later phases (profiles, swiping, matching, chat) can be built and demoed without waiting on real signups.

**Never run the seed against production.**

## Why it was done

Empty tables make feed, match, and chat work untestable. Seed data also exercises uniqueness constraints, cascades (via re-seed cleanup), and gives Milestone 11 something meaningful for `EXPLAIN ANALYZE`.

## Volumes (Phase 3 spec)

| Dataset | Volume | Notes |
| --- | --- | --- |
| Skills | 40 | Canonical list upserted on `name` |
| Students | 100 | `seed.student.NNN@ku.edu.np`, CGPA 2.0–4.0, mixed departments/years, 3–8 skills each |
| Companies | 50 | ~70% approved / ~20% pending / ~10% rejected |
| Jobs | 200 | Mostly on approved companies; mixed `job_type` and `status` |
| Swipes | ~500 | Mix of left/right on open jobs |
| Matches / conversations / messages | ~25 | Derived from a subset of right-swipes (simulates company reciprocation) |
| Saved jobs | ~80 | Bookmarks for feed/demo UI |
| Notifications | 2 per match | `type = match` for student and company |

## How it works

### Script

```text
scripts/seed.ts
```

Run:

```bash
npm run db:seed
```

Requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`.

### Order of operations

1. **Safety gate** — refuse if `NODE_ENV=production` or URL looks like prod (override only with `ALLOW_SEED_ON_PROD_URL=1`)
2. **Clear prior seed** — delete `public.users` rows with `email LIKE 'seed.%'` via `auth.admin.deleteUser` (cascades profiles, jobs, swipes, matches, chat)
3. **Skills** — upsert 40 canonical names
4. **Students** — `auth.admin.createUser` → `register_student_profile` RPC → profile fields + `student_skills`
5. **Companies** — same pattern with `register_company_profile`, then set verification mix + industry
6. **Jobs** — batch insert 200 rows
7. **Swipes / matches / chat** — insert swipes; for ~25 right-swipes create `matches` + `conversations` + opener `messages` + notifications; insert saved jobs

### Auth dependency

`public.users.id` references `auth.users(id)`, so every seeded student/company must be created through the Auth Admin API first. All seed accounts share password:

```text
SeedPass123!
```

Examples:

- Student: `seed.student.001@ku.edu.np`
- Company: `seed.company.001@example.com`

### Idempotency

Re-running `npm run db:seed` clears previous `seed.*` users then inserts fresh data. Skills are upserted (safe to keep across runs). Faker is seeded with a fixed seed (`20260710`) for reproducible names where possible; Auth UUIDs still differ each run.

### Match derivation note

The product model is: student right-swipe + company reciprocation → match. The `swipes` table stores the student decision; company reciprocation is application logic (service_role inserts into `matches`). The seed creates matches for a deliberate subset of right-swipes so chat can be demoed without a live company client.

## Test file

```text
src/__tests__/phase3.seed.test.ts
```

Static checks that the script encodes required volumes, clears `seed.*` users, creates auth + profiles + jobs/swipes/matches, and refuses production.

## Files touched

```text
scripts/seed.ts
package.json                    (db:seed script; @faker-js/faker + tsx)
src/__tests__/phase3.seed.test.ts
documentation/PHASE_3B_DOCUMENTATION.md
supabase/README.md
```

## Milestone 9 exit checklist

| Item | Status |
| --- | --- |
| Seed script created | Done |
| 100 students / 50 companies / 200 jobs / ~40 skills | Done |
| Swipes + derived matches/conversations | Done |
| Idempotent re-run (clear seed.* then insert) | Done |
| Production safety guard | Done |
| `npm run db:seed` wired | Done |
| Static seed tests pass | Done |
| Docs updated | Done |

## What comes next

| Milestone | Next deliverable |
| --- | --- |
| **11** | Full CRUD / cascade / uniqueness / RLS / `EXPLAIN ANALYZE` test matrix |

---

# Milestone 10 — Repository Layer (Complete)

## What it is

Milestone 10 adds a typed persistence layer under `src/database/` so controllers and services never call Supabase (or write SQL) directly.

```text
Controller → Service → Repository → Supabase (service_role)
```

Each repository exposes only the query shapes later feature services need — not a generic unrestricted CRUD dump.

## Why it was done

1. **Isolation** — persistence details (`.eq()` chains, table names, column mapping) can change without rewriting business logic.
2. **Testability** — services mock repositories instead of needing a live database.
3. **Consistency** — Phase 2 already used this pattern for auth tables; Phase 3 domain tables follow the same style.
4. **Error surfacing** — every method checks Supabase `error` and `throw`s it; services handle failures explicitly.

## Conventions (match Phase 2)

| Rule | Detail |
| --- | --- |
| Client | Always `supabaseAdmin` (service_role; bypasses RLS) |
| Inputs | camelCase (`studentId`, `jobType`) |
| DB columns | snake_case in inserts/updates |
| Returns | Typed `*Record` objects (or `null` / `[]`) |
| Errors | `if (error) throw error` — never swallow |
| Scope | Query shapes for known hot paths only |

## Repositories added / extended

### Extended (Phase 2 → Phase 3 profile fields)

| File | New / extended methods |
| --- | --- |
| `students.repository.ts` | `findById`, `findByKuId`, `listByDepartment`, `updateProfile`, `setActiveResume` |
| `companies.repository.ts` | `findById`, `listPending`, `listApproved`, `listByVerificationStatus`, `updateProfile`, `setVerificationStatus` |
| `companyRequests.repository.ts` | `listByCompany`, `listPending`, `setStatus` + alias `companyVerificationRequestsRepository` |

### New (Phase 3 domain)

| File | Table(s) | Key methods |
| --- | --- | --- |
| `jobs.repository.ts` | `jobs` | `create`, `findById`, `listByCompany`, `listOpenForFeed`, `update`, `deleteById` |
| `resumes.repository.ts` | `resumes`, `resume_analysis` | `create`, `listByStudent`, `createAnalysis`, `findAnalysisByResumeId` |
| `skills.repository.ts` | `skills`, `student_skills` | `listAll`, `upsertByName`, `linkStudentSkill`, `listForStudent` |
| `swipes.repository.ts` | `swipes` | `create`, `listJobIdsByStudent`, `findStudentRightSwipe`, `listByCompany` |
| `matches.repository.ts` | `matches` | `create`, `findByTriple`, `listByStudent`, `listByCompany` |
| `conversations.repository.ts` | `conversations` | `createForMatch`, `findById`, `findByMatchId` |
| `messages.repository.ts` | `messages` | `create`, `listByConversation`, `markRead` |
| `notifications.repository.ts` | `notifications` | `create`, `listByUser`, `markRead`, `markAllReadForUser` |
| `savedJobs.repository.ts` | `saved_jobs` | `save`, `unsave`, `listByStudent`, `exists` |
| `reports.repository.ts` | `reports` | `create`, `listByReporter`, `listOpen`, `setStatus` |
| `analyticsEvents.repository.ts` | `analytics_events` | `create`, `listByUser`, `listByEventType` |

Phase 2 auth repositories (`users`, `sessions`, `refreshTokens`, `studentOtps`) are unchanged.

## Example: student feed path

```typescript
const swipedIds = await swipesRepository.listJobIdsByStudent(studentId);
const feed = await jobsRepository.listOpenForFeed(swipedIds);
```

## Example: match creation path

```typescript
const swipe = await swipesRepository.create({ studentId, companyId, jobId, direction: 'right' });
// …company reciprocates via service logic…
const match = await matchesRepository.create({ studentId, companyId, jobId });
const conversation = await conversationsRepository.createForMatch(match.id);
await notificationsRepository.create({ userId: studentId, type: 'match', payload: { match_id: match.id } });
```

## Test file

```text
src/__tests__/phase3.repositories.test.ts
```

Static checks that every required repository file exists, exports the expected method names, uses `supabaseAdmin` with thrown errors, and does not embed raw SQL strings.

## Files touched

```text
src/database/students.repository.ts          (extended)
src/database/companies.repository.ts         (extended)
src/database/companyRequests.repository.ts   (extended + alias)
src/database/jobs.repository.ts              (new)
src/database/resumes.repository.ts           (new)
src/database/skills.repository.ts            (new)
src/database/swipes.repository.ts            (new)
src/database/matches.repository.ts           (new)
src/database/conversations.repository.ts     (new)
src/database/messages.repository.ts          (new)
src/database/notifications.repository.ts     (new)
src/database/savedJobs.repository.ts         (new)
src/database/reports.repository.ts           (new)
src/database/analyticsEvents.repository.ts   (new)
src/__tests__/phase3.repositories.test.ts
documentation/PHASE_3B_DOCUMENTATION.md
```

## Milestone 10 exit checklist

| Item | Status |
| --- | --- |
| One repository per Phase 3 domain table (or close group) | Done |
| Spec-required files present (students, companies, resumes, jobs, swipes, matches, conversations, messages, notifications) | Done |
| Typed records + camelCase inputs | Done |
| Errors thrown, not swallowed | Done |
| `company_verification_requests` table name used | Done |
| Static repository tests pass | Done |
| Docs updated | Done |

## What comes next

**Milestone 11 — Testing matrix** (CRUD, cascades, uniqueness, RLS runtime checks, `EXPLAIN ANALYZE` on hot-path indexes).

---

*KUPC — Phase 3B Milestone 10 complete. Testing matrix (Milestone 11) can begin.*
