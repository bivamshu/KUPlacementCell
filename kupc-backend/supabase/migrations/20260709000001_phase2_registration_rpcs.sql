-- Phase 2 registration RPCs: atomic users + profile row creation
-- Run after 20260709000000_phase2_auth_schema.sql

CREATE OR REPLACE FUNCTION public.register_student_profile(
  p_user_id UUID,
  p_email TEXT,
  p_ku_id TEXT,
  p_full_name TEXT
)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created_user public.users;
BEGIN
  INSERT INTO public.users (id, email, role, email_verified, status)
  VALUES (p_user_id, p_email, 'STUDENT', FALSE, 'active')
  RETURNING * INTO created_user;

  INSERT INTO public.students (id, ku_id, full_name)
  VALUES (p_user_id, p_ku_id, p_full_name);

  RETURN created_user;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_company_profile(
  p_user_id UUID,
  p_email TEXT,
  p_company_name TEXT,
  p_website TEXT,
  p_email_verified BOOLEAN DEFAULT FALSE
)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created_user public.users;
BEGIN
  INSERT INTO public.users (id, email, role, email_verified, status)
  VALUES (p_user_id, p_email, 'COMPANY', COALESCE(p_email_verified, FALSE), 'active')
  RETURNING * INTO created_user;

  INSERT INTO public.companies (id, company_name, website, verification_status, verified_at)
  VALUES (p_user_id, p_company_name, p_website, 'pending', NULL);

  RETURN created_user;
END;
$$;
