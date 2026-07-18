import { companiesRepository } from '../../database/companies.repository';
import { jobsRepository } from '../../database/jobs.repository';
import { matchesRepository } from '../../database/matches.repository';
import { studentsRepository } from '../../database/students.repository';
import { swipesRepository } from '../../database/swipes.repository';
import { companyNotFoundError } from '../companies/companies.errors';
import { jobNotFoundError } from '../jobs/jobs.errors';
import { matchConflictError } from '../matches/matches.errors';
import { SWIPE_UNDO_WINDOW_SECONDS } from './swipes.constants';
import {
  swipeConflictError,
  swipeJobNotOpenError,
  swipeNotFoundError,
  swipeNotImplementedError,
  swipeUndoExpiredError
} from './swipes.errors';
import { toInboundSwipeDto, toSwipeDto } from './swipes.mapper';
import type { CreateSwipeServiceInput, InboundSwipeDto, SwipeDto } from './swipes.types';

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: string }).code;
  const message = String((error as { message?: string }).message ?? '').toLowerCase();
  return code === '23505' || message.includes('duplicate') || message.includes('unique');
}

/**
 * Phase 7 B2–B4 — create/undo swipe, company inbound interest.
 * GET /swipes/me still stubbed.
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

  async undo(studentId: string, jobId: string): Promise<{ deleted: true }> {
    const swipe = await swipesRepository.findByStudentAndJob(studentId, jobId);

    if (!swipe) {
      throw swipeNotFoundError();
    }

    const existingMatch = await matchesRepository.findByTriple(
      studentId,
      swipe.company_id,
      jobId
    );
    if (existingMatch) {
      throw matchConflictError('Cannot undo a swipe that already has a match');
    }

    const swipedAtMs = Date.parse(swipe.swiped_at);
    if (Number.isNaN(swipedAtMs)) {
      throw swipeUndoExpiredError();
    }

    const ageMs = Date.now() - swipedAtMs;
    if (ageMs > SWIPE_UNDO_WINDOW_SECONDS * 1000) {
      throw swipeUndoExpiredError();
    }

    await swipesRepository.deleteByStudentAndJob(studentId, jobId);
    return { deleted: true };
  },

  async listMine(_studentId: string): Promise<SwipeDto[]> {
    throw swipeNotImplementedError();
  },

  async listInbound(companyUserId: string): Promise<InboundSwipeDto[]> {
    const company = await companiesRepository.findByUserId(companyUserId);

    if (!company) {
      throw companyNotFoundError();
    }

    const swipes = (await swipesRepository.listByCompany(company.id)).filter(
      (swipe) => swipe.direction === 'right'
    );

    if (swipes.length === 0) {
      return [];
    }

    const [students, jobs] = await Promise.all([
      studentsRepository.findByIds(swipes.map((swipe) => swipe.student_id)),
      jobsRepository.findByIds(swipes.map((swipe) => swipe.job_id))
    ]);

    const studentById = new Map(students.map((student) => [student.id, student]));
    const jobById = new Map(jobs.map((job) => [job.id, job]));

    const cards: InboundSwipeDto[] = [];

    for (const swipe of swipes) {
      const student = studentById.get(swipe.student_id);
      const job = jobById.get(swipe.job_id);

      if (!student || !job) {
        continue;
      }

      cards.push(toInboundSwipeDto(swipe, student, job));
    }

    return cards;
  }
};
