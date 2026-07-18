/**
 * Shared DTO types matching kupc-backend Phase 2–6 API contracts.
 * Wire format is snake_case for HTTP bodies/responses (auth + profiles + resumes + jobs).
 */

export type Role = 'STUDENT' | 'COMPANY' | 'ADMIN';

export type ApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  message: string;
  error: unknown | null;
};

export type ApiErrorBody = {
  code?: string;
  statusCode?: number;
  message?: string;
  isOperational?: boolean;
};

/** Login / refresh / verify-otp token pair payload. */
export type AuthTokens = {
  access_token: string;
  refresh_token: string;
  user: AuthUserSnapshot;
};

/** User embedded in login/refresh responses (snake_case). */
export type AuthUserSnapshot = {
  id: string;
  email: string;
  role: Role;
  email_verified: boolean;
  status: string;
  verification_status?: 'pending' | 'approved' | 'rejected';
};

/** GET /auth/me payload (camelCase from AuthenticatedUser). */
export type AuthMeUser = {
  id: string;
  sessionId: string;
  role: Role;
  email: string;
  emailVerified: boolean;
  status: 'active' | 'suspended' | 'deleted';
  verificationStatus?: 'pending' | 'approved' | 'rejected';
};

export type RegisterStudentInput = {
  email: string;
  full_name: string;
  password: string;
};

export type RegisterCompanyInput = {
  company_name: string;
  email: string;
  password: string;
  website?: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type AdminLoginInput = {
  email: string;
  password: string;
  totp_code?: string;
};

export type VerifyOtpInput = {
  email: string;
  otp: string;
};

export type ActiveResumeSummary = {
  id: string;
  file_name: string;
  uploaded_at: string;
};

export type StudentProfile = {
  id: string;
  ku_id: string;
  full_name: string;
  graduation_year: number | null;
  department: string | null;
  phone: string | null;
  degree: string | null;
  cgpa: number | null;
  bio: string | null;
  profile_picture_url: string | null;
  resume_id: string | null;
  active_resume: ActiveResumeSummary | null;
  created_at: string;
  updated_at: string;
};

export type StudentPublicCard = {
  id: string;
  full_name: string;
  graduation_year: number | null;
  department: string | null;
  degree: string | null;
  cgpa: number | null;
  bio: string | null;
  profile_picture_url: string | null;
  resume_id: string | null;
  created_at: string;
  updated_at: string;
};

/** PATCH /students/me body (snake_case on the wire). */
export type UpdateStudentProfileBody = {
  full_name?: string;
  phone?: string | null;
  degree?: string | null;
  bio?: string | null;
  department?: string | null;
  cgpa?: number | null;
  graduation_year?: number | null;
};

export type CompanyVerificationStatus = 'pending' | 'approved' | 'rejected';

export type CompanyProfile = {
  id: string;
  company_name: string;
  website: string | null;
  industry: string | null;
  description: string | null;
  logo_url: string | null;
  verification_status: CompanyVerificationStatus;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanyPublicCard = {
  id: string;
  company_name: string;
  website: string | null;
  industry: string | null;
  description: string | null;
  logo_url: string | null;
  created_at: string;
};

/** PATCH /companies/me body (snake_case on the wire). */
export type UpdateCompanyProfileBody = {
  company_name?: string;
  website?: string | null;
  industry?: string | null;
  description?: string | null;
};

export type UploadResumeResponse = {
  resumeId: string;
  analysisId: string;
  status: 'pending';
};

export type ResumeListItem = {
  id: string;
  file_name: string;
  file_url: string;
  uploaded_at: string;
  is_active: boolean;
};

export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type ScoreBreakdownItem = {
  category: string;
  label: string;
  score: number;
  max_score: number;
};

export type ExtractedSkills = {
  languages: string[];
  frameworks: string[];
  databases: string[];
  cloud: string[];
  data_ml: string[];
  other: string[];
};

export type AnalysisSuggestion = {
  suggestion: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
};

export type AnalysisResult = {
  ats_score: {
    total_score: number;
    grade: string;
    breakdown: ScoreBreakdownItem[];
  };
  extracted_skills: ExtractedSkills;
  summary: string;
  strengths: string[];
  suggestions: AnalysisSuggestion[];
  issues_identified: string[];
};

export type ResumeAnalysis = {
  analysisId: string;
  resumeId: string;
  status: AnalysisStatus;
  error_message?: string | null;
  result?: AnalysisResult | null;
};

// ── Phase 6 — Jobs ─────────────────────────────────────────────────────

export type JobType = 'internship' | 'full_time' | 'part_time';
export type JobStatus = 'open' | 'closed' | 'draft';

export type JobDto = {
  id: string;
  company_id: string;
  title: string;
  description: string;
  location: string | null;
  job_type: JobType | null;
  min_cgpa: number | null;
  status: JobStatus;
  created_at: string;
  updated_at: string;
};

export type JobCompanySummary = {
  id: string;
  company_name: string;
  logo_url: string | null;
  industry: string | null;
  website: string | null;
};

export type JobFeedCard = JobDto & {
  company: JobCompanySummary;
  is_saved: boolean;
};

/** POST /jobs body (snake_case). Status is always draft on create. */
export type CreateJobBody = {
  title: string;
  description: string;
  location?: string | null;
  job_type?: JobType | null;
  min_cgpa?: number | null;
};

/** PATCH /jobs/me/:id body (snake_case). Status only via publish/close. */
export type UpdateJobBody = {
  title?: string;
  description?: string;
  location?: string | null;
  job_type?: JobType | null;
  min_cgpa?: number | null;
};

export type JobFeedQuery = {
  q?: string;
  job_type?: JobType;
  location?: string;
  min_cgpa?: number;
  limit?: number;
  offset?: number;
};

export type SavedToggleResult = {
  saved: boolean;
};

// ── Phase 7 — Swipes & Matches ─────────────────────────────────────────

export type SwipeDirection = 'left' | 'right';

export type SwipeDto = {
  id: string;
  student_id: string;
  company_id: string;
  job_id: string;
  direction: SwipeDirection;
  swiped_at: string;
};

export type CreateSwipeBody = {
  job_id: string;
  direction: SwipeDirection;
};

export type SwipeStudentSummary = {
  id: string;
  full_name: string;
  department: string | null;
  graduation_year: number | null;
  avatar_url: string | null;
};

export type InboundSwipeDto = {
  swipe: SwipeDto;
  student: SwipeStudentSummary;
  job: {
    id: string;
    title: string;
    status: string;
  };
};

export type SwipeUndoResult = {
  deleted: true;
};

export type MatchDto = {
  id: string;
  student_id: string;
  company_id: string;
  job_id: string;
  matched_at: string;
  job?: {
    id: string;
    title: string;
    status: string;
  };
  student?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  company?: {
    id: string;
    company_name: string;
    logo_url: string | null;
  };
};

export type CreateMatchBody = {
  job_id: string;
  student_id: string;
};
