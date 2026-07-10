-- Phase 3 Milestone 8: Row Level Security policies
-- Apply after schema + indexes migrations.
-- RLS was already enabled in Phase 2/3 schema migrations; this file defines policies.
-- Idempotent: DROP POLICY IF EXISTS before CREATE POLICY.
--
-- Admin / server access uses the service_role client (bypasses RLS).
-- These policies protect anon / authenticated JWT access paths.

-- ---------------------------------------------------------------------
-- Helper: ensure RLS remains enabled (safe to re-run)
-- ---------------------------------------------------------------------

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 8.1 Students — own-row access
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS "Students can view their own profile" ON public.students;
CREATE POLICY "Students can view their own profile"
  ON public.students FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Students can update their own profile" ON public.students;
CREATE POLICY "Students can update their own profile"
  ON public.students FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Students can insert their own profile" ON public.students;
CREATE POLICY "Students can insert their own profile"
  ON public.students FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------------
-- 8.2 Companies — own-row manage + public read for approved
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS "Companies can manage their own profile" ON public.companies;
CREATE POLICY "Companies can manage their own profile"
  ON public.companies FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Anyone authenticated can view an approved company" ON public.companies;
CREATE POLICY "Anyone authenticated can view an approved company"
  ON public.companies FOR SELECT
  USING (verification_status = 'approved');

-- ---------------------------------------------------------------------
-- 8.3 Jobs — companies manage own; open jobs readable
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS "Companies manage their own jobs" ON public.jobs;
CREATE POLICY "Companies manage their own jobs"
  ON public.jobs FOR ALL
  USING (auth.uid() = company_id)
  WITH CHECK (auth.uid() = company_id);

DROP POLICY IF EXISTS "Students can view open jobs" ON public.jobs;
CREATE POLICY "Students can view open jobs"
  ON public.jobs FOR SELECT
  USING (status = 'open');

-- ---------------------------------------------------------------------
-- 8.4 Resumes & resume analysis — student-owned
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS "Students manage their own resumes" ON public.resumes;
CREATE POLICY "Students manage their own resumes"
  ON public.resumes FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can view analysis of their own resumes" ON public.resume_analysis;
CREATE POLICY "Students can view analysis of their own resumes"
  ON public.resume_analysis FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.resumes r
      WHERE r.id = resume_analysis.resume_id
        AND r.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can insert analysis for their own resumes" ON public.resume_analysis;
CREATE POLICY "Students can insert analysis for their own resumes"
  ON public.resume_analysis FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.resumes r
      WHERE r.id = resume_analysis.resume_id
        AND r.student_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- 8.5 Skills (canonical list) + student_skills
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated users can read skills" ON public.skills;
CREATE POLICY "Authenticated users can read skills"
  ON public.skills FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Students manage their own skill links" ON public.student_skills;
CREATE POLICY "Students manage their own skill links"
  ON public.student_skills FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- ---------------------------------------------------------------------
-- 8.6 Swipes & matches — participant access
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS "Students manage their own swipes" ON public.swipes;
CREATE POLICY "Students manage their own swipes"
  ON public.swipes FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Companies can view swipes on their jobs" ON public.swipes;
CREATE POLICY "Companies can view swipes on their jobs"
  ON public.swipes FOR SELECT
  USING (auth.uid() = company_id);

DROP POLICY IF EXISTS "Participants can view their own matches" ON public.matches;
CREATE POLICY "Participants can view their own matches"
  ON public.matches FOR SELECT
  USING (auth.uid() = student_id OR auth.uid() = company_id);

-- Match rows are created by trusted server logic (service_role).
-- Authenticated clients may only read matches they participate in.

-- ---------------------------------------------------------------------
-- 8.7 Conversations & messages
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS "Participants can view their conversations" ON public.conversations;
CREATE POLICY "Participants can view their conversations"
  ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = conversations.match_id
        AND (m.student_id = auth.uid() OR m.company_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Only conversation participants can read messages" ON public.messages;
CREATE POLICY "Only conversation participants can read messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.matches m ON m.id = c.match_id
      WHERE c.id = messages.conversation_id
        AND (m.student_id = auth.uid() OR m.company_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Only conversation participants can send messages" ON public.messages;
CREATE POLICY "Only conversation participants can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.matches m ON m.id = c.match_id
      WHERE c.id = messages.conversation_id
        AND (m.student_id = auth.uid() OR m.company_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Senders can update their message read state" ON public.messages;
CREATE POLICY "Participants can update messages in their conversations"
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.matches m ON m.id = c.match_id
      WHERE c.id = messages.conversation_id
        AND (m.student_id = auth.uid() OR m.company_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------
-- 8.8 Notifications, saved jobs, reports
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students manage their own saved jobs" ON public.saved_jobs;
CREATE POLICY "Students manage their own saved jobs"
  ON public.saved_jobs FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can view reports they filed" ON public.reports;
CREATE POLICY "Users can view reports they filed"
  ON public.reports FOR SELECT
  USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users can file reports" ON public.reports;
CREATE POLICY "Users can file reports"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- ---------------------------------------------------------------------
-- 8.9 Company verification requests — company-owned
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS "Companies manage their verification requests" ON public.company_verification_requests;
CREATE POLICY "Companies manage their verification requests"
  ON public.company_verification_requests FOR ALL
  USING (auth.uid() = company_id)
  WITH CHECK (auth.uid() = company_id);

-- ---------------------------------------------------------------------
-- 8.10 Users + analytics
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view their own user row" ON public.users;
CREATE POLICY "Users can view their own user row"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view their own analytics events" ON public.analytics_events;
CREATE POLICY "Users can view their own analytics events"
  ON public.analytics_events FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own analytics events" ON public.analytics_events;
CREATE POLICY "Users can insert their own analytics events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);
