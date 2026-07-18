import { companiesRepository } from '../../database/companies.repository';
import { jobsRepository } from '../../database/jobs.repository';
import type { MatchRecord } from '../../database/matches.repository';
import { matchesRepository } from '../../database/matches.repository';
import { studentsRepository } from '../../database/students.repository';
import { swipesRepository } from '../../database/swipes.repository';
import { Role } from '../auth';
import { companyNotFoundError } from '../companies/companies.errors';
import { jobNotFoundError } from '../jobs/jobs.errors';
import { matchForbiddenError } from './matches.errors';
import {
  toMatchCompanyCard,
  toMatchDto,
  toMatchJobCard,
  toMatchStudentCard
} from './matches.mapper';
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

async function hydrateMatches(
  matches: MatchRecord[],
  viewerRole: Role
): Promise<MatchDto[]> {
  if (matches.length === 0) {
    return [];
  }

  const [jobs, students, companies] = await Promise.all([
    jobsRepository.findByIds(matches.map((match) => match.job_id)),
    viewerRole === Role.COMPANY
      ? studentsRepository.findByIds(matches.map((match) => match.student_id))
      : Promise.resolve([]),
    viewerRole === Role.STUDENT
      ? companiesRepository.findByIds(matches.map((match) => match.company_id))
      : Promise.resolve([])
  ]);

  const jobById = new Map(jobs.map((job) => [job.id, job]));
  const studentById = new Map(students.map((student) => [student.id, student]));
  const companyById = new Map(companies.map((company) => [company.id, company]));

  const cards: MatchDto[] = [];

  for (const match of matches) {
    const job = jobById.get(match.job_id);
    if (!job) {
      continue;
    }

    if (viewerRole === Role.STUDENT) {
      const company = companyById.get(match.company_id);
      cards.push(
        toMatchDto(match, {
          job: toMatchJobCard(job),
          ...(company ? { company: toMatchCompanyCard(company) } : {})
        })
      );
      continue;
    }

    const student = studentById.get(match.student_id);
    cards.push(
      toMatchDto(match, {
        job: toMatchJobCard(job),
        ...(student ? { student: toMatchStudentCard(student) } : {})
      })
    );
  }

  return cards;
}

/**
 * Phase 7 B4–B5 — match create + role-aware list with nested cards.
 * Conversations deferred to Phase 8.
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

  async listMine(viewer: MatchViewer): Promise<MatchDto[]> {
    if (viewer.role === Role.STUDENT) {
      const matches = await matchesRepository.listByStudent(viewer.id);
      return hydrateMatches(matches, Role.STUDENT);
    }

    if (viewer.role === Role.COMPANY) {
      const company = await companiesRepository.findByUserId(viewer.id);

      if (!company) {
        throw companyNotFoundError();
      }

      const matches = await matchesRepository.listByCompany(company.id);
      return hydrateMatches(matches, Role.COMPANY);
    }

    return [];
  }
};
