import request from 'supertest';

jest.mock('../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 5000,
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    JWT_SECRET: 'x'.repeat(32),
    JWT_EXPIRES_IN: '15m',
    REFRESH_EXPIRES_IN: '30d',
    OTP_LENGTH: 6,
    OTP_EXPIRES_IN: '10m',
    OTP_MAX_ATTEMPTS: 5,
    KU_EMAIL_DOMAIN: 'ku.edu.np',
    AUTH_USER_CACHE_TTL_SECONDS: 30,
    ADMIN_PASSWORD_LOGIN_ENABLED: true,
    RESUME_MAX_BYTES: 5_242_880,
    RESUME_STORAGE_BUCKET: 'resumes',
    PROFILE_IMAGE_MAX_BYTES: 2_097_152,
    AVATAR_STORAGE_BUCKET: 'avatars',
    COMPANY_LOGO_STORAGE_BUCKET: 'company-logos'
  }
}));

jest.mock('../database/jobs.repository', () => ({
  jobsRepository: {
    findById: jest.fn(),
    findByIds: jest.fn(),
    listOpenFiltered: jest.fn()
  }
}));

jest.mock('../database/companies.repository', () => ({
  companiesRepository: {
    findByUserId: jest.fn(),
    findById: jest.fn(),
    findByIds: jest.fn()
  }
}));

jest.mock('../database/savedJobs.repository', () => ({
  savedJobsRepository: {
    save: jest.fn(),
    unsave: jest.fn(),
    listByStudent: jest.fn(),
    exists: jest.fn()
  }
}));

import app from '../app';
import { companiesRepository } from '../database/companies.repository';
import { jobsRepository } from '../database/jobs.repository';
import { savedJobsRepository } from '../database/savedJobs.repository';
import { AUTH_ERROR_CODES, Role } from '../modules/auth';
import { JOB_ERROR_CODES } from '../modules/jobs';

const studentId = '550e8400-e29b-41d4-a716-446655440010';
const companyId = '550e8400-e29b-41d4-a716-446655440002';
const jobId = '550e8400-e29b-41d4-a716-446655440001';
const draftId = '550e8400-e29b-41d4-a716-446655440099';

jest.mock('../middleware/authenticate', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    const role = req.get('x-test-role');

    if (!role) {
      const { UnauthorizedError } = require('../utils/AppError');
      return next(new UnauthorizedError(AUTH_ERROR_CODES.MISSING_TOKEN, 'Missing token'));
    }

    req.user = {
      id: studentId,
      sessionId: 'session-1',
      role,
      email: role === Role.STUDENT ? 'student@ku.edu.np' : 'company@example.com',
      emailVerified: true,
      status: 'active'
    };

    next();
  }
}));

const approvedCompany = {
  id: companyId,
  company_name: 'Acme Nepal',
  website: 'https://acme.example',
  industry: 'Software',
  description: null,
  logo_url: 'https://cdn.example/logo.png',
  verification_status: 'approved' as const,
  verified_at: '2026-07-10T00:00:00.000Z',
  created_at: '2026-07-01T00:00:00.000Z',
  updated_at: '2026-07-10T00:00:00.000Z'
};

const openJob = {
  id: jobId,
  company_id: companyId,
  title: 'Backend Intern',
  description: 'Ship APIs for the placement cell with mentorship.',
  location: 'Dhulikhel',
  job_type: 'internship' as const,
  min_cgpa: 3.0,
  status: 'open' as const,
  created_at: '2026-07-17T10:00:00.000Z',
  updated_at: '2026-07-17T11:00:00.000Z'
};

const draftJob = { ...openJob, id: draftId, status: 'draft' as const, title: 'Secret Draft' };
const closedJob = { ...openJob, id: '550e8400-e29b-41d4-a716-446655440088', status: 'closed' as const };

describe('Phase 6 Milestone B4 - saved jobs API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /jobs/:id/save bookmarks an open job', async () => {
    (jobsRepository.findById as jest.Mock).mockResolvedValue(openJob);
    (companiesRepository.findById as jest.Mock).mockResolvedValue(approvedCompany);
    (savedJobsRepository.save as jest.Mock).mockResolvedValue({
      student_id: studentId,
      job_id: jobId,
      saved_at: '2026-07-17T12:00:00.000Z'
    });

    const res = await request(app).post(`/api/v1/jobs/${jobId}/save`).set('x-test-role', Role.STUDENT);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ saved: true });
    expect(savedJobsRepository.save).toHaveBeenCalledWith(studentId, jobId);
  });

  it('POST /jobs/:id/save draft -> 404 JOB_NOT_FOUND', async () => {
    (jobsRepository.findById as jest.Mock).mockResolvedValue(draftJob);

    const res = await request(app).post(`/api/v1/jobs/${draftId}/save`).set('x-test-role', Role.STUDENT);

    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe(JOB_ERROR_CODES.JOB_NOT_FOUND);
    expect(savedJobsRepository.save).not.toHaveBeenCalled();
  });

  it('POST /jobs/:id/save as COMPANY -> 403', async () => {
    const res = await request(app).post(`/api/v1/jobs/${jobId}/save`).set('x-test-role', Role.COMPANY);

    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.INSUFFICIENT_ROLE);
  });

  it('DELETE /jobs/:id/save is idempotent', async () => {
    (savedJobsRepository.unsave as jest.Mock).mockResolvedValue(undefined);

    const res = await request(app).delete(`/api/v1/jobs/${jobId}/save`).set('x-test-role', Role.STUDENT);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ saved: false });
    expect(savedJobsRepository.unsave).toHaveBeenCalledWith(studentId, jobId);
  });

  it('GET /jobs/saved returns hydrated open cards in save order', async () => {
    const secondJob = {
      ...openJob,
      id: '550e8400-e29b-41d4-a716-446655440055',
      title: 'Frontend Intern'
    };

    (savedJobsRepository.listByStudent as jest.Mock).mockResolvedValue([
      { student_id: studentId, job_id: secondJob.id, saved_at: '2026-07-17T13:00:00.000Z' },
      { student_id: studentId, job_id: jobId, saved_at: '2026-07-17T12:00:00.000Z' },
      { student_id: studentId, job_id: closedJob.id, saved_at: '2026-07-17T11:00:00.000Z' }
    ]);
    (jobsRepository.findByIds as jest.Mock).mockResolvedValue([secondJob, openJob, closedJob]);
    (companiesRepository.findByIds as jest.Mock).mockResolvedValue([approvedCompany]);

    const res = await request(app).get('/api/v1/jobs/saved').set('x-test-role', Role.STUDENT);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].id).toBe(secondJob.id);
    expect(res.body.data[0].is_saved).toBe(true);
    expect(res.body.data[0].company.company_name).toBe('Acme Nepal');
    expect(res.body.data[1].id).toBe(jobId);
  });

  it('GET /jobs/saved as COMPANY -> 403', async () => {
    const res = await request(app).get('/api/v1/jobs/saved').set('x-test-role', Role.COMPANY);

    expect(res.status).toBe(403);
  });

  it('GET /jobs/saved without token -> 401', async () => {
    const res = await request(app).get('/api/v1/jobs/saved');

    expect(res.status).toBe(401);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.MISSING_TOKEN);
  });
});
