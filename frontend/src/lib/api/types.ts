/**
 * Shared DTO types matching kupc-backend Phase 2–5 API contracts.
 * Wire format is snake_case for HTTP bodies/responses (auth + profiles + resumes).
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
