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
    findByUserId: jest.fn()
  }
}));

jest.mock('../database/jobs.repository', () => ({
  jobsRepository: {
    create: jest.fn()
  }
}));

import app from '../app';
import { companiesRepository } from '../database/companies.repository';
import { jobsRepository } from '../database/jobs.repository';
import { AUTH_ERROR_CODES, Role } from '../modules/auth';

jest.mock('../middleware/authenticate', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    const role = req.get('x-test-role');

    if (!role) {
      const { UnauthorizedError } = require('../utils/AppError');
      return next(new UnauthorizedError(AUTH_ERROR_CODES.MISSING_TOKEN, 'Missing token'));
    }

    req.user = {
      id: 'company-user-id',
      sessionId: 'test-session-id',
      role,
      email: 'company@example.com',
      emailVerified: true,
      status: 'active'
    };

    next();
  }
}));

const validBody = {
  title: 'Software Intern',
  description: 'Build features for the KU placement platform with mentorship.',
  job_type: 'internship'
};

describe('Milestone 7 - POST /api/v1/jobs pending company gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Pending company -> 403 PENDING_VERIFICATION', async () => {
    (companiesRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'company-user-id',
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

    const res = await request(app).post('/api/v1/jobs').set('x-test-role', Role.COMPANY).send(validBody);

    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.PENDING_VERIFICATION);
  });

  it('Approved company with valid body -> 201 draft (Phase 6 B2)', async () => {
    (companiesRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'company-user-id',
      company_name: 'Acme',
      website: 'https://acme.example',
      industry: null,
      description: null,
      logo_url: null,
      verification_status: 'approved',
      verified_at: new Date().toISOString(),
      created_at: '2026-07-17T00:00:00.000Z',
      updated_at: '2026-07-17T00:00:00.000Z'
    });
    (jobsRepository.create as jest.Mock).mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440001',
      company_id: 'company-user-id',
      title: validBody.title,
      description: validBody.description,
      location: null,
      job_type: 'internship',
      min_cgpa: null,
      status: 'draft',
      created_at: '2026-07-17T10:00:00.000Z',
      updated_at: '2026-07-17T10:00:00.000Z'
    });

    const res = await request(app).post('/api/v1/jobs').set('x-test-role', Role.COMPANY).send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('draft');
    expect(res.body?.data?.job_id).not.toBe('placeholder-job-id');
  });

  it('Student token -> 403 INSUFFICIENT_ROLE', async () => {
    const res = await request(app).post('/api/v1/jobs').set('x-test-role', Role.STUDENT).send(validBody);

    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.INSUFFICIENT_ROLE);
  });
});
