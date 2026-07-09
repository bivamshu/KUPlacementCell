# KUPC — Kathmandu University Placement Connect

## Phase 3 — Database Design & Data Modeling

**Detailed Implementation Guide — Backend Engineering**

Version 1.1 | Engineering Implementation Guide | Confidential Draft
`PostgreSQL` · `Supabase` · `Row Level Security` · `Repository Pattern` · `ER Modeling`

This document defines the complete relational data architecture underlying every KUPC feature — profiles, resumes, swiping, matching, chat, jobs, notifications, and admin analytics.

---

## Document Control

| Field | Value |
|---|---|
| Project | KUPC — Kathmandu University Placement Connect |
| Component | Backend — Phase 3: Database Design & Data Modeling |
| Version | 1.1 (expanded implementation guide) |
| Status | Draft — ready for implementation |
| Primary stack | PostgreSQL, Supabase, Row Level Security (RLS), SQL, Repository Pattern |
| Depends on | Phase 2 — Authentication & Authorization (must be complete) |
| Feeds into | Phase 4 — Resume Upload & Parsing, Phase 5 — Student & Company Profiles, and every subsequent feature phase (swiping, matching, chat, jobs, analytics) |

---

## Table of Contents

1. [Phase Goal & Definition of Done](#1-phase-goal--definition-of-done)
2. [Architectural Approach: Design Before Implementation](#2-architectural-approach-design-before-implementation)
3. [Milestone 1 — Entity Identification & Domain Modeling](#3-milestone-1--entity-identification--domain-modeling)
4. [Milestone 2 — Attribute Definition](#4-milestone-2--attribute-definition)
5. [Milestone 3 — Relationship Modeling & ER Diagram](#5-milestone-3--relationship-modeling--er-diagram)
6. [Milestone 4 — Normalization](#6-milestone-4--normalization)
7. [Milestone 5 — PostgreSQL Schema Design](#7-milestone-5--postgresql-schema-design)
8. [Milestone 6 — Supabase Table Implementation](#8-milestone-6--supabase-table-implementation)
9. [Milestone 7 — Indexing Strategy](#9-milestone-7--indexing-strategy)
10. [Milestone 8 — Row Level Security (RLS)](#10-milestone-8--row-level-security-rls)
11. [Milestone 9 — Seed Data](#11-milestone-9--seed-data)
12. [Milestone 10 — Repository Layer](#12-milestone-10--repository-layer)
13. [Milestone 11 — Testing Matrix](#13-milestone-11--testing-matrix)
14. [Full Schema Reference](#14-full-schema-reference)
15. [Sequence Diagrams (Described)](#15-sequence-diagrams-described)
16. [Final Project Structure & Exit Checklist](#16-final-project-structure--exit-checklist)

---

## 1. Phase Goal & Definition of Done

Phase 2 gave KUPC a reliable identity layer — every request now arrives with a trustworthy `req.user`. Phase 3 gives that identity somewhere to live. This phase designs and implements the complete PostgreSQL data architecture that every later feature — profiles, resumes, swiping, matching, chat, job postings, notifications, moderation, and analytics — reads from and writes to.

Because every subsequent phase assumes the schema below already exists and is correct, Phase 3 is treated as a **hard dependency gate**: nothing in Phase 4 should start until every item below is true.

The guiding shift in mindset for this phase is to stop thinking *"learn SQL, then create tables"* and instead think *"design the entire data architecture of KUPC first, then implement it."* The database is not a storage detail — it is the foundation that determines what KUPC can and cannot do. A rushed or under-modeled schema doesn't just slow down later phases; it actively constrains product decisions (what a "match" can mean, whether a student can have more than one active resume, whether a company can post a job before it's verified) long after the code that depends on it has shipped.

### Definition of Done

- Every KUPC entity (student, company, resume, skill, resume analysis, job, swipe, match, conversation, message, notification, saved job, company verification request, report, analytics event) has a corresponding normalized table.
- Every table has a primary key, explicit foreign keys, and `NOT NULL` / `CHECK` / `UNIQUE` constraints on every field that requires them.
- The schema is normalized to at least Third Normal Form (3NF) — no repeated groups, no columns that duplicate data derivable from another table.
- A complete ER diagram exists and matches the implemented schema exactly, field for field.
- Every table used in a hot-path lookup (by email, `student_id`, `company_id`, `job_id`, `match_id`, `conversation_id`) has a supporting index.
- Row Level Security is enabled on every table containing user-owned data, with policies restricting students and companies to their own rows and admins to everything.
- Seed data exists for local development and demos — 100 students, 50 companies, 200 jobs at minimum.
- A repository layer sits between services and the database so no controller or service ever writes raw SQL inline.
- Every table passes the CRUD, relationship, constraint, and RLS test matrix in Milestone 11.

---

## 2. Architectural Approach: Design Before Implementation

Phase 3 is deliberately split into two sub-phases so that data-modeling decisions are made deliberately, on paper, before a single `CREATE TABLE` statement is written. This mirrors how production engineering teams work: the data model is agreed upon and reviewed before migrations are authored, because a schema mistake discovered after Phase 5 (profiles) or Phase 7 (swiping) has already been built on top of it is far more expensive to fix than one caught on a whiteboard.

Renaming a column after three downstream services depend on it, or discovering that a "one-to-one" relationship actually needed to be one-to-many, both require coordinated migrations, data backfills, and code changes across every consuming service. Catching these issues during Phase 3A costs a diagram edit; catching them during Phase 7 costs a production incident.

### Phase 3A — Database Architecture (Design)

Identify entities, define attributes, design relationships, draw the ER diagram, normalize the schema, and decide on constraints and indexing strategy. **No SQL is written in this sub-phase.** The goal is to think like a software architect, not a database operator. Every decision here should be justifiable independent of any specific ORM or SQL dialect — the same entity model should hold up whether it's eventually implemented in Postgres, MySQL, or anything else.

### Phase 3B — Database Implementation

Create the PostgreSQL tables in Supabase, add foreign keys and constraints, configure Row Level Security, create indexes, seed the database, build the repository layer, and test every CRUD path and relationship. This is where the paper design from 3A becomes executable, reviewable SQL.

**Milestones 1–4 below belong to Phase 3A. Milestones 5–11 belong to Phase 3B.**

---

## 3. Milestone 1 — Entity Identification & Domain Modeling

Before any table exists, every object that KUPC needs to represent must be named. A database stores entities; if the entities are not known, tables cannot be designed correctly. Walking through every planned feature — registration, resumes, job posts, swiping, matching, chat, notifications, admin moderation — and listing every noun that shows up produces the full entity list below.

For each entity, it's worth asking three questions before moving to Milestone 2: *Does this concept have its own lifecycle (created, updated, deleted independently)? Does it need to be referenced from more than one place? Does it have attributes of its own, distinct from the entities it relates to?* If the answer to any of these is yes, it earns its own table rather than being folded into another entity as a column.

| Entity | Description |
|---|---|
| Student | A verified KU student account and profile |
| Company | A verified or pending employer account and profile |
| Admin | Internal staff account with elevated privileges (created in Phase 2) |
| Resume | An uploaded resume file belonging to a student |
| Skill | A canonical skill tag (e.g. "Python", "Figma") |
| Resume Analysis | Parsed / scored output derived from a resume |
| Job | A job or internship posting created by a company |
| Swipe | A single left/right decision a student makes on a job/company |
| Match | A mutual right-swipe between a student and a company for a job |
| Conversation | A chat thread created once a match exists |
| Message | A single message inside a conversation |
| Notification | An in-app alert delivered to a user |
| Saved Job | A job a student has bookmarked without swiping |
| Session | A login session (already introduced in Phase 2) |
| Refresh Token | A rotating credential tied to a session (Phase 2) |
| Company Verification Request | A pending admin-review request for company approval |
| Report | A user-submitted report against another user, for moderation |
| Analytics Event | A logged user or system event for product analytics |

**Why these boundaries matter:** `Student` and `Company` are kept as separate entities from `Users` (Phase 2) rather than merged into it, because a `User` is purely an authentication identity (email, password hash, role), while a `Student` or `Company` is a *profile* with domain-specific attributes and its own approval lifecycle. Similarly, `Resume` and `Resume Analysis` are split rather than combined, because a resume file and the AI-derived analysis of that file have different lifecycles — a student can re-upload a resume, triggering a new analysis, without destroying the history of prior analyses.

---

## 4. Milestone 2 — Attribute Definition

Once an entity is named, it needs the information that makes it useful. Tables are simply entities with attributes, so this step walks each entity from Milestone 1 and lists its fields. The complete attribute list for every entity — not just the two representative ones shown below — is provided so the design can be reviewed in full before implementation.

### Student

```
id, ku_id, full_name, phone, degree, department, graduation_year,
cgpa, bio, profile_picture_url, resume_id, created_at, updated_at
```

### Company

```
id, company_name, industry, website, description, logo_url,
verification_status, verified_at, created_at, updated_at
```

### Resume

```
id, student_id, file_url, file_name, uploaded_at
```

### Resume Analysis

```
id, resume_id, extracted_skills, ats_score, summary, analyzed_at
```

### Skill

```
id, name
```

### Student Skill (join table)

```
student_id, skill_id, proficiency
```

### Job

```
id, company_id, title, description, location, job_type,
min_cgpa, status, created_at, updated_at
```

### Swipe

```
id, student_id, company_id, job_id, direction, swiped_at
```

### Match

```
id, student_id, company_id, job_id, matched_at
```

### Conversation

```
id, match_id, created_at
```

### Message

```
id, conversation_id, sender_id, content, read_at, sent_at
```

### Saved Job (join table)

```
student_id, job_id, saved_at
```

### Notification

```
id, user_id, type, payload, read_at, created_at
```

### Company Verification Request

```
id, company_id, document_type, file_url, status, created_at
```

### Report

```
id, reporter_id, target_user_id, reason, status, created_at
```

### Analytics Event

```
id, user_id, event_type, metadata, created_at
```

Fields fall into three categories that drive later constraint decisions:

1. **Required identity fields** (`ku_id`, `company_name`) — always `NOT NULL` and usually `UNIQUE`. These are the fields that make a row meaningfully identifiable and distinguishable from every other row of the same type.
2. **Optional profile fields** (`bio`, `logo_url`) — nullable, filled in gradually as the user completes their profile over time. Forcing these to be `NOT NULL` at creation would block signup on information the user may not have ready yet.
3. **System-managed fields** (`created_at`, `updated_at`, `verification_status`) — defaulted and never set directly by the client. These exist to support auditing, sorting, and workflow state, and are only ever written by the server or a trusted trigger, never by a client-supplied payload.

---

## 5. Milestone 3 — Relationship Modeling & ER Diagram

Every pair of entities is examined and classified as one of three relationship shapes:

| Relationship | KUPC Example |
|---|---|
| One-to-One | Student <-> Resume Analysis summary card (a student's active resume has exactly one latest analysis) |
| One-to-Many | Company -> Jobs (a company posts many jobs); Match -> Conversation -> Messages |
| Many-to-Many | Student <-> Company via Swipe/Match; Student <-> Skill via a `student_skills` join table |

Many-to-many relationships are never modeled as arrays or comma-separated columns — each becomes an explicit join table with its own primary key (or composite primary key) so that the relationship itself can carry attributes (a swipe's direction, a skill's proficiency level) and so that referential integrity is enforced by foreign keys rather than trusted to the application layer.

This matters in practice: storing `skills: "Python,React,SQL"` as a text column on `students` makes it impossible to enforce that each skill exists in a canonical list, impossible to query "which students know Python" efficiently, and impossible to attach a proficiency level to each skill without ad-hoc string parsing. The `student_skills` join table solves all three problems with a single foreign-key-backed table.

### ER Diagram (Conceptual)

```
                    +--------------+
                    |    Users     |  (Phase 2)
                    +------+-------+
                           |
         +-----------------+-------------------+
         v                                      v
   Student Profile                       Company Profile
         |                                      |
         |                                      v
         |                    Company Verification Request
         v
      Resume ---------------> Resume Analysis
         |
         v
   student_skills -----------> Skill

   Student -- Swipe -- Company/Job
         |                      |
         +-------- Match -------+
                    |
                    v
              Conversation
                    |
                    v
                 Message

   Company --> Job --> Saved Job (student)
                  +--> Swipe / Match (job-scoped)

   Users --> Notification
   Users --> Session --> Refresh Token   (Phase 2)
   Users --> Report (as reporter or target)
   Users --> Analytics Event
```

Diagrams are drawn and reviewed before any SQL is written — mistakes are far cheaper to fix on paper than in a migration history. In practice, this diagram should be exported to `docs/er-diagram.png` from a proper modeling tool (e.g. dbdiagram.io, Lucidchart, or the Supabase schema visualizer once tables exist) and kept in sync with the schema for the lifetime of the project — see the Exit Checklist in Section 16.

---

## 6. Milestone 4 — Normalization

Normalization removes redundant, duplicated, and derivable data so the database has one authoritative place for every fact. A denormalized `students` table that repeats `company_name`, `company_address`, and `company_phone` on every row is the canonical anti-pattern this phase eliminates.

### Bad — Denormalized

```
students
  id, name, company_name, company_address, company_phone, ...
  -- company_name/address/phone repeated across thousands of student rows
```

### Good — Normalized

```
students
  id, name, ...

companies
  id, company_name, address, phone, ...

jobs
  id, company_id (fk), ...   -- company data lives in exactly one place
```

| Form | Rule applied to KUPC |
|---|---|
| 1NF | Every column holds a single atomic value — e.g. student skills are never stored as a comma-separated string; they live in the `student_skills` join table instead. |
| 2NF | Every non-key column depends on the whole primary key — join tables like `student_skills` and `swipes` carry only relationship attributes (proficiency, direction), never data that belongs to student or skill alone. |
| 3NF | No column depends on another non-key column — e.g. a company's `verification_status` is not duplicated onto every job row; jobs reference companies by foreign key instead. |

**Why stop at 3NF and not push further (e.g. BCNF, 4NF)?** For KUPC's access patterns, 3NF eliminates all the update anomalies that matter in practice (a company changing its name would otherwise require updating every job row). Going further would mean splitting tables in ways that add join overhead to hot-path queries (like the student feed) without removing any real redundancy, since KUPC has no composite candidate keys with overlapping determinants. Where read performance later demands it, controlled denormalization (e.g. a cached `match_count` on `companies`) can be reintroduced deliberately, as a documented exception, not as an artifact of an unfinished design.

---

## 7. Milestone 5 — PostgreSQL Schema Design

With entities, attributes, relationships, and normalization settled on paper, Phase 3B begins by fixing the low-level SQL conventions every table will follow. Deciding these conventions once, up front, means every subsequent `CREATE TABLE` statement is consistent and no table has to be retrofitted later.

### 7.1 Data Types

| Type | Used for |
|---|---|
| `UUID` | Every primary key and foreign key (generated via `gen_random_uuid()`) |
| `TEXT` | Names, descriptions, URLs, free-form strings — Postgres `TEXT` has no length penalty over `VARCHAR(n)` |
| `BOOLEAN` | Binary flags (e.g. `email_verified` from Phase 2) |
| `TIMESTAMPTZ` | Every `created_at` / `updated_at` / `*_at` column — always timezone-aware, never bare `TIMESTAMP` |
| `INTEGER` | Whole-number counters and years (`graduation_year`) |
| `NUMERIC(p,s)` | Exact-precision values like `cgpa` and `ats_score`, where floating-point rounding is unacceptable |
| `JSONB` | Semi-structured, query-light data — `extracted_skills`, notification payloads, analytics metadata |

`TIMESTAMPTZ` in particular is a deliberate, non-negotiable choice: KUPC students and companies may access the platform from different time zones, and Postgres's bare `TIMESTAMP` type silently discards zone information, leading to bugs that only surface once the application scales past a single time zone. `JSONB` (rather than plain `JSON`) is used everywhere semi-structured data is stored because it is stored in a binary format that supports indexing and is faster to query, at the cost of slightly slower writes — an acceptable trade for data that is written once and read often.

### 7.2 Primary Keys

Every table uses a UUID primary key rather than an auto-incrementing integer, so IDs are safe to expose in URLs and never leak row counts or creation order (an incrementing `jobs.id` would let a competitor infer how many jobs were posted last week just by diffing IDs).

```sql
id uuid primary key default gen_random_uuid()
```

The `students` and `companies` tables are the one exception: their primary key is the same UUID as the owning row in `users`, enforced with a foreign key, so a student or company can never exist without a corresponding authenticated identity.

```sql
id uuid primary key references users(id) on delete cascade
```

This pattern — sometimes called "identity inheritance" — also means a lookup by `auth.uid()` (the currently authenticated user's ID) works directly against `students.id` or `companies.id` with no join required, which simplifies both application queries and RLS policies later in Milestone 8.

### 7.3 Foreign Keys & Delete Behavior

| Relationship | ON DELETE behavior | Reasoning |
|---|---|---|
| students/companies -> users | `CASCADE` | A profile cannot outlive its identity row |
| resumes -> students | `CASCADE` | Orphaned resumes have no owner and no purpose |
| jobs -> companies | `CASCADE` | A deleted company's postings are removed with it |
| swipes/matches -> students, companies, jobs | `CASCADE` | Swipe/match history is meaningless once either side is gone |
| messages -> conversations | `CASCADE` | A conversation's messages cannot exist without the thread |
| students.resume_id -> resumes | `SET NULL` | Deleting the active resume shouldn't delete the student |
| analytics_events -> users | `SET NULL` | Historical analytics are kept even if the user is later removed |

Every foreign key's delete behavior is chosen deliberately rather than defaulted — an unspecified `ON DELETE` behavior in Postgres defaults to `NO ACTION`, which would block deletes entirely rather than cascading or nulling out, silently breaking account-deletion flows required for user data requests. `SET NULL` is reserved specifically for relationships where the *referencing* row has independent value and should survive even if the *referenced* row disappears (a student surviving the loss of their resume; an analytics event surviving the loss of the user it was logged for, for aggregate reporting purposes).

### 7.4 Constraints

| Constraint | Example |
|---|---|
| `UNIQUE` | `students.ku_id`, `skills.name`, `(student_id, company_id, job_id)` on `swipes` |
| `NOT NULL` | Every required identity or ownership field — `company_name`, `job.title`, `message.content` |
| `CHECK` | `companies.verification_status in ('pending','approved','rejected')`; `students.cgpa between 0 and 4` |
| `DEFAULT` | `created_at` defaults to `now()`; `verification_status` defaults to `'pending'`; `status` defaults to `'open'` |

Constraints are treated as the primary line of data-integrity defense, ahead of application-level validation. Application code can have bugs, be bypassed by a direct database call, or simply be forgotten in a new code path; a `CHECK` constraint at the database level cannot be. Wherever a rule is truly load-bearing for data correctness (a CGPA must be between 0 and 4, a verification status must be one of three known values), it is encoded as a constraint, not just as a Zod/Joi schema in the service layer.

---

## 8. Milestone 6 — Supabase Table Implementation

This is the direct SQL implementation of every entity from Milestones 1–5. Tables are created in dependency order (referenced tables before the tables that reference them) so foreign keys resolve on first run. The `users`, `sessions`, and `refresh_tokens` tables were created in Phase 2 and are referenced here, not redefined.

```sql
-- Required once per database
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Student & Company profiles
-- ---------------------------------------------------------------------

create table students (
  id uuid primary key references users(id) on delete cascade,
  ku_id text unique not null,
  full_name text not null,
  phone text,
  degree text,
  department text,
  graduation_year integer,
  cgpa numeric(3,2) check (cgpa >= 0 and cgpa <= 4),
  bio text,
  profile_picture_url text,
  resume_id uuid references resumes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table companies (
  id uuid primary key references users(id) on delete cascade,
  company_name text not null,
  industry text,
  website text,
  description text,
  logo_url text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending','approved','rejected')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Resumes & Skills
-- ---------------------------------------------------------------------

create table resumes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  file_url text not null,
  file_name text not null,
  uploaded_at timestamptz not null default now()
);

create table resume_analysis (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references resumes(id) on delete cascade,
  extracted_skills jsonb,
  ats_score numeric(5,2),
  summary text,
  analyzed_at timestamptz not null default now()
);

create table skills (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

create table student_skills (
  student_id uuid not null references students(id) on delete cascade,
  skill_id uuid not null references skills(id) on delete cascade,
  proficiency text check (proficiency in ('beginner','intermediate','advanced')),
  primary key (student_id, skill_id)
);

-- ---------------------------------------------------------------------
-- Jobs, Swipes & Matches
-- ---------------------------------------------------------------------

create table jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  title text not null,
  description text not null,
  location text,
  job_type text check (job_type in ('internship','full_time','part_time')),
  min_cgpa numeric(3,2),
  status text not null default 'open' check (status in ('open','closed','draft')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table swipes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  job_id uuid references jobs(id) on delete cascade,
  direction text not null check (direction in ('left','right')),
  swiped_at timestamptz not null default now(),
  unique (student_id, company_id, job_id)
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  job_id uuid references jobs(id) on delete cascade,
  matched_at timestamptz not null default now(),
  unique (student_id, company_id, job_id)
);

create table saved_jobs (
  student_id uuid not null references students(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (student_id, job_id)
);

-- ---------------------------------------------------------------------
-- Chat
-- ---------------------------------------------------------------------

create table conversations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid unique not null references matches(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references users(id) on delete cascade,
  content text not null,
  read_at timestamptz,
  sent_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Notifications, Moderation & Analytics
-- ---------------------------------------------------------------------

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null,
  payload jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table company_verification_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  document_type text not null,
  file_url text,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references users(id) on delete cascade,
  target_user_id uuid not null references users(id) on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open','reviewed','dismissed')),
  created_at timestamptz not null default now()
);

create table analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  event_type text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);
```

### 8.1 Migration ordering & practical notes

- Because `students.resume_id` references `resumes(id)` and `resumes.student_id` references `students(id)`, there is a circular dependency between the two tables. In practice this is resolved by creating `students` first with `resume_id` nullable and no inline foreign key, then adding the `resume_id` foreign key as a separate `ALTER TABLE` statement once `resumes` exists — or, as shown above, by creating `resumes` conceptually first in the migration file ordering even though it's listed after `students` in the entity list.
- Each `CREATE TABLE` block above should live in its own numbered migration file under `database/migrations/`, applied in the order shown, so that a fresh database can be built up from `0001_students.sql` through the final migration with a single `supabase db push` or equivalent.
- `updated_at` columns are not automatically maintained by Postgres — a lightweight trigger (`set_updated_at()`) should be attached to every table with an `updated_at` column so it is refreshed on every `UPDATE`, rather than relying on the application layer to remember to set it on every write path.

```sql
-- Example trigger, applied once per table with an updated_at column
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_students_updated_at
before update on students
for each row execute function set_updated_at();
```

---

## 9. Milestone 7 — Indexing Strategy

Every foreign key used in a hot-path lookup gets an explicit index — Postgres does **not** automatically index the referencing side of a foreign key, only the referenced side's primary key. Without these indexes, every one of the queries below would fall back to a full sequential scan as the seeded tables grow past a few thousand rows.

| Index | Table | Reason |
|---|---|---|
| `idx_students_ku_id` | students | Lookup during registration and login |
| `idx_companies_verification_status` | companies | Admin dashboard filters pending companies constantly |
| `idx_jobs_company_id` | jobs | Company dashboard lists its own postings |
| `idx_jobs_status` | jobs | Student feed filters to `status = 'open'` on every request |
| `idx_swipes_student_id` | swipes | Prevents re-serving already-swiped jobs to a student |
| `idx_swipes_company_id` | swipes | Company-side swipe history and analytics |
| `idx_matches_student_id` / `idx_matches_company_id` | matches | Populates each side's match list |
| `idx_messages_conversation_id` | messages | Chat history is always fetched by conversation |
| `idx_notifications_user_id` | notifications | Notification bell / inbox query |
| `idx_resumes_student_id` | resumes | Profile page resolves a student's resume history |

```sql
create index idx_students_ku_id on students (ku_id);
create index idx_companies_verification_status on companies (verification_status);
create index idx_jobs_company_id on jobs (company_id);
create index idx_jobs_status on jobs (status);
create index idx_swipes_student_id on swipes (student_id);
create index idx_swipes_company_id on swipes (company_id);
create index idx_matches_student_id on matches (student_id);
create index idx_matches_company_id on matches (company_id);
create index idx_messages_conversation_id on messages (conversation_id);
create index idx_notifications_user_id on notifications (user_id);
create index idx_resumes_student_id on resumes (student_id);
```

### 9.1 Additional indexing considerations

- **Composite index for the swipe feed**: the student feed query typically filters jobs by `status = 'open'` while excluding jobs the student has already swiped on. A composite index on `swipes (student_id, job_id)` (which the existing `UNIQUE (student_id, company_id, job_id)` constraint already provides an index for) supports the "has this student already swiped on this job" check efficiently.
- **Partial indexes**: for columns like `jobs.status` where the application almost always filters to a single value (`'open'`), a partial index — `create index idx_jobs_open on jobs (company_id) where status = 'open';` — can be smaller and faster than a full index once the table has a meaningful share of closed/draft jobs.
- **GIN index on JSONB columns**: if `resume_analysis.extracted_skills` or `analytics_events.metadata` are ever queried by their JSON contents (e.g. "find all resumes where extracted_skills contains 'React'"), a `GIN` index should be added at that point: `create index idx_resume_analysis_skills on resume_analysis using gin (extracted_skills);`. This is deferred until Phase 4/5 actually needs that query pattern, to avoid maintaining an index that isn't yet used.
- **Verify with `EXPLAIN ANALYZE`**: every index above should be confirmed to actually be used by the query planner (see the Testing Matrix in Milestone 11) rather than assumed to be used just because it exists.

---

## 10. Milestone 8 — Row Level Security (RLS)

RBAC (Phase 2) decides whether a request reaches a controller at all. RLS is the database's own second layer of defense: even a bug in application code cannot leak or corrupt another user's row, because Postgres itself enforces ownership on every query. RLS is enabled on every table that stores user-owned data.

### 10.1 Students — own-row access only

```sql
alter table students enable row level security;

create policy "Students can view their own profile"
  on students for select
  using (auth.uid() = id);

create policy "Students can update their own profile"
  on students for update
  using (auth.uid() = id);
```

### 10.2 Companies — own-row access, public read for approved profiles

```sql
alter table companies enable row level security;

create policy "Companies can manage their own profile"
  on companies for all
  using (auth.uid() = id);

create policy "Anyone authenticated can view an approved company"
  on companies for select
  using (verification_status = 'approved');
```

### 10.3 Jobs — companies manage their own, students read open postings

```sql
alter table jobs enable row level security;

create policy "Companies manage their own jobs"
  on jobs for all
  using (auth.uid() = company_id);

create policy "Students can view open jobs"
  on jobs for select
  using (status = 'open');
```

### 10.4 Resumes & resume analysis — student-owned only

```sql
alter table resumes enable row level security;

create policy "Students manage their own resumes"
  on resumes for all
  using (auth.uid() = student_id);

alter table resume_analysis enable row level security;

create policy "Students can view analysis of their own resumes"
  on resume_analysis for select
  using (
    exists (
      select 1 from resumes r
      where r.id = resume_analysis.resume_id
      and r.student_id = auth.uid()
    )
  );
```

### 10.5 Swipes & matches — participant-only access

```sql
alter table swipes enable row level security;

create policy "Students manage their own swipes"
  on swipes for all
  using (auth.uid() = student_id);

create policy "Companies can view swipes on their jobs"
  on swipes for select
  using (auth.uid() = company_id);

alter table matches enable row level security;

create policy "Participants can view their own matches"
  on matches for select
  using (auth.uid() = student_id or auth.uid() = company_id);
```

### 10.6 Messages — participants of the conversation only

```sql
alter table messages enable row level security;

create policy "Only conversation participants can read messages"
  on messages for select
  using (
    exists (
      select 1 from conversations c
      join matches m on m.id = c.match_id
      where c.id = messages.conversation_id
      and (m.student_id = auth.uid() or m.company_id = auth.uid())
    )
  );

create policy "Only conversation participants can send messages"
  on messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from conversations c
      join matches m on m.id = c.match_id
      where c.id = messages.conversation_id
      and (m.student_id = auth.uid() or m.company_id = auth.uid())
    )
  );
```

### 10.7 Notifications, saved jobs, and reports — owner-only

```sql
alter table notifications enable row level security;

create policy "Users can view their own notifications"
  on notifications for select
  using (auth.uid() = user_id);

alter table saved_jobs enable row level security;

create policy "Students manage their own saved jobs"
  on saved_jobs for all
  using (auth.uid() = student_id);

alter table reports enable row level security;

create policy "Users can view reports they filed"
  on reports for select
  using (auth.uid() = reporter_id);

create policy "Users can file reports"
  on reports for insert
  with check (auth.uid() = reporter_id);
```

### 10.8 Admin override

Admin access does not rely on client-supplied RLS bypass. All admin-facing reads and writes go through the trusted `service_role` Supabase client from Phase 2 (`config/supabase.ts`), which bypasses RLS by design and is never exposed outside server-side services. Admin routes are still protected by Phase 2's RBAC middleware first — RLS is a second, independent layer, not a substitute for the role check that happens before the request ever reaches the database.

**A note on `for all` policies**: using `for all` (as with the companies' and students' own-row policies) applies the same `using` clause to `select`, `insert`, `update`, and `delete`. Where insert behavior needs to differ from read/update behavior (as with messages above), separate policies per command are used instead, with `with check` governing what new/modified rows are allowed to look like, and `using` governing what existing rows can be seen or targeted.

---

## 11. Milestone 9 — Seed Data

Realistic seed data lets every later phase (profiles, swiping, matching, chat) be built and demoed without waiting on real signups. A seed script is run once against a local or staging Supabase project — **never against production.**

| Dataset | Volume | Notes |
|---|---|---|
| Students | 100 | Randomized KU emails, CGPAs 2.0–4.0, mixed departments and graduation years |
| Companies | 50 | Mixed `verification_status` — a deliberate share left `pending` to exercise Milestone 7 of Phase 2 |
| Jobs | 200 | Distributed across the 50 seeded companies, mixed `job_type` and `status` |
| Skills | ~40 | A fixed canonical list (Python, React, Figma, SQL, ...) referenced by `student_skills` |
| Swipes | ~500 | A realistic mix of left/right swipes across students, companies, and jobs, sufficient to produce a handful of natural matches |
| Matches / Conversations | derived | Created wherever a seeded swipe pair happens to be mutual, so chat can be demoed without a manual trigger |

```typescript
// scripts/seed.ts
import { faker } from "@faker-js/faker";
import { supabaseAdmin } from "../config/supabase";

async function seedSkills() {
  const canonicalSkills = [
    "Python", "JavaScript", "TypeScript", "React", "Node.js", "SQL",
    "Figma", "Java", "C++", "Go", "Docker", "AWS", "Git", "Excel",
    // ...remaining ~26 canonical skills
  ];
  for (const name of canonicalSkills) {
    await supabaseAdmin.from("skills").upsert({ name }, { onConflict: "name" });
  }
}

async function seedStudents(count = 100) {
  /* insert users + students rows, CGPA 2.0-4.0, mixed department/year */
}

async function seedCompanies(count = 50) {
  /* insert users + companies rows, ~70% approved, ~20% pending, ~10% rejected */
}

async function seedJobs(count = 200) {
  /* insert jobs, one company_id per random company, mixed job_type and status */
}

async function seedSwipesAndMatches(count = 500) {
  /* insert swipe rows; where a mutual right-swipe occurs, create the
     corresponding match and its conversation */
}

async function main() {
  await seedSkills();
  await seedStudents();
  await seedCompanies();
  await seedJobs();
  await seedSwipesAndMatches();
  console.log("Seed complete.");
}

main();
```

**Idempotency**: the seed script should be safe to re-run against a fresh local database (typical after `supabase db reset`), and should either clear existing seeded rows first or use `upsert`/conflict-safe inserts (as shown for `skills`) so re-running it doesn't fail on unique-constraint violations or produce duplicate data.

---

## 12. Milestone 10 — Repository Layer

No controller or service is allowed to write raw SQL or call the Supabase client directly. A dedicated repository layer — one file per table or closely related table group — isolates persistence details behind a small, typed API, following the same feature-based principle established in Phase 2.

```
Controller
   |
   v
Service (business logic, orchestration)
   |
   v
Repository (all Supabase / SQL calls live here — and only here)
   |
   v
Database
```

This layering exists so that persistence details — which Supabase methods are called, how a query is filtered, what an `.eq()` chain looks like — can change without touching business logic, and so that services can be unit tested against a mocked repository interface without needing a real database connection.

```typescript
// database/students.repository.ts
import { supabaseAdmin } from "../config/supabase";
import { Student } from "../modules/students/students.types";

export const studentsRepository = {
  findById: (id: string) =>
    supabaseAdmin.from("students").select("*").eq("id", id).single(),

  updateProfile: (id: string, data: Partial<Student>) =>
    supabaseAdmin.from("students").update(data).eq("id", id),

  listByDepartment: (department: string) =>
    supabaseAdmin.from("students").select("*").eq("department", department),
};
```

```typescript
// database/jobs.repository.ts
import { supabaseAdmin } from "../config/supabase";
import { Job } from "../modules/jobs/jobs.types";

export const jobsRepository = {
  findById: (id: string) =>
    supabaseAdmin.from("jobs").select("*").eq("id", id).single(),

  listOpenForFeed: (excludeJobIds: string[]) =>
    supabaseAdmin
      .from("jobs")
      .select("*")
      .eq("status", "open")
      .not("id", "in", `(${excludeJobIds.join(",")})`),

  listByCompany: (companyId: string) =>
    supabaseAdmin.from("jobs").select("*").eq("company_id", companyId),

  create: (data: Partial<Job>) =>
    supabaseAdmin.from("jobs").insert(data).select().single(),
};
```

```typescript
// database/swipes.repository.ts
import { supabaseAdmin } from "../config/supabase";

export const swipesRepository = {
  create: (studentId: string, companyId: string, jobId: string, direction: "left" | "right") =>
    supabaseAdmin
      .from("swipes")
      .insert({ student_id: studentId, company_id: companyId, job_id: jobId, direction })
      .select()
      .single(),

  findMutualRightSwipe: (studentId: string, companyId: string, jobId: string) =>
    supabaseAdmin
      .from("swipes")
      .select("*")
      .eq("company_id", companyId)
      .eq("job_id", jobId)
      .eq("direction", "right")
      .eq("student_id", studentId)
      .maybeSingle(),
};
```

This mirrors the module responsibilities table from Phase 2: services own business logic, repositories own persistence, and nothing else touches the database directly. A full Phase 3 deliverable includes one repository file per table — `students.repository.ts`, `companies.repository.ts`, `resumes.repository.ts`, `jobs.repository.ts`, `swipes.repository.ts`, `matches.repository.ts`, `conversations.repository.ts`, `messages.repository.ts`, `notifications.repository.ts` — each exposing only the query shapes the corresponding service actually needs, rather than a generic, unrestricted CRUD surface.

---

## 13. Milestone 11 — Testing Matrix

### Schema & CRUD

- Insert a valid row into every table -> succeeds.
- Insert a row violating a `NOT NULL` constraint -> rejected.
- Insert a row violating a `CHECK` constraint (e.g. `cgpa = 5.0`) -> rejected.
- Update and delete a row by primary key -> succeeds and is reflected immediately.

### Relationships & Cascades

- Delete a student -> their resumes, swipes, matches, and `student_skills` rows are removed via `CASCADE`.
- Delete a company -> its jobs, swipes, and matches are removed via `CASCADE`.
- Delete a student's active resume -> `students.resume_id` is set to `NULL`, the student row itself survives.
- Insert a swipe or match referencing a non-existent `student_id`/`company_id` -> rejected by the foreign key.

### Uniqueness & Duplicates

- Duplicate swipe on the same `(student_id, company_id, job_id)` -> rejected by the `UNIQUE` constraint.
- Duplicate `ku_id` on students -> rejected.
- Duplicate skill name -> rejected.

### Indexes

- `EXPLAIN ANALYZE` on a `jobs.status = 'open'` query uses `idx_jobs_status` rather than a sequential scan.
- `EXPLAIN ANALYZE` on a swipes lookup by `student_id` uses `idx_swipes_student_id`.

### Row Level Security

- Student A cannot `SELECT` or `UPDATE` student B's row.
- A company cannot `UPDATE` another company's job postings.
- A student can `SELECT` jobs with `status = 'open'` but not `status = 'draft'` belonging to another company.
- A user who is not part of a conversation cannot `SELECT` its messages, and cannot `INSERT` a message into it either.
- A student cannot view another student's resumes or resume analysis.
- The service-role client can read and write across all of the above without restriction.

### Repository Layer

- Every repository method returns the shape the corresponding service expects, with Supabase errors surfaced (not swallowed) so services can handle them explicitly.
- No `grep`-able raw `.from(...)` Supabase call exists outside the `database/` directory — a lint rule or CI check should enforce this boundary automatically rather than relying on code review alone.

---

## 14. Full Schema Reference

Phase 3 introduces fourteen new tables on top of the `users`, `sessions`, and `refresh_tokens` tables created in Phase 2. Column sets are repeated here for convenience; the authoritative definitions are the `CREATE TABLE` statements in Milestone 6.

| Table | Key columns |
|---|---|
| students | `id` (fk users), `ku_id`, `full_name`, `degree`, `department`, `graduation_year`, `cgpa`, `resume_id`, `created_at` |
| companies | `id` (fk users), `company_name`, `industry`, `website`, `verification_status`, `verified_at`, `created_at` |
| resumes | `id`, `student_id` (fk), `file_url`, `file_name`, `uploaded_at` |
| resume_analysis | `id`, `resume_id` (fk), `extracted_skills` (jsonb), `ats_score`, `summary`, `analyzed_at` |
| skills | `id`, `name` (unique) |
| student_skills | `student_id` (fk), `skill_id` (fk), `proficiency` — composite pk |
| jobs | `id`, `company_id` (fk), `title`, `description`, `job_type`, `min_cgpa`, `status`, `created_at` |
| swipes | `id`, `student_id` (fk), `company_id` (fk), `job_id` (fk), `direction`, `swiped_at` |
| matches | `id`, `student_id` (fk), `company_id` (fk), `job_id` (fk), `matched_at` |
| saved_jobs | `student_id` (fk), `job_id` (fk), `saved_at` — composite pk |
| conversations | `id`, `match_id` (fk, unique), `created_at` |
| messages | `id`, `conversation_id` (fk), `sender_id` (fk users), `content`, `read_at`, `sent_at` |
| notifications | `id`, `user_id` (fk users), `type`, `payload` (jsonb), `read_at`, `created_at` |
| company_verification_requests | `id`, `company_id` (fk), `document_type`, `file_url`, `status`, `created_at` |
| reports | `id`, `reporter_id` (fk users), `target_user_id` (fk users), `reason`, `status`, `created_at` |
| analytics_events | `id`, `user_id` (fk users, nullable), `event_type`, `metadata` (jsonb), `created_at` |

For reference, the `users`, `sessions`, and `refresh_tokens` tables from Phase 2 remain unchanged and are the root that every foreign key above ultimately traces back to.

---

## 15. Sequence Diagrams (Described)

### 15.1 Student Swipe -> Match Creation

`Client -> POST /swipes` with `direction='right'` -> Service inserts a `swipes` row -> Service checks whether the company has already swiped right on the same student/job pairing -> if yes, a `matches` row is created and a `conversation` row is created for it -> Client receives `{ matched: true, conversation_id }` -> if no, Client receives `{ matched: false }` and the swipe is simply recorded.

This check-then-create step is where a race condition is most likely: if both sides swipe right within milliseconds of each other, two concurrent requests could both observe "no match yet" and attempt to create duplicate `matches` rows. The `UNIQUE (student_id, company_id, job_id)` constraint on `matches` is what makes this safe — the second insert fails cleanly at the database level and the service can catch that specific conflict and return the existing match instead of erroring out.

### 15.2 Match -> Conversation -> Message

A `matches` row is created -> a `conversations` row is created referencing it (one-to-one) -> either party calls `POST /conversations/:id/messages` -> a `messages` row is inserted with `sender_id` and `content` -> the RLS policy on `messages` confirms the sender is one of the two match participants before the insert is allowed to succeed -> the other participant's client polls or subscribes for new messages in that `conversation_id`.

Because `conversations.match_id` is `UNIQUE`, at most one conversation can ever exist per match, which keeps the one-to-one relationship enforced at the database level rather than only by convention in application code.

### 15.3 Resume Upload -> Analysis

Client uploads a file -> Service stores it in Supabase Storage and inserts a `resumes` row with the resulting `file_url` -> Service triggers the resume analysis job (implemented fully in a later phase) -> when analysis completes, a `resume_analysis` row is inserted referencing the `resume_id` -> Service updates `students.resume_id` to point at the newest resume, keeping the student's active resume in sync.

Older `resumes` rows are intentionally never deleted when a new one is uploaded — they remain in the table (and their `resume_analysis` rows alongside them) as historical record, even though `students.resume_id` only ever points at the most recent one. This lets a future phase show "resume history" or compare ATS scores across versions without any schema change.

---

## 16. Final Project Structure & Exit Checklist

```
database/
  migrations/            — one .sql file per table or logical group, applied in order
  seed/                  — seed.ts and any fixture data
  policies/              — RLS policy .sql files, one per table
  students.repository.ts
  companies.repository.ts
  resumes.repository.ts
  jobs.repository.ts
  swipes.repository.ts
  matches.repository.ts
  conversations.repository.ts
  messages.repository.ts
  notifications.repository.ts
docs/
  er-diagram.png         — exported from the modeling tool used in Milestone 3
```

### Exit Checklist

- [ ] All 11 milestones complete and individually tested.
- [ ] ER diagram matches the implemented schema exactly, table for table and column for column.
- [ ] Every table has a primary key, and every foreign key has an explicit `ON DELETE` behavior chosen deliberately.
- [ ] Schema verified against 1NF, 2NF, and 3NF with no redundant or derivable columns.
- [ ] Every hot-path foreign key and filter column has a supporting index, verified with `EXPLAIN ANALYZE`.
- [ ] RLS is enabled on every user-owned table and verified in both directions (owner succeeds, non-owner is denied).
- [ ] Seed data (100 students, 50 companies, 200 jobs, ~40 skills) loads cleanly into a fresh database.
- [ ] Repository layer is the only code path that talks to Supabase — no raw SQL or client calls in services or controllers.
- [ ] Full CRUD, cascade, uniqueness, index, and RLS test matrix from Milestone 11 passes.

**End of document.** Once every item in the exit checklist is verified, Phase 4 — Resume Upload & Parsing — can begin.

---

*KUPC — Phase 3: Database Design & Data Modeling — Confidential*
*Kathmandu University Placement Connect*
