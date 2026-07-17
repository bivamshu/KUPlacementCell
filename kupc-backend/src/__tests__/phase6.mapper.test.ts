import type { CompanyRecord } from '../database/companies.repository';
import type { JobRecord } from '../database/jobs.repository';
import {
  toCreateJobServiceInput,
  toJobDto,
  toJobFeedCardDto,
  toUpdateJobServiceInput
} from '../modules/jobs/jobs.mapper';

const job: JobRecord = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  company_id: '550e8400-e29b-41d4-a716-446655440002',
  title: 'Backend Engineer',
  description: 'Ship APIs for the placement cell.',
  location: 'Kathmandu',
  job_type: 'full_time',
  min_cgpa: 3.2,
  status: 'open',
  created_at: '2026-07-17T10:00:00.000Z',
  updated_at: '2026-07-17T11:00:00.000Z'
};

const company: CompanyRecord = {
  id: '550e8400-e29b-41d4-a716-446655440002',
  company_name: 'Acme Nepal',
  website: 'https://acme.example',
  industry: 'Software',
  description: 'Building tools.',
  logo_url: 'https://cdn.example/logo.png',
  verification_status: 'approved',
  verified_at: '2026-07-10T00:00:00.000Z',
  created_at: '2026-07-01T00:00:00.000Z',
  updated_at: '2026-07-10T00:00:00.000Z'
};

describe('Phase 6 Milestone B1 - jobs mapper', () => {
  it('toJobDto maps snake_case JobDto fields', () => {
    expect(toJobDto(job)).toEqual({
      id: job.id,
      company_id: job.company_id,
      title: job.title,
      description: job.description,
      location: job.location,
      job_type: job.job_type,
      min_cgpa: 3.2,
      status: job.status,
      created_at: job.created_at,
      updated_at: job.updated_at
    });
  });

  it('toJobFeedCardDto nests company summary and is_saved', () => {
    const card = toJobFeedCardDto(job, company, true);
    expect(card.company).toEqual({
      id: company.id,
      company_name: company.company_name,
      logo_url: company.logo_url,
      industry: company.industry,
      website: company.website
    });
    expect(card.is_saved).toBe(true);
    expect(card.title).toBe(job.title);
  });

  it('toCreateJobServiceInput maps snake_case body → camelCase', () => {
    expect(
      toCreateJobServiceInput({
        title: 'Intern',
        description: 'A description that is long enough here.',
        location: 'Dhulikhel',
        job_type: 'internship',
        min_cgpa: 3
      })
    ).toEqual({
      title: 'Intern',
      description: 'A description that is long enough here.',
      location: 'Dhulikhel',
      jobType: 'internship',
      minCgpa: 3
    });
  });

  it('toUpdateJobServiceInput omits unset fields', () => {
    expect(toUpdateJobServiceInput({ title: 'Updated title only' })).toEqual({
      title: 'Updated title only'
    });
  });
});
