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
    listOpenFiltered: jest.fn(),
    findById: jest.fn()
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
    listByStudent: jest.fn(),
    exists: jest.fn()
  }
}));

jest.mock('../database/swipes.repository', () => ({
  swipesRepository: {
    listJobIdsByStudent: jest.fn()
  }
}));

import app from '../app';
import { companiesRepository } from '../database/companies.repository';
import { jobsRepository } from '../database/jobs.repository';
import { savedJobsRepository } from '../database/savedJobs.repository';
import { swipesRepository } from '../database/swipes.repository';
import { AUTH_ERROR_CODES, Role } from '../modules/auth';
import { JOB_ERROR_CODES } from '../modules/jobs';

jest.mock('../middleware/authenticate', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    const role = req.get('x-test-role');

    if (!role) {
      const { UnauthorizedError } = require('../utils/AppError');
      return next(new UnauthorizedError(AUTH_ERROR_CODES.MISSING_TOKEN, 'Missing token'));
    }

    req.user = {
      id: '550e8400-e29b-41d4-a716-446655440010',
      sessionId: 'session-1',
      role,
      email: 'student@ku.edu.np',
      emailVerified: true,
      status: 'active'
    };

    next();
  }
}));

const companyId = '550e8400-e29b-41d4-a716-446655440002';
const jobId = '550e8400-e29b-41d4-a716-446655440001';
const draftId = '550e8400-e29b-41d4-a716-446655440099';

const approvedCompany = {
  id: companyId,
  company_name: 'Acme Nepal',
  website: 'https://acme.example',
  industry: 'Software',
  description: 'Building tools.',
  logo_url: 'https://cdn.example/logo.png',
  verification_status: 'approved' as const,
  verified_at: '2026-07-10T00:00:00.000Z',
  created_at: '2026-07-01T00:00:00.000Z',
  updated_at: '2026-07-10T00:00:00.000Z'
};

