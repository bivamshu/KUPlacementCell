import { companiesRepository } from '../../database/companies.repository';
import type { JobRecord } from '../../database/jobs.repository';
import { jobsRepository } from '../../database/jobs.repository';
import { savedJobsRepository } from '../../database/savedJobs.repository';
import { swipesRepository } from '../../database/swipes.repository';
import { companyNotFoundError } from '../companies/companies.errors';
import { Role } from '../auth';
import {
  invalidJobTransitionError,
  jobForbiddenError,
  jobNotFoundError
} from './jobs.errors';
import { toJobDto, toJobFeedCardDto } from './jobs.mapper';
import type {
  CreateJobServiceInput,
  JobDto,
  JobFeedCardDto,
  JobListQuery,
  UpdateJobServiceInput
} from './jobs.types';

export type JobViewer = {
  id: string;
  role: Role;
};

/** Resolve the company row for an authenticated company user (companies.id === users.id). */
async function resolveCompanyId(userId: string): Promise<string> {
  const company = await companiesRepository.findByUserId(userId);

  if (!company) {
    throw companyNotFoundError();
  }

  return company.id;
}

async function requireOwnedJob(userId: string, jobId: string): Promise<JobRecord> {
  const companyId = await resolveCompanyId(userId);
  const job = await jobsRepository.findById(jobId);

  if (!job) {
    throw jobNotFoundError();
  }

  if (job.company_id !== companyId) {
    throw jobForbiddenError('You can only manage your own jobs');
  }

  return job;
}

async function savedJobIdSet(viewer: JobViewer): Promise<Set<string>> {
  if (viewer.role !== Role.STUDENT) {
    return new Set();
  }

  const rows = await savedJobsRepository.listByStudent(viewer.id);
  return new Set(rows.map((row) => row.job_id));
}

/**
 * Phase 6 B2 — company job CRUD (draft → publish → close).
 * B3 feed/detail live. B4 saved jobs still stubbed.
 */
export const jobsService = {
  async create(userId: string, input: CreateJobServiceInput): Promise<JobDto> {
    const companyId = await resolveCompanyId(userId);
    const job = await jobsRepository.create({
      companyId,
      title: input.title,
      description: input.description,
      location: input.location,
      jobType: input.jobType,
      minCgpa: input.minCgpa,
      status: 'draft'
    });

    return toJobDto(job);
  },

  async listMine(userId: string): Promise<JobDto[]> {
    const companyId = await resolveCompanyId(userId);
    const jobs = await jobsRepository.listByCompany(companyId);
    return jobs.map(toJobDto);
  },

  async getMine(userId: string, jobId: string): Promise<JobDto> {
    const job = await requireOwnedJob(userId, jobId);
    return toJobDto(job);
  },

  async updateMine(userId: string, jobId: string, input: UpdateJobServiceInput): Promise<JobDto> {
    await requireOwnedJob(userId, jobId);
    const updated = await jobsRepository.update(jobId, {
      title: input.title,
      description: input.description,
      location: input.location,
      jobType: input.jobType,
      minCgpa: input.minCgpa
      // status never set via PATCH — use publish/close
    });

    return toJobDto(updated);
  },

  async publish(userId: string, jobId: string): Promise<JobDto> {
    const job = await requireOwnedJob(userId, jobId);

    if (job.status !== 'draft') {
      throw invalidJobTransitionError('Only draft jobs can be published');
    }

    const updated = await jobsRepository.update(jobId, { status: 'open' });
    return toJobDto(updated);
  },

  async close(userId: string, jobId: string): Promise<JobDto> {
    const job = await requireOwnedJob(userId, jobId);

    if (job.status !== 'open') {
      throw invalidJobTransitionError('Only open jobs can be closed');
    }

    const updated = await jobsRepository.update(jobId, { status: 'closed' });
    return toJobDto(updated);
  },

  async deleteMine(userId: string, jobId: string): Promise<void> {
    await requireOwnedJob(userId, jobId);
    await jobsRepository.deleteById(jobId);
  },

  async listFeed(viewer: JobViewer, query: JobListQuery): Promise<JobFeedCardDto[]> {
    const excludeJobIds =
      viewer.role === Role.STUDENT ? await swipesRepository.listJobIdsByStudent(viewer.id) : [];

    const jobs = await jobsRepository.listOpenFiltered({
      q: query.q,
      jobType: query.job_type,
      location: query.location,
      // Express query values may remain strings even after Zod coerce + Object.assign.
      minCgpa: query.min_cgpa !== undefined ? Number(query.min_cgpa) : undefined,
      excludeJobIds,
      limit: Number(query.limit),
      offset: Number(query.offset)
    });

    if (jobs.length === 0) {
      return [];
    }

    const companies = await companiesRepository.findByIds(jobs.map((job) => job.company_id));
    const companyById = new Map(companies.map((company) => [company.id, company]));
    const savedIds = await savedJobIdSet(viewer);

    const cards: JobFeedCardDto[] = [];

    for (const job of jobs) {
      const company = companyById.get(job.company_id);
      // Defensive: never surface jobs from non-approved companies on the public feed.
      if (!company || company.verification_status !== 'approved') {
        continue;
      }

      cards.push(toJobFeedCardDto(job, company, savedIds.has(job.id)));
    }

    return cards;
  },

  async getPublic(jobId: string, viewer?: JobViewer): Promise<JobFeedCardDto> {
    const job = await jobsRepository.findById(jobId);

    if (!job || job.status !== 'open') {
      throw jobNotFoundError();
    }

    const company = await companiesRepository.findById(job.company_id);

    if (!company || company.verification_status !== 'approved') {
      throw jobNotFoundError();
    }

    let isSaved = false;
    if (viewer?.role === Role.STUDENT) {
      isSaved = await savedJobsRepository.exists(viewer.id, job.id);
    }

    return toJobFeedCardDto(job, company, isSaved);
  },

  /**
   * Bookmark an open job. Idempotent upsert (re-save returns 200).
   * students.id === users.id in this schema.
   */
  async save(userId: string, jobId: string): Promise<{ saved: true }> {
    const job = await jobsRepository.findById(jobId);

    if (!job || job.status !== 'open') {
      throw jobNotFoundError();
    }

    const company = await companiesRepository.findById(job.company_id);

    if (!company || company.verification_status !== 'approved') {
      throw jobNotFoundError();
    }

    await savedJobsRepository.save(userId, jobId);
    return { saved: true };
  },

  /** Remove bookmark. Idempotent — missing bookmark still returns { saved: false }. */
  async unsave(userId: string, jobId: string): Promise<{ saved: false }> {
    await savedJobsRepository.unsave(userId, jobId);
    return { saved: false };
  },

  async listSaved(userId: string): Promise<JobFeedCardDto[]> {
    const rows = await savedJobsRepository.listByStudent(userId);

    if (rows.length === 0) {
      return [];
    }

    const jobs = await jobsRepository.findByIds(rows.map((row) => row.job_id));
    const jobById = new Map(jobs.map((job) => [job.id, job]));
    const companies = await companiesRepository.findByIds(jobs.map((job) => job.company_id));
    const companyById = new Map(companies.map((company) => [company.id, company]));

    const cards: JobFeedCardDto[] = [];

    // Preserve saved_at order from listByStudent.
    for (const row of rows) {
      const job = jobById.get(row.job_id);
      if (!job || job.status !== 'open') {
        continue;
      }

      const company = companyById.get(job.company_id);
      if (!company || company.verification_status !== 'approved') {
        continue;
      }

      cards.push(toJobFeedCardDto(job, company, true));
    }

    return cards;
  }
};