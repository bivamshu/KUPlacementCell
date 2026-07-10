--- Phase 3 Milestone 7: hot-path indexes 
--- Apply after 20260710000000_phase3_schema.sql

--- students: resgistration / Login lookup by KU id 
--- Note: ku_id is already UNIQUE, which creates an index.
--- Explicit name kept for decumentation clairty; IF NOT EXISTS is safe.

CREATE INDEX IF NOT EXISTS idx_students_ku_id ON public.students(ku_id);

-- companies: admin pending-approval filter 
CREATE INDEX IF NOT EXISTS idx_companies_verification_status
    ON public.companies (verification_status);

-- jobs: comapny dashboard + student open-job feed

CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON public.jobs (company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs (status);

-- Partial index: most feed queries only about open jobs
CREATE INDEX IF NOT EXISTS idx_jobs_open_company_id
    ON public.jobs(company_id)
    WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_swipes_student_id ON public.swipes (student_id);
CREATE INDEX IF NOT EXISTS idx_swipes_company_id ON public.swipes (company_id);

-- matches: each side's match list
CREATE INDEX IF NOT EXISTS idx_matches_student_id ON public.matches (student_id);
CREATE INDEX IF NOT EXISTS idx_matches_company_id ON public.matches (company_id);

-- messages; cchat history by conversation 
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
    ON public.messages (conversation_id);

-- notification: inbox / bell 
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
    ON public.notifications (user_id);

-- resumes: students resume hisotry onprofile
CREATE INDEX IF NOT EXISTS idx_resumes_student_id
    ON public.resumes (student_id);
    