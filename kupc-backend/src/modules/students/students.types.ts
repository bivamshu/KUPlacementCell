/** Own-profile response (GET/PATCH /students/me). Snake_case matches auth + resumes APIs. */
export type StudentProfileDto = {
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

/** Public card (GET /students/:id) — omits phone and ku_id. */
export type StudentPublicCardDto = {
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

export type ActiveResumeSummary = {
  id: string;
  file_name: string;
  uploaded_at: string;
};

/** Service/repository update shape (camelCase). Mapped from snake_case PATCH body. */
export type UpdateStudentProfileInput = {
  fullName?: string;
  phone?: string | null;
  degree?: string | null;
  cgpa?: number | null;
  bio?: string | null;
  department?: string | null;
  graduationYear?: number | null;
};
