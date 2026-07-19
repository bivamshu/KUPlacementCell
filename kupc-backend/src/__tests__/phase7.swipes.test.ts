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
    listOpenFiltered: jest.fn()
  }
}));

jest.mock('../database/companies.repository', () => ({
  companiesRepository: {
    findById: jest.fn(),
    findByIds: jest.fn(),
    findByUserId: jest.fn()
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
    create: jest.fn(),
    findByStudentAndJob: jest.fn(),
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
import { SWIPE_ERROR_CODES } from '../modules/swipes';

const studentId = '550e8400-e29b-41d4-a716-446655440010';
const companyId = '550e8400-e29b-41d4-a716-446655440002';
const jobId = '550e8400-e29b-41d4-a716-446655440001';

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

const approvedCompany = {
  id: companyId,
  company_name: 'Approved Co',
  website: 'https://approved.example',
  verification_status: 'approved' as const,
  verified_at: '2026-07-01T00:00:00.000Z',
  industry: 'Software',
  description: 'Verified employer',
  logo_url: null,
  created_at: '2026-07-01T00:00:00.000Z',
  updated_at: '2026-07-01T00:00:00.000Z'
};

const swipeRow = {
  id: '550e8400-e29b-41d4-a716-446655440099',
  student_id: studentId,
  company_id: companyId,
  job_id: jobId,
  direction: 'right' as const,
  swiped_at: '2026-07-18T12:00:00.000Z'
};

describe('Phase 7 Milestone B2 - record swipe + feed exclusion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (savedJobsRepository.listByStudent as jest.Mock).mockResolvedValue([]);
    (swipesRepository.listJobIdsByStudent as jest.Mock).mockResolvedValue([]);
    (swipesRepository.findByStudentAndJob as jest.Mock).mockResolvedValue(null);
  });

  it('POST /swipes records right swipe on open approved job -> 201', async () => {
    (jobsRepository.findById as jest.Mock).mockResolvedValue(openJob);
    (companiesRepository.findById as jest.Mock).mockResolvedValue(approvedCompany);
    (swipesRepository.create as jest.Mock).mockResolvedValue(swipeRow);

    const res = await request(app)
      .post('/api/v1/swipes')
      .set('x-test-role', Role.STUDENT)
      .send({ job_id: jobId, direction: 'right' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      job_id: jobId,
      student_id: studentId,
      company_id: companyId,
      direction: 'right'
    });
    expect(swipesRepository.create).toHaveBeenCalledWith({
      studentId,
      companyId,
      jobId,
      direction: 'right'
    });
  });

  it('POST /swipes on draft job -> 409 SWIPE_JOB_NOT_OPEN', async () => {
    (jobsRepository.findById as jest.Mock).mockResolvedValue({ ...openJob, status: 'draft' });

    const res = await request(app)
      .post('/api/v1/swipes')
      .set('x-test-role', Role.STUDENT)
      .send({ job_id: jobId, direction: 'left' });

    expect(res.status).toBe(409);
    expect(res.body?.error?.code).toBe(SWIPE_ERROR_CODES.SWIPE_JOB_NOT_OPEN);
    expect(swipesRepository.create).not.toHaveBeenCalled();
  });

  it('POST /swipes on missing job -> 404 JOB_NOT_FOUND', async () => {
    (jobsRepository.findById as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/swipes')
      .set('x-test-role', Role.STUDENT)
      .send({ job_id: jobId, direction: 'right' });

    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe(JOB_ERROR_CODES.JOB_NOT_FOUND);
  });

  it('POST /swipes duplicate -> 409 SWIPE_CONFLICT', async () => {
    (jobsRepository.findById as jest.Mock).mockResolvedValue(openJob);
    (companiesRepository.findById as jest.Mock).mockResolvedValue(approvedCompany);
    (swipesRepository.findByStudentAndJob as jest.Mock).mockResolvedValue(swipeRow);

    const res = await request(app)
      .post('/api/v1/swipes')
      .set('x-test-role', Role.STUDENT)
      .send({ job_id: jobId, direction: 'right' });

    expect(res.status).toBe(409);
    expect(res.body?.error?.code).toBe(SWIPE_ERROR_CODES.SWIPE_CONFLICT);
    expect(swipesRepository.create).not.toHaveBeenCalled();
  });

  it('GET /jobs as STUDENT passes excludeJobIds from swipes', async () => {
    (swipesRepository.listJobIdsByStudent as jest.Mock).mockResolvedValue([jobId]);
    (jobsRepository.listOpenFiltered as jest.Mock).mockResolvedValue([]);
    (companiesRepository.findByIds as jest.Mock).mockResolvedValue([]);

    const res = await request(app).get('/api/v1/jobs').set('x-test-role', Role.STUDENT);

    expect(res.status).toBe(200);
    expect(swipesRepository.listJobIdsByStudent).toHaveBeenCalledWith(studentId);
    expect(jobsRepository.listOpenFiltered).toHaveBeenCalledWith(
      expect.objectContaining({ excludeJobIds: [jobId] })
    );
  });

  it('GET /jobs as COMPANY does not load swipe exclusions', async () => {
    (jobsRepository.listOpenFiltered as jest.Mock).mockResolvedValue([openJob]);
    (companiesRepository.findByIds as jest.Mock).mockResolvedValue([approvedCompany]);

    const res = await request(app).get('/api/v1/jobs').set('x-test-role', Role.COMPANY);

    expect(res.status).toBe(200);
    expect(swipesRepository.listJobIdsByStudent).not.toHaveBeenCalled();
    expect(jobsRepository.listOpenFiltered).toHaveBeenCalledWith(
      expect.objectContaining({ excludeJobIds: [] })
    );
  });
});
