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

jest.mock('../database/companies.repository', () => ({
  companiesRepository: {
    findByUserId: jest.fn(),
    findById: jest.fn(),
    findByIds: jest.fn()
  }
}));

jest.mock('../database/jobs.repository', () => ({
  jobsRepository: {
    create: jest.fn(),
    findById: jest.fn(),
    listByCompany: jest.fn(),
    update: jest.fn(),
    deleteById: jest.fn(),
    listOpenFiltered: jest.fn()
  }
}));

jest.mock('../database/savedJobs.repository', () => ({
  savedJobsRepository: {
    listByStudent: jest.fn(),
    exists: jest.fn()
  }
}));

import app from '../app';
import { companiesRepository } from '../database/companies.repository';
import { jobsRepository } from '../database/jobs.repository';
import { AUTH_ERROR_CODES, Role } from '../modules/auth';
import { JOB_ERROR_CODES } from '../modules/jobs';

const companyUserId = '550e8400-e29b-41d4-a716-446655440099';
const otherCompanyId = '550e8400-e29b-41d4-a716-446655440088';
const jobId = '550e8400-e29b-41d4-a716-446655440001';

jest.mock('../middleware/authenticate', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    const role = req.get('x-test-role');

    if (!role) {
      const { UnauthorizedError } = require('../utils/AppError');
      return next(new UnauthorizedError(AUTH_ERROR_CODES.MISSING_TOKEN, 'Missing token'));
    }

    req.user = {
      id: companyUserId,
      sessionId: 'session-1',
      role,
      email: 'company@example.com',
      emailVerified: true,
      status: 'active'
    };

    next();
  }
}));

const approvedCompany = {
  id: companyUserId,
  company_name: 'Acme',
  website: 'https://acme.example',
  industry: 'Tech',
  description: null,
  logo_url: null,
  verification_status: 'approved' as const,
  verified_at: '2026-07-17T00:00:00.000Z',
  created_at: '2026-07-17T00:00:00.000Z',
  updated_at: '2026-07-17T00:00:00.000Z'
};

const validBody = {
  title: 'Software Intern',
  description: 'Build features for the KU placement platform with mentorship.',
  location: 'Dhulikhel',
  job_type: 'internship' as const,
  min_cgpa: 3.0
};

const draftJob = {
  id: jobId,
  company_id: companyUserId,
  title: validBody.title,
  description: validBody.description,
  location: validBody.location,
  job_type: validBody.job_type,
  min_cgpa: validBody.min_cgpa,
  status: 'draft' as const,
  created_at: '2026-07-17T10:00:00.000Z',
  updated_at: '2026-07-17T10:00:00.000Z'
};

const openJob = { ...draftJob, status: 'open' as const, updated_at: '2026-07-17T11:00:00.000Z' };
const closedJob = { ...openJob, status: 'closed' as const, updated_at: '2026-07-17T12:00:00.000Z' };
const foreignJob = { ...draftJob, id: '550e8400-e29b-41d4-a716-446655440077', company_id: otherCompanyId };

