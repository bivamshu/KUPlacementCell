import type { JobStatus, JobType } from './jobs.constants';

/** Own / full job response (company manage + create). Snake_case on the wire. */
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

/** Nested company summary on feed/detail cards (approved companies). */
export type JobCompanySummaryDto = {
  id: string;
  company_name: string;
  logo_url: string | null;
  industry: string | null;
  website: string | null;
};

/** Student feed / saved / public detail card. */
export type JobFeedCardDto = JobDto & {
  company: JobCompanySummaryDto;
  is_saved: boolean;
};

/** Service create input (camelCase) — mapped from snake_case POST body. */
export type CreateJobServiceInput = {
  title: string;
  description: string;
  location?: string | null;
  jobType?: JobType | null;
  minCgpa?: number | null;
};

/** Service update input (camelCase) — status only via publish/close. */
export type UpdateJobServiceInput = {
  title?: string;
  description?: string;
  location?: string | null;
  jobType?: JobType | null;
  minCgpa?: number | null;
};

/** Validated feed query after coercion. */
export type JobListQuery = {
  q?: string;
  job_type?: JobType;
  location?: string;
  min_cgpa?: number;
  limit: number;
  offset: number;
};
