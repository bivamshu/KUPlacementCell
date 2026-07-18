import type { CompanyRecord } from '../../database/companies.repository';
import type { JobRecord } from '../../database/jobs.repository';
import type { MatchRecord } from '../../database/matches.repository';
import type { StudentRecord } from '../../database/students.repository';
import type { CreateMatchBody } from './matches.validation';
import type { CreateMatchServiceInput, MatchDto } from './matches.types';

export function toMatchJobCard(job: JobRecord): NonNullable<MatchDto['job']> {
  return {
    id: job.id,
    title: job.title,
    status: job.status
  };
}

export function toMatchStudentCard(student: StudentRecord): NonNullable<MatchDto['student']> {
  return {
    id: student.id,
    full_name: student.full_name,
    avatar_url: student.profile_picture_url
  };
}

export function toMatchCompanyCard(company: CompanyRecord): NonNullable<MatchDto['company']> {
  return {
    id: company.id,
    company_name: company.company_name,
    logo_url: company.logo_url
  };
}

export function toMatchDto(
  match: MatchRecord,
  nested?: {
    job?: MatchDto['job'];
    student?: MatchDto['student'];
    company?: MatchDto['company'];
  }
): MatchDto {
  return {
    id: match.id,
    student_id: match.student_id,
    company_id: match.company_id,
    job_id: match.job_id,
    matched_at: match.matched_at,
    ...(nested?.job ? { job: nested.job } : {}),
    ...(nested?.student ? { student: nested.student } : {}),
    ...(nested?.company ? { company: nested.company } : {})
  };
}

export function toCreateMatchServiceInput(body: CreateMatchBody): CreateMatchServiceInput {
  return {
    jobId: body.job_id,
    studentId: body.student_id
  };
}
