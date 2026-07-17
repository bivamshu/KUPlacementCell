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
    RESUME_STORAGE_BUCKET: 'resumes'
  }
}));

jest.mock('../database/companies.repository', () => ({
  companiesRepository: {
    findByUserId: jest.fn(),
    findById: jest.fn(),
    updateProfile: jest.fn()
  }
}));

import app from '../app';
import { companiesRepository } from '../database/companies.repository';
import { AUTH_ERROR_CODES, Role } from '../modules/auth';
import { COMPANY_ERROR_CODES } from '../modules/companies';

jest.mock('../middleware/authenticate', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    const role = req.get('x-test-role');

    if (!role) {
      const { UnauthorizedError } = require('../utils/AppError');
      return next(new UnauthorizedError(AUTH_ERROR_CODES.MISSING_TOKEN, 'Missing token'));
    }

    req.user = {
      id: '550e8400-e29b-41d4-a716-446655440020',
      sessionId: 'session-1',
      role,
      email: 'company@example.com',
      emailVerified: true,
      status: 'active'
    };

    next();
  }
}));

const companyId = '550e8400-e29b-41d4-a716-446655440020';

const pendingCompany = {
  id: companyId,
  company_name: 'Acme Corp',
  website: 'https://acme.example.com',
  verification_status: 'pending' as const,
  verified_at: null,
  industry: 'Software',
  description: 'We build things',
  logo_url: null,
  created_at: '2026-07-10T10:00:00.000Z',
  updated_at: '2026-07-11T10:00:00.000Z'
};

const approvedCompany = {
  ...pendingCompany,
  verification_status: 'approved' as const,
  verified_at: '2026-07-12T10:00:00.000Z'
};

describe('Phase 5 Milestone B2 - companies profile module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (companiesRepository.findByUserId as jest.Mock).mockResolvedValue(pendingCompany);
    (companiesRepository.findById as jest.Mock).mockResolvedValue(approvedCompany);
    (companiesRepository.updateProfile as jest.Mock).mockImplementation(async (_id, input) => ({
      ...pendingCompany,
      company_name: input.companyName ?? pendingCompany.company_name,
      website: input.website !== undefined ? input.website : pendingCompany.website,
      industry: input.industry !== undefined ? input.industry : pendingCompany.industry,
      description: input.description !== undefined ? input.description : pendingCompany.description,
      updated_at: '2026-07-17T12:00:00.000Z'
    }));
  });

  it('GET /api/v1/companies/me without token -> 401 MISSING_TOKEN', async () => {
    const res = await request(app).get('/api/v1/companies/me');
    expect(res.status).toBe(401);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.MISSING_TOKEN);
  });

  it('GET /api/v1/companies/me as STUDENT -> 403 INSUFFICIENT_ROLE', async () => {
    const res = await request(app).get('/api/v1/companies/me').set('x-test-role', Role.STUDENT);
    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.INSUFFICIENT_ROLE);
  });

  it('GET /api/v1/companies/me as COMPANY shows pending verification state', async () => {
    const res = await request(app).get('/api/v1/companies/me').set('x-test-role', Role.COMPANY);

    expect(res.status).toBe(200);
    expect(res.body?.data).toMatchObject({
      id: companyId,
      company_name: 'Acme Corp',
      verification_status: 'pending',
      verified_at: null
    });
  });

  it('GET /api/v1/companies/me returns 404 COMPANY_NOT_FOUND when row missing', async () => {
    (companiesRepository.findByUserId as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get('/api/v1/companies/me').set('x-test-role', Role.COMPANY);

    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe(COMPANY_ERROR_CODES.COMPANY_NOT_FOUND);
  });

  it('PATCH /api/v1/companies/me updates allowed fields', async () => {
    const res = await request(app)
      .patch('/api/v1/companies/me')
      .set('x-test-role', Role.COMPANY)
      .send({ description: 'Updated description', industry: 'Fintech' });

    expect(res.status).toBe(200);
    expect(companiesRepository.updateProfile).toHaveBeenCalledWith(companyId, {
      description: 'Updated description',
      industry: 'Fintech'
    });
    expect(res.body?.data?.description).toBe('Updated description');
  });

  it('PATCH /api/v1/companies/me cannot change verification_status', async () => {
    const res = await request(app)
      .patch('/api/v1/companies/me')
      .set('x-test-role', Role.COMPANY)
      .send({ verification_status: 'approved', description: 'Sneaky' });

    expect(res.status).toBe(200);
    expect(companiesRepository.updateProfile).toHaveBeenCalledWith(companyId, {
      description: 'Sneaky'
    });
    expect(res.body?.data?.verification_status).toBe('pending');
  });

  it('PATCH /api/v1/companies/me with only verification_status -> 400 (empty after strip)', async () => {
    const res = await request(app)
      .patch('/api/v1/companies/me')
      .set('x-test-role', Role.COMPANY)
      .send({ verification_status: 'approved' });

    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
    expect(companiesRepository.updateProfile).not.toHaveBeenCalled();
  });

  it('PATCH /api/v1/companies/me with invalid website -> 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .patch('/api/v1/companies/me')
      .set('x-test-role', Role.COMPANY)
      .send({ website: 'not-a-url' });

    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
  });

  it('PATCH /api/v1/companies/me as STUDENT -> 403', async () => {
    const res = await request(app)
      .patch('/api/v1/companies/me')
      .set('x-test-role', Role.STUDENT)
      .send({ description: 'Nope' });

    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.INSUFFICIENT_ROLE);
  });

  it('GET /api/v1/companies/:id returns approved company public card', async () => {
    const res = await request(app)
      .get(`/api/v1/companies/${companyId}`)
      .set('x-test-role', Role.STUDENT);

    expect(res.status).toBe(200);
    expect(res.body?.data).toMatchObject({
      id: companyId,
      company_name: 'Acme Corp',
      industry: 'Software'
    });
    expect(res.body?.data).not.toHaveProperty('verification_status');
    expect(res.body?.data).not.toHaveProperty('verified_at');
  });

  it('GET /api/v1/companies/:id for pending company -> 404 (no existence leak)', async () => {
    (companiesRepository.findById as jest.Mock).mockResolvedValue(pendingCompany);

    const res = await request(app)
      .get(`/api/v1/companies/${companyId}`)
      .set('x-test-role', Role.STUDENT);

    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe(COMPANY_ERROR_CODES.COMPANY_NOT_FOUND);
  });

  it('GET /api/v1/companies/:id unknown id -> 404 COMPANY_NOT_FOUND', async () => {
    (companiesRepository.findById as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get(`/api/v1/companies/${companyId}`)
      .set('x-test-role', Role.ADMIN);

    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe(COMPANY_ERROR_CODES.COMPANY_NOT_FOUND);
  });

  it('GET /api/v1/companies/:id with non-UUID -> 400 VALIDATION_ERROR', async () => {
    const res = await request(app).get('/api/v1/companies/not-a-uuid').set('x-test-role', Role.ADMIN);

    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
  });

  it('exports company error codes', () => {
    expect(COMPANY_ERROR_CODES.COMPANY_NOT_FOUND).toBe('COMPANY_NOT_FOUND');
    expect(COMPANY_ERROR_CODES.COMPANY_NOT_PUBLIC).toBe('COMPANY_NOT_PUBLIC');
    expect(COMPANY_ERROR_CODES.COMPANY_PROFILE_FORBIDDEN).toBe('COMPANY_PROFILE_FORBIDDEN');
  });
});