const pendingCompany = {
  ...approvedCompany,
  id: '550e8400-e29b-41d4-a716-446655440003',
  company_name: 'Pending Co',
  verification_status: 'pending' as const,
  verified_at: null
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

const draftJob = {
  ...openJob,
  id: draftId,
  status: 'draft' as const,
  title: 'Secret Draft'
};

const pendingCompanyJob = {
  ...openJob,
  id: '550e8400-e29b-41d4-a716-446655440088',
  company_id: pendingCompany.id,
  title: 'Hidden Pending Role'
};

describe('Phase 6 Milestone B3 - student discovery feed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (savedJobsRepository.listByStudent as jest.Mock).mockResolvedValue([]);
    (savedJobsRepository.exists as jest.Mock).mockResolvedValue(false);
    (swipesRepository.listJobIdsByStudent as jest.Mock).mockResolvedValue([]);
  });

  it('GET /jobs without token -> 401', async () => {
    const res = await request(app).get('/api/v1/jobs');
    expect(res.status).toBe(401);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.MISSING_TOKEN);
  });

  it('GET /jobs returns only open jobs from approved companies', async () => {
    (jobsRepository.listOpenFiltered as jest.Mock).mockResolvedValue([openJob, pendingCompanyJob]);
    (companiesRepository.findByIds as jest.Mock).mockResolvedValue([approvedCompany, pendingCompany]);

    const res = await request(app).get('/api/v1/jobs').set('x-test-role', Role.STUDENT);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(jobId);
    expect(res.body.data[0].company.company_name).toBe('Acme Nepal');
    expect(res.body.data[0].is_saved).toBe(false);
  });

  it('GET /jobs applies default limit/offset when query string is empty', async () => {
    (jobsRepository.listOpenFiltered as jest.Mock).mockResolvedValue([]);
    (companiesRepository.findByIds as jest.Mock).mockResolvedValue([]);

    const res = await request(app).get('/api/v1/jobs').set('x-test-role', Role.STUDENT);

    expect(res.status).toBe(200);
    expect(jobsRepository.listOpenFiltered).toHaveBeenCalledWith({
      q: undefined,
      jobType: undefined,
      location: undefined,
      minCgpa: undefined,
      excludeJobIds: [],
      limit: 20,
      offset: 0
    });
  });

  it('GET /jobs passes filters to repository', async () => {
    (jobsRepository.listOpenFiltered as jest.Mock).mockResolvedValue([]);
    (companiesRepository.findByIds as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/v1/jobs')
      .query({ q: 'backend', job_type: 'internship', location: 'Dhulikhel', min_cgpa: 3.2, limit: 10, offset: 5 })
      .set('x-test-role', Role.STUDENT);

    expect(res.status).toBe(200);
    expect(jobsRepository.listOpenFiltered).toHaveBeenCalledWith({
      q: 'backend',
      jobType: 'internship',
      location: 'Dhulikhel',
      minCgpa: 3.2,
      excludeJobIds: [],
      limit: 10,
      offset: 5
    });
  });

  it('GET /jobs marks is_saved for student bookmarks', async () => {
    (jobsRepository.listOpenFiltered as jest.Mock).mockResolvedValue([openJob]);
    (companiesRepository.findByIds as jest.Mock).mockResolvedValue([approvedCompany]);
    (savedJobsRepository.listByStudent as jest.Mock).mockResolvedValue([
      { student_id: '550e8400-e29b-41d4-a716-446655440010', job_id: jobId, saved_at: '2026-07-17T12:00:00.000Z' }
    ]);

    const res = await request(app).get('/api/v1/jobs').set('x-test-role', Role.STUDENT);

    expect(res.status).toBe(200);
    expect(res.body.data[0].is_saved).toBe(true);
  });

  it('GET /jobs as COMPANY does not load saved bookmarks', async () => {
    (jobsRepository.listOpenFiltered as jest.Mock).mockResolvedValue([openJob]);
    (companiesRepository.findByIds as jest.Mock).mockResolvedValue([approvedCompany]);

    const res = await request(app).get('/api/v1/jobs').set('x-test-role', Role.COMPANY);

    expect(res.status).toBe(200);
    expect(savedJobsRepository.listByStudent).not.toHaveBeenCalled();
    expect(res.body.data[0].is_saved).toBe(false);
  });

  it('GET /jobs/:id returns feed card for open approved job', async () => {
    (jobsRepository.findById as jest.Mock).mockResolvedValue(openJob);
    (companiesRepository.findById as jest.Mock).mockResolvedValue(approvedCompany);

    const res = await request(app).get(`/api/v1/jobs/${jobId}`).set('x-test-role', Role.STUDENT);

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Backend Intern');
    expect(res.body.data.company.logo_url).toBe(approvedCompany.logo_url);
  });

  it('GET /jobs/:id for draft -> 404 JOB_NOT_FOUND (no leak)', async () => {
    (jobsRepository.findById as jest.Mock).mockResolvedValue(draftJob);

    const res = await request(app).get(`/api/v1/jobs/${draftId}`).set('x-test-role', Role.STUDENT);

    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe(JOB_ERROR_CODES.JOB_NOT_FOUND);
  });

  it('GET /jobs/:id for pending company -> 404 JOB_NOT_FOUND', async () => {
    (jobsRepository.findById as jest.Mock).mockResolvedValue(pendingCompanyJob);
    (companiesRepository.findById as jest.Mock).mockResolvedValue(pendingCompany);

    const res = await request(app)
      .get(`/api/v1/jobs/${pendingCompanyJob.id}`)
      .set('x-test-role', Role.STUDENT);

    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe(JOB_ERROR_CODES.JOB_NOT_FOUND);
  });

  it('GET /jobs/:id unknown id -> 404', async () => {
    (jobsRepository.findById as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get('/api/v1/jobs/550e8400-e29b-41d4-a716-446655440077')
      .set('x-test-role', Role.STUDENT);

    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe(JOB_ERROR_CODES.JOB_NOT_FOUND);
  });
});
