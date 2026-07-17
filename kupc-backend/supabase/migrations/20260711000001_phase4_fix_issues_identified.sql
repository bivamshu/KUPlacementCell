-- Phase 4 Milestone 2 follow-up: rename typo column issues_idetified → issues_identified
-- Safe to re-run: only renames when the misspelled column still exists.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'resume_analysis'
      AND column_name = 'issues_idetified'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'resume_analysis'
      AND column_name = 'issues_identified'
  ) THEN
    ALTER TABLE public.resume_analysis
      RENAME COLUMN issues_idetified TO issues_identified;
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'resume_analysis'
      AND column_name = 'issues_idetified'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'resume_analysis'
      AND column_name = 'issues_identified'
  ) THEN
    -- Both exist (e.g. fixed migration re-applied ADD COLUMN): drop the typo.
    ALTER TABLE public.resume_analysis
      DROP COLUMN issues_idetified;
  END IF;
END $$;
