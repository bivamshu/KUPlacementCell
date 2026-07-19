import { companiesRepository } from '../../database/companies.repository';
import { jobsRepository } from '../../database/jobs.repository';
import { swipesRepository } from '../../database/swipes.repository';
import { jobNotFoundError } from '../jobs/jobs.errors';
import {
  swipeConflictError,
  swipeJobNotOpenError,
  swipeNotImplementedError
} from './swipes.errors';
import { toSwipeDto } from './swipes.mapper';
import type { CreateSwipeServiceInput, InboundSwipeDto, SwipeDto } from './swipes.types';

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: string }).code;
  const message = String((error as { message?: string }).message ?? '').toLowerCase();
  return code === '23505' || message.includes('duplicate') || message.includes('unique');
}

/**
 * Phase 7 B2 — create swipe + (via jobs feed) exclude swiped IDs.
 * B3 undo / B4 inbound still stubbed.
 */
export const swipesService = {
  async create(studentId: string, input: CreateSwipeServiceInput): Promise<SwipeDto> {
    const job = await jobsRepository.findById(input.jobId);

    if (!job) {
      throw jobNotFoundError();
    }

    if (job.status !== 'open') {
      throw swipeJobNotOpenError('Only open jobs can be swiped');
    }

    const company = await companiesRepository.findById(job.company_id);

    if (!company || company.verification_status !== 'approved') {
      throw swipeJobNotOpenError('Job is not available for swiping');
    }

    const existing = await swipesRepository.findByStudentAndJob(studentId, job.id);
    if (existing) {
      throw swipeConflictError();
    }

    try {
      const swipe = await swipesRepository.create({
        studentId,
        companyId: job.company_id,
        jobId: job.id,
        direction: input.direction
      });
      return toSwipeDto(swipe);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw swipeConflictError();
      }
      throw error;
    }
  },

  async undo(_studentId: string, _jobId: string): Promise<{ deleted: true }> {
    throw swipeNotImplementedError();
  },

  async listMine(_studentId: string): Promise<SwipeDto[]> {
    throw swipeNotImplementedError();
  },

  async listInbound(_companyUserId: string): Promise<InboundSwipeDto[]> {
    throw swipeNotImplementedError();
  }
};
