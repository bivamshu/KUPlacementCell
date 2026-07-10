# KUPC Phase 3B — Database Implementation

**Status date:** 2026-07-10  
**Depends on:** Phase 3A (design complete)  
**Source spec:** `documentation/KUPC_Phase3_Database_Design_Data_Modeling.md`

Phase 3B turns the Phase 3A paper design into executable Supabase SQL, then indexes, RLS, seed data, repositories, and tests.

| Milestone | Topic | Status |
| --- | --- | --- |
| 5 | PostgreSQL schema conventions | Complete |
| 6 | Supabase table implementation | Complete |
| 7 | Indexing strategy | Pending |
| 8 | Row Level Security policies | Pending (RLS enabled; policies not yet written) |
| 9 | Seed data | Pending |
| 10 | Repository layer | Pending (one rename fix done) |
| 11 | Testing matrix | Partial (static schema tests only) |

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
| **7** | Index migration for hot-path FKs / filters |
| **8** | RLS policies (owner / participant / public-read rules) |
| **9** | Seed script (100 students, 50 companies, 200 jobs, …) |
| **10** | Repository files per table under `src/database/` |
| **11** | Full CRUD / cascade / uniqueness / RLS test matrix |

---

*KUPC — Phase 3B Milestone 6 complete. Indexes (Milestone 7) can begin.*
