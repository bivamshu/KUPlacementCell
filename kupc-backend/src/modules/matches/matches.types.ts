/** Wire DTO — snake_case. Nested cards filled in B5. */
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

/** Service create input (camelCase) from POST /matches body. */
export type CreateMatchServiceInput = {
  jobId: string;
  studentId: string;
};
