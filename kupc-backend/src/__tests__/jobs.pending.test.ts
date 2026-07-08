import request from 'supertest';

jest.mock('../config/env', () => {
  return {
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
      ADMIN_PASSWORD_LOGIN_ENABLED: true
    }
  };
});

jest.mock('../database/companies.repository', () => {
  return {
    companiesRepository: {
      findByUserId: jest.fn()
    }
  };
});

import app from '../app';
import { companiesRepository } from '../database/companies.repository';
import { AUTH_ERROR_CODES, Role } from '../modules/auth';

jest.mock('../middleware/authenticate', () => {
  return {
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
  };
});

describe('Milestone 7 - POST /api/v1/jobs pending company gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Pending company -> 403 PENDING_VERIFICATION', async () => {
    (companiesRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'company-user-id',
      company_name: 'Acme',
      website: null,
      verification_status: 'pending',
      verified_at: null
    });

    const res = await request(app).post('/api/v1/jobs').set('x-test-role', Role.COMPANY).send({});

    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.PENDING_VERIFICATION);
  });

  it('Approved company -> 201 placeholder job created', async () => {
    (companiesRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'company-user-id',
      company_name: 'Acme',
      website: 'https://acme.example',
      verification_status: 'approved',
      verified_at: new Date().toISOString()
    });

    const res = await request(app).post('/api/v1/jobs').set('x-test-role', Role.COMPANY).send({});

    expect(res.status).toBe(201);
    expect(res.body?.data?.job_id).toBe('placeholder-job-id');
  });

  it('Student token -> 403 INSUFFICIENT_ROLE', async () => {
    const res = await request(app).post('/api/v1/jobs').set('x-test-role', Role.STUDENT).send({});

    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.INSUFFICIENT_ROLE);
  });
});
