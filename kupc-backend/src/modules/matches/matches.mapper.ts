import type { MatchRecord } from '../../database/matches.repository';
import type { CreateMatchBody } from './matches.validation';
import type { CreateMatchServiceInput, MatchDto } from './matches.types';

export function toMatchDto(match: MatchRecord): MatchDto {
  return {
    id: match.id,
    student_id: match.student_id,
    company_id: match.company_id,
    job_id: match.job_id,
    matched_at: match.matched_at
  };
}

export function toCreateMatchServiceInput(body: CreateMatchBody): CreateMatchServiceInput {
  return {
    jobId: body.job_id,
    studentId: body.student_id
  };
}
