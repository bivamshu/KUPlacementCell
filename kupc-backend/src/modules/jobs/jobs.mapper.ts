import type { CompanyRecord } from '../../database/companies.repository';
import type { JobRecord } from '../../database/jobs.repository';
import type { JobType } from './jobs.constants';
import type {
  CreateJobServiceInput,
  JobCompanySummaryDto,
  JobDto,
  JobFeedCardDto,
  UpdateJobServiceInput
} from './jobs.types';
import type { CreateJobBody, UpdateJobBody } from './jobs.validation';

function toMinCgpa(value: number | string | null): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

export function toJobDto(job: JobRecord): JobDto {
  return {
    id: job.id,
    company_id: job.company_id,
    title: job.title,
    description: job.description,
    location: job.location,
    job_type: job.job_type,
    min_cgpa: toMinCgpa(job.min_cgpa),
    status: job.status,
    created_at: job.created_at,
    updated_at: job.updated_at
  };
}

export function toJobCompanySummaryDto(company: CompanyRecord): JobCompanySummaryDto {
  return {
    id: company.id,
    company_name: company.company_name,
    logo_url: company.logo_url,
    industry: company.industry,
    website: company.website
  };
}

export function toJobFeedCardDto(
  job: JobRecord,
  company: CompanyRecord,
  isSaved = false
): JobFeedCardDto {
  return {
    ...toJobDto(job),
    company: toJobCompanySummaryDto(company),
    is_saved: isSaved
  };
}

export function toCreateJobServiceInput(body: CreateJobBody): CreateJobServiceInput {
  const input: CreateJobServiceInput = {
    title: body.title,
    description: body.description
  };

  if (body.location !== undefined) input.location = body.location;
  if (body.job_type !== undefined) input.jobType = body.job_type as JobType | null;
  if (body.min_cgpa !== undefined) input.minCgpa = body.min_cgpa;

  return input;
}

export function toUpdateJobServiceInput(body: UpdateJobBody): UpdateJobServiceInput {
  const input: UpdateJobServiceInput = {};

  if (body.title !== undefined) input.title = body.title;
  if (body.description !== undefined) input.description = body.description;
  if (body.location !== undefined) input.location = body.location;
  if (body.job_type !== undefined) input.jobType = body.job_type as JobType | null;
  if (body.min_cgpa !== undefined) input.minCgpa = body.min_cgpa;

  return input;
}
