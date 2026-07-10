-- Phase 3 Milestone 6: extend Phase 2 tables + create domain tables
-- Apply after Phase 2 migrations.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Extend students (Phase 2 already has: id, ku_id, full_name, graduation_year, department)
-- ---------------------------------------------------------------------

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS degree TEXT,
  ADD COLUMN IF NOT EXISTS cgpa NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS profile_picture_url TEXT,
  ADD COLUMN IF NOT EXISTS resume_id UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'students_cgpa_check'
  ) THEN
    ALTER TABLE public.students
      ADD CONSTRAINT students_cgpa_check
      CHECK (cgpa IS NULL OR (cgpa >= 0 AND cgpa <= 4));
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 2. Extend companies (Phase 2 already has: id, company_name, website, verification_status, verified_at)
-- ---------------------------------------------------------------------

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ---------------------------------------------------------------------
-- 3. Skills
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL
);

-- ---------------------------------------------------------------------
-- 4. Resumes (create before students.resume_id FK)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Circular dependency: add students.resume_id FK after resumes exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'students_resume_id_fkey'
  ) THEN
    ALTER TABLE public.students
      ADD CONSTRAINT students_resume_id_fkey
      FOREIGN KEY (resume_id) REFERENCES public.resumes (id) ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 5. Resume analysis + student_skills
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.resume_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id UUID NOT NULL REFERENCES public.resumes (id) ON DELETE CASCADE,
  extracted_skills JSONB,
  ats_score NUMERIC(5,2),
  summary TEXT,
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_skills (
  student_id UUID NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills (id) ON DELETE CASCADE,
  proficiency TEXT CHECK (proficiency IN ('beginner', 'intermediate', 'advanced')),
  PRIMARY KEY (student_id, skill_id)
);

-- ---------------------------------------------------------------------
-- 6. Jobs
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT,
  job_type TEXT CHECK (job_type IN ('internship', 'full_time', 'part_time')),
  min_cgpa NUMERIC(3,2),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'draft')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 7. Swipes, matches, saved_jobs
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.swipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs (id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('left', 'right')),
  swiped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, company_id, job_id)
);

CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs (id) ON DELETE CASCADE,
  matched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, company_id, job_id)
);

CREATE TABLE IF NOT EXISTS public.saved_jobs (
  student_id UUID NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs (id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id, job_id)
);

-- ---------------------------------------------------------------------
-- 8. Chat
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID UNIQUE NOT NULL REFERENCES public.matches (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 9. Notifications, moderation, analytics
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users (id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 10. Rename company_requests → company_verification_requests
--     and allow nullable file_url (Phase 3A decision)
--
-- Idempotent for re-runs:
-- - First run: rename company_requests → company_verification_requests
-- - Later runs: Phase 2 may recreate company_requests (IF NOT EXISTS) while
--   company_verification_requests already exists → drop the duplicate
-- ---------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.company_requests') IS NOT NULL
     AND to_regclass('public.company_verification_requests') IS NULL THEN
    ALTER TABLE public.company_requests RENAME TO company_verification_requests;
  ELSIF to_regclass('public.company_requests') IS NOT NULL
     AND to_regclass('public.company_verification_requests') IS NOT NULL THEN
    -- Phase 2 recreated the old table after a previous rename; drop duplicate
    DROP TABLE public.company_requests;
  END IF;
END $$;

ALTER TABLE public.company_verification_requests
  ALTER COLUMN file_url DROP NOT NULL;

-- Rename index if it still has the old name
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'company_requests_company_id_idx'
  ) THEN
    ALTER INDEX public.company_requests_company_id_idx
      RENAME TO company_verification_requests_company_id_idx;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 11. updated_at trigger helper + attach to tables that have updated_at
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_students_updated_at ON public.students;
CREATE TRIGGER trg_students_updated_at
BEFORE UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_companies_updated_at ON public.companies;
CREATE TRIGGER trg_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_jobs_updated_at ON public.jobs;
CREATE TRIGGER trg_jobs_updated_at
BEFORE UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- 12. Enable RLS on new tables (policies come in Milestone 8)
-- ---------------------------------------------------------------------

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