describe('Phase 6 Milestone B2 - company job CRUD', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (companiesRepository.findByUserId as jest.Mock).mockResolvedValue(approvedCompany);
  });

  it('POST /jobs creates draft for approved company', async () => {
    (jobsRepository.create as jest.Mock).mockResolvedValue(draftJob);

    const res = await request(app).post('/api/v1/jobs').set('x-test-role', Role.COMPANY).send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('draft');
    expect(res.body.data.title).toBe(validBody.title);
    expect(jobsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: companyUserId,
        title: validBody.title,
        status: 'draft'
      })
    );
  });

  it('POST /jobs pending company -> 403 PENDING_VERIFICATION', async () => {
    (companiesRepository.findByUserId as jest.Mock).mockResolvedValue({
      ...approvedCompany,
      verification_status: 'pending',
      verified_at: null
    });

    const res = await request(app).post('/api/v1/jobs').set('x-test-role', Role.COMPANY).send(validBody);

    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.PENDING_VERIFICATION);
    expect(jobsRepository.create).not.toHaveBeenCalled();
  });

  it('GET /jobs/me lists only own company jobs', async () => {
    (jobsRepository.listByCompany as jest.Mock).mockResolvedValue([draftJob, openJob]);

    const res = await request(app).get('/api/v1/jobs/me').set('x-test-role', Role.COMPANY);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(jobsRepository.listByCompany).toHaveBeenCalledWith(companyUserId);
  });

  it('GET /jobs/me/:id returns own job', async () => {
    (jobsRepository.findById as jest.Mock).mockResolvedValue(draftJob);

    const res = await request(app).get(`/api/v1/jobs/me/${jobId}`).set('x-test-role', Role.COMPANY);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(jobId);
  });

  it('GET /jobs/me/:id foreign job -> 403 JOB_FORBIDDEN', async () => {
    (jobsRepository.findById as jest.Mock).mockResolvedValue(foreignJob);

    const res = await request(app)
      .get(`/api/v1/jobs/me/${foreignJob.id}`)
      .set('x-test-role', Role.COMPANY);

    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe(JOB_ERROR_CODES.JOB_FORBIDDEN);
  });

  it('PATCH /jobs/me/:id updates fields without changing status', async () => {
    (jobsRepository.findById as jest.Mock).mockResolvedValue(draftJob);
    (jobsRepository.update as jest.Mock).mockResolvedValue({
      ...draftJob,
      title: 'Updated Intern Title'
    });

    const res = await request(app)
      .patch(`/api/v1/jobs/me/${jobId}`)
      .set('x-test-role', Role.COMPANY)
      .send({ title: 'Updated Intern Title' });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated Intern Title');
    expect(jobsRepository.update).toHaveBeenCalledWith(
      jobId,
      expect.objectContaining({ title: 'Updated Intern Title' })
    );
    expect(jobsRepository.update).toHaveBeenCalledWith(
      jobId,
      expect.not.objectContaining({ status: expect.anything() })
    );
  });

  it('POST /jobs/me/:id/publish draft → open', async () => {
    (jobsRepository.findById as jest.Mock).mockResolvedValue(draftJob);
    (jobsRepository.update as jest.Mock).mockResolvedValue(openJob);

    const res = await request(app)
      .post(`/api/v1/jobs/me/${jobId}/publish`)
      .set('x-test-role', Role.COMPANY);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('open');
    expect(jobsRepository.update).toHaveBeenCalledWith(jobId, { status: 'open' });
  });

  it('POST /jobs/me/:id/publish when already open -> 409 INVALID_JOB_TRANSITION', async () => {
    (jobsRepository.findById as jest.Mock).mockResolvedValue(openJob);

    const res = await request(app)
      .post(`/api/v1/jobs/me/${jobId}/publish`)
      .set('x-test-role', Role.COMPANY);

    expect(res.status).toBe(409);
    expect(res.body?.error?.code).toBe(JOB_ERROR_CODES.INVALID_JOB_TRANSITION);
  });

  it('POST /jobs/me/:id/close open → closed', async () => {
    (jobsRepository.findById as jest.Mock).mockResolvedValue(openJob);
    (jobsRepository.update as jest.Mock).mockResolvedValue(closedJob);

    const res = await request(app)
      .post(`/api/v1/jobs/me/${jobId}/close`)
      .set('x-test-role', Role.COMPANY);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('closed');
  });

  it('POST /jobs/me/:id/close when draft -> 409', async () => {
    (jobsRepository.findById as jest.Mock).mockResolvedValue(draftJob);

    const res = await request(app)
      .post(`/api/v1/jobs/me/${jobId}/close`)
      .set('x-test-role', Role.COMPANY);

    expect(res.status).toBe(409);
    expect(res.body?.error?.code).toBe(JOB_ERROR_CODES.INVALID_JOB_TRANSITION);
  });

  it('DELETE /jobs/me/:id removes owned job', async () => {
    (jobsRepository.findById as jest.Mock).mockResolvedValue(draftJob);
    (jobsRepository.deleteById as jest.Mock).mockResolvedValue(undefined);

    const res = await request(app).delete(`/api/v1/jobs/me/${jobId}`).set('x-test-role', Role.COMPANY);

    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(true);
    expect(jobsRepository.deleteById).toHaveBeenCalledWith(jobId);
  });

  it('DELETE /jobs/me/:id foreign job -> 403', async () => {
    (jobsRepository.findById as jest.Mock).mockResolvedValue(foreignJob);

    const res = await request(app)
      .delete(`/api/v1/jobs/me/${foreignJob.id}`)
      .set('x-test-role', Role.COMPANY);

    expect(res.status).toBe(403);
    expect(jobsRepository.deleteById).not.toHaveBeenCalled();
  });

  it('STUDENT cannot POST /jobs', async () => {
    const res = await request(app).post('/api/v1/jobs').set('x-test-role', Role.STUDENT).send(validBody);

    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.INSUFFICIENT_ROLE);
  });
});
