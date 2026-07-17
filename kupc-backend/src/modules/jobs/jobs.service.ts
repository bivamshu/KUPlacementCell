import { jobNotImplementedError } from './jobs.errors';
import type {
  CreateJobServiceInput,
  JobDto,
  JobFeedCardDto,
  JobListQuery,
  UpdateJobServiceInput
} from './jobs.types';

/**
 * Phase 6 Milestone B1 — contracts + auth gates only.
 * CRUD / feed / saved behavior ships in B2–B4; handlers throw NOT_IMPLEMENTED until then.
 */
export const jobsService = {
  async create(_userId: string, _input: CreateJobServiceInput): Promise<JobDto> {
    throw jobNotImplementedError('POST /jobs — implement in Milestone B2');
  },

  async listMine(_userId: string): Promise<JobDto[]> {
    throw jobNotImplementedError('GET /jobs/me — implement in Milestone B2');
  },

  async getMine(_userId: string, _jobId: string): Promise<JobDto> {
    throw jobNotImplementedError('GET /jobs/me/:id — implement in Milestone B2');
  },

  async updateMine(_userId: string, _jobId: string, _input: UpdateJobServiceInput): Promise<JobDto> {
    throw jobNotImplementedError('PATCH /jobs/me/:id — implement in Milestone B2');
  },

  async publish(_userId: string, _jobId: string): Promise<JobDto> {
    throw jobNotImplementedError('POST /jobs/me/:id/publish — implement in Milestone B2');
  },

  async close(_userId: string, _jobId: string): Promise<JobDto> {
    throw jobNotImplementedError('POST /jobs/me/:id/close — implement in Milestone B2');
  },

  async deleteMine(_userId: string, _jobId: string): Promise<void> {
    throw jobNotImplementedError('DELETE /jobs/me/:id — implement in Milestone B2');
  },

  async listFeed(_viewerUserId: string, _query: JobListQuery): Promise<JobFeedCardDto[]> {
    throw jobNotImplementedError('GET /jobs — implement in Milestone B3');
  },

  async getPublic(_jobId: string, _viewerUserId?: string): Promise<JobFeedCardDto> {
    throw jobNotImplementedError('GET /jobs/:id — implement in Milestone B3');
  },

  async save(_userId: string, _jobId: string): Promise<{ saved: true }> {
    throw jobNotImplementedError('POST /jobs/:id/save — implement in Milestone B4');
  },

  async unsave(_userId: string, _jobId: string): Promise<{ saved: false }> {
    throw jobNotImplementedError('DELETE /jobs/:id/save — implement in Milestone B4');
  },

  async listSaved(_userId: string): Promise<JobFeedCardDto[]> {
    throw jobNotImplementedError('GET /jobs/saved — implement in Milestone B4');
  }
};
