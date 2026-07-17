import request from 'supertest';
import fs from 'fs';
import path from 'path';

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
    findByUserId: jest.fn()
  }
}));

import app from '../app';
import { companiesRepository } from '../database/companies.repository';
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
      id: '550e8400-e29b-41d4-a716-446655440099',
      sessionId: 'session-1',
      role,
      email: role === Role.STUDENT ? 'student@ku.edu.np' : 'company@example.com',
      emailVerified: true,
      status: 'active'
    };

    next();
  }
}));

const validCreateBody = {
  title: 'Software Intern',
  description: 'Build features for the KU placement platform with mentorship.',
  location: 'Dhulikhel',
  job_type: 'internship',
  min_cgpa: 3.0
};

describe('Phase 6 Milestone B1 - jobs module scaffold', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('module files exist under src/modules/jobs/', () => {
    const dir = path.join(__dirname, '../modules/jobs');
    for (const file of [
      'jobs.constants.ts',
      'jobs.types.ts',
      'jobs.validation.ts',
      'jobs.errors.ts',
      'jobs.mapper.ts',
      'jobs.service.ts',
      'jobs.controller.ts',
      'jobs.routes.ts',
      'index.ts'
    ]) {
      expect(fs.existsSync(path.join(dir, file))).toBe(true);
    }
  });

  it('POST /jobs without token -> 401 MISSING_TOKEN', async () => {
    const res = await request(app).post('/api/v1/jobs').send(validCreateBody);
    expect(res.status).toBe(401);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.MISSING_TOKEN);
  });

  it('POST /jobs as STUDENT -> 403 INSUFFICIENT_ROLE', async () => {
    const res = await request(app)
      .post('/api/v1/jobs')
      .set('x-test-role', Role.STUDENT)
      .send(validCreateBody);
    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.INSUFFICIENT_ROLE);
  });

  it('POST /jobs as pending COMPANY -> 403 PENDING_VERIFICATION', async () => {
    (companiesRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440099',
      company_name: 'Acme',
      website: null,
      industry: null,
      description: null,
      logo_url: null,
      verification_status: 'pending',
      verified_at: null,
      created_at: '2026-07-17T00:00:00.000Z',
      updated_at: '2026-07-17T00:00:00.000Z'
    });

    const res = await request(app)
      .post('/api/v1/jobs')
      .set('x-test-role', Role.COMPANY)
      .send(validCreateBody);

    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.PENDING_VERIFICATION);
  });

  it('POST /jobs as approved COMPANY with valid body -> 501 NOT_IMPLEMENTED (B2 fills CRUD)', async () => {
    (companiesRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440099',
      company_name: 'Acme',
      website: 'https://acme.example',
      industry: 'Tech',
      description: null,
      logo_url: null,
      verification_status: 'approved',
      verified_at: '2026-07-17T00:00:00.000Z',
      created_at: '2026-07-17T00:00:00.000Z',
      updated_at: '2026-07-17T00:00:00.000Z'
    });

    const res = await request(app)
      .post('/api/v1/jobs')
      .set('x-test-role', Role.COMPANY)
      .send(validCreateBody);

    expect(res.status).toBe(501);
    expect(res.body?.error?.code).toBe(JOB_ERROR_CODES.NOT_IMPLEMENTED);
    expect(res.body?.data?.job_id).toBeUndefined();
  });

  it('POST /jobs with empty body -> 400 VALIDATION_ERROR (no placeholder)', async () => {
    (companiesRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440099',
      company_name: 'Acme',
      website: null,
      industry: null,
      description: null,
      logo_url: null,
      verification_status: 'approved',
      verified_at: '2026-07-17T00:00:00.000Z',
      created_at: '2026-07-17T00:00:00.000Z',
      updated_at: '2026-07-17T00:00:00.000Z'
    });

    const res = await request(app).post('/api/v1/jobs').set('x-test-role', Role.COMPANY).send({});

    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
  });

  it('GET /jobs/saved as COMPANY -> 403', async () => {
    const res = await request(app).get('/api/v1/jobs/saved').set('x-test-role', Role.COMPANY);
    expect(res.status).toBe(403);
  });

  it('GET /jobs as STUDENT -> 501 NOT_IMPLEMENTED (B3)', async () => {
    const res = await request(app).get('/api/v1/jobs').set('x-test-role', Role.STUDENT);
    expect(res.status).toBe(501);
    expect(res.body?.error?.code).toBe(JOB_ERROR_CODES.NOT_IMPLEMENTED);
  });
});
