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
      ADMIN_PASSWORD_LOGIN_ENABLED: true,
      RESUME_MAX_BYTES: 5_242_880,
      RESUME_STORAGE_BUCKET: 'resumes'
    }
  };
});

import app from '../app';
import { AUTH_ERROR_CODES, Role } from '../modules/auth';
import { AnalysisStatus, RESUME_ERROR_CODES } from '../modules/resumes';

jest.mock('../middleware/authenticate', () => {
  return {
    authenticate: (req: any, _res: any, next: any) => {
      const role = req.get('x-test-role');

      if (!role) {
        const { UnauthorizedError } = require('../utils/AppError');
        return next(new UnauthorizedError(AUTH_ERROR_CODES.MISSING_TOKEN, 'Missing token'));
      }

      req.user = {
        id: 'test-user-id',
        sessionId: 'test-session-id',
        role,
        email: 'test@example.com',
        emailVerified: true,
        status: 'active'
      };

      next();
    }
  };
});

describe('Phase 4 Milestone 1 - resumes module scaffold', () => {
  it('POST /api/v1/resumes without token -> 401 MISSING_TOKEN', async () => {
    const res = await request(app).post('/api/v1/resumes');
    expect(res.status).toBe(401);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.MISSING_TOKEN);
  });

  it('GET /api/v1/resumes as COMPANY -> 403 INSUFFICIENT_ROLE', async () => {
    const res = await request(app).get('/api/v1/resumes').set('x-test-role', Role.COMPANY);
    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.INSUFFICIENT_ROLE);
  });

  it('POST /api/v1/resumes as STUDENT without file -> 400 VALIDATION_ERROR', async () => {
    const res = await request(app).post('/api/v1/resumes').set('x-test-role', Role.STUDENT);
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/v1/resumes as STUDENT -> 501 stub (auth passed)', async () => {
    const res = await request(app).get('/api/v1/resumes').set('x-test-role', Role.STUDENT);
    expect(res.status).toBe(501);
    expect(res.body?.error?.code).toBe('NOT_IMPLEMENTED');
  });

  it('exports analysis status enum and resume error codes', () => {
    expect(AnalysisStatus.PENDING).toBe('pending');
    expect(AnalysisStatus.PROCESSING).toBe('processing');
    expect(AnalysisStatus.COMPLETED).toBe('completed');
    expect(AnalysisStatus.FAILED).toBe('failed');
    expect(RESUME_ERROR_CODES.RESUME_NOT_FOUND).toBe('RESUME_NOT_FOUND');
  });
});
