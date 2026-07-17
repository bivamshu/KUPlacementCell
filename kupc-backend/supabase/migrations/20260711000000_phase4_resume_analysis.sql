--- Phase 4 Milestone 2: extend resume_analysis for async pipeline + richer AI output 
--- Apply after Phase 3 migrations. 

-- -------------------------------------------------------------------------------------------
-- 1. Lifecycle + result columns 
-- -------------------------------------------------------------------------------------------

ALTER TABLE public.resume_analysis 
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS error_message TEXT,
    ADD COLUMN IF NOT EXISTS grade TEXT,
    ADD COLUMN IF NOT EXISTS score_breakdown JSONB, 
    ADD COLUMN IF NOT EXISTS strengths JSONB,
    ADD COLUMN IF NOT EXISTS suggestions JSONB, 
    ADD COLUMN IF NOT EXISTS issues_identified JSONB, 
    ADD COLUMN IF NOT EXISTS raw_response JSONB, 
    ADD COLUMN IF NOT EXISTS model TEXT, 
    ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ, 
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------------------------
-- 2. Status CHECK (idempotent)
-- ---------------------------------------------------------------------------------------------

DO $$
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'resume_analysis_status_check'
    ) THEN 
        ALTER TABLE public.resume_analysis 
            ADD CONSTRAINT resume_analysis_status_check 
            CHECK (status IN ('pending', 'processing', 'completed', 'failed'));
        END IF;
    END$$;

-- -----------------------------------------------------------------------------------------------------------------------------
-- 3. GIN index for skill containment queries
-- -----------------------------------------------------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_resume_analysis_skills 
    ON public.resume_analysis USING gin (extracted_skills);

CREATE INDEX IF NOT EXISTS idx_resume_analysis_resume_id_status
    ON public.resume_analysis (resume_id, status);

