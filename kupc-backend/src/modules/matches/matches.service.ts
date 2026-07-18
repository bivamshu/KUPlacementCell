import { companiesRepository } from '../../database/companies.repository';
import { jobsRepository } from '../../database/jobs.repository';
import { matchesRepository } from '../../database/matches.repository';
import { swipesRepository } from '../../database/swipes.repository';
import { companyNotFoundError } from '../companies/companies.errors';
import { jobNotFoundError } from '../jobs/jobs.errors';
import { Role } from '../auth';
import { matchForbiddenError, matchNotImplementedError } from './matches.errors';
import { toMatchDto } from './matches.mapper';
import type { CreateMatchServiceInput, MatchDto } from './matches.types';

export type MatchViewer = {
  id: string;
  role: Role;
};

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: string }).code;
  const message = String((error as { message?: string }).message ?? '').toLowerCase();
  return code === '23505' || message.includes('duplicate') || message.includes('unique');
}

/**
 * Phase 7 B4 — company match create (idempotent).
 * B5 listMine still stubbed. Conversations deferred to Phase 8.
 */
export const matchesService = {
  async create(companyUserId: string, input: CreateMatchServiceInput): Promise<MatchDto> {
    const company = await companiesRepository.findByUserId(companyUserId);

    if (!company) {
      throw companyNotFoundError();
    }

    const job = await jobsRepository.findById(input.jobId);

    if (!job) {
      throw jobNotFoundError();
    }

    if (job.company_id !== company.id) {
      throw matchForbiddenError('You can only match on your own jobs');
    }

    const rightSwipe = await swipesRepository.findStudentRightSwipe(
      input.studentId,
      company.id,
      job.id
    );

    if (!rightSwipe) {
      throw matchForbiddenError('Student has not right-swiped this job');
    }

    const existing = await matchesRepository.findByTriple(input.studentId, company.id, job.id);
    if (existing) {
      return toMatchDto(existing);
    }

    try {
      const match = await matchesRepository.create({
        studentId: input.studentId,
        companyId: company.id,
        jobId: job.id
      });
      return toMatchDto(match);
    } catch (error) {
      if (isUniqueViolation(error)) {
        const raced = await matchesRepository.findByTriple(input.studentId, company.id, job.id);
        if (raced) {
          return toMatchDto(raced);
        }
      }
      throw error;
    }
  },

  async listMine(_viewer: MatchViewer): Promise<MatchDto[]> {
    throw matchNotImplementedError();
  }
};
