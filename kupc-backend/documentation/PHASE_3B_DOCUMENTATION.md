What Milestone 5 is 

After Phase 3A (entities/attributes/relationships/normalization), Phase 3B starts by agreeing on: 
1. Which Postgres types to use
2. How primary keys work
3. How  foreign keys delete
4. Which constraints every table must use

Then Milestone 6 turns that into real CREATE TABLE / ALTER TABLE SQL

# Phase 3B - Milestone 5: PostgresSQL Schema Conventions

Status: Complete (design gate before Milestone 6) 
Depends on: Phase 3A 
Feeds into: Milestone 6 - Supabase table implementation

## Goal 

Fix low-level SQL conventions once, up front, so every CREATE TABLE / ALTER TABLE in Milestone 6 is consistent. 

No tables are created in this milestone. 

---

## 5.1 Data types 

| Type | Used for | Why |
| --- | --- | --- | 
| UUID | Every primary Key and Foreign Key | Safe in URLS; does not leak row counts or creation order | 
| TEXT | Names, descriptions, URLs, Free-form strings | No length penalty vs VARCHAR(n) in Postgres | 
| BOOLEAN | Flags (e.g email_verified) | Clear true/false | 
| TIMESTAMPTZ | Every created_at / updated_at / *_at | TImezone-aware; never babre TIMESTAMP | 
| INTEGER | Whole numbers / years (garduation_year) | Exact intergers | 
| NUMERIC(p, s) | cgpa, ats_score | Exact decimal; avoid float rounding | 
| JOSNB | extracted_skills, notification payload, analytics metadata | Indexable binary JSON; write-once / read-often | 

Rules: 
- Always TIMESTAMPTZ, never TIMESTAMP 
-ALways JSONB, never plain JOSN (for KUPC semi-structured fields)
-Enable pgcrypto once so gen_random_uuid() works: 
CREATE EXTENSION IF NOT EXISTS pgcrypto;

---

## 5.2 Primary Keys

Default pattern (most tables): 

'''sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

Identity inheritance (students + coma-pnies only): 

id UUID PRIMARY KEY REFERNCES users(id) ON DELETE CASCADE 

Why identity inhertiance: 
- students.id/comapnies.id == users.idauth.uid()
- RLS and "my profile" queries need to extra join 
- A profile cannot exist without an auth user 

Join tables use composite Pk's isntead of a seperate UUID id: 
- student_skills (student_id, skill_id)
- saved_jobs (students_id, job_id)

## 5.3 Foreign keys & ON DELETE behavior

Postgres default ON DELETE is NO ACTION (blocks deletes). Every FK must choose CASCADE or SET NULL deliberately. 

| Relationship | ON DELETE | WHY | 
students / companies -> users | CASCADE | Profile cannot outlive identity | 
| resumes -> students | CASCADE | orphanced resumes are useless | 
| resume_analysis -> resumes | CASCADE | Analysis belongs to the file | 
| student_skills -> students / skills | CASCADE | Link dies with either side | 
| jobs -> companies | CASCADE | Jobs die with company | 
| swipes / matches -> students, companies, jobs | CASCADE | History meaningless without either side | 
| saved_jobs -> stduents / jobs | CASCADE | Bookmark dies with either side | 
| conversations -> matches | CASCADE | Chat dies with match | 
messages -> conversations | CASCADE | Messages die with thread | 
| messages.sender_id -> users | CASCADE | Sender must be a real user | 
| notifications -> users | CASCADE | Notifications belong to recipient | 
| company_verification_requests -> companies | CASCADE | Requests belong to company | 
| reposts.reporter_id / target_user_id -> users | CASCADE | Report rows tied to users | 
| students.resume_id -> resumes | SET NULL | Deleteing active resume must not delete student | 
| analytics_events.user_id -> users | SET NULL | Keep aggregate history after user deletion | 

SEt NULL rule"Use only when the referencing row still has value without the referenced row. 

## 5.4 Constraints 

|Constraint | Purpose | KUPC examples | 
| UNIQUE | No Duplicates | students.ku_id; skills.name; swipes(student_id, company_id, job_id); mathces(student_id, comapny_id, job_id); conversations.match_id;
| NOT_NULL | Required fields | company_name; jobs.title; jobs.description; messages.content; swipes.direction
| CHECK | Allowed values | comapnies. verification_status IN ('pending', 'approved', 'rejected'); students.cgpa BETWEEN 0 AND 4; jobs.satus IN ('open', 'closed', 'draft'); jobs.job_type IN ('internship', 'full_time', 'part_time'); swipes.direction IN ('left', 'right'); student_skills.proficiency IN ('beginner', 'intermediate', 'advanced'); reports.status IN ('open', 'reviewed', 'dismissed')
| DEFAULT | Server defaults | created_at DEFAULT now() verification_status DEFAULT 'pending'; jobs.status DEFAULT 'open'

Rule: Load-bearing correctness lives in D8 constraints, not only Zod.App validation can be bypassed; CHECK/ UNIQUE / Foreign cannot .

## 5.5 Extra conventions for Milestone 6 
1. Extend Phase 2 students / companies wiht ALTER TABLE - do not recreate them. 
2. Rename comapny_requests -> comapny_verification_requests. 
3. Circular foreign key students.resume_id -> resumes.students_id: 
    - add resume_id column fiest (nullabke, no FK)
    - create resumes
    - then ALTEr TABLE students ADD CONSTRAINT ...REFERNCES resumes(id) ON DELETE SET NULL
4. Attach set_updated_at() trigger to every tbale with upload_at(students, companies, jobs).
5. Enable RLS on every new user-owned tbale in Milestone 6; write policies in Milestone 8.



