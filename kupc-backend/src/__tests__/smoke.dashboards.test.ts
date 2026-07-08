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

import app from '../app';
import { AUTH_ERROR_CODES, Role } from '../modules/auth';

jest.mock('../middleware/authenticate', () => {
  return {
    authenticate: (req: any, _res: any, next: any) => {
      const role = req.get('x-test-role');

      if (!role) {
        return next();
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

describe('Milestone 10 - Protected smoke-test dashboards', () => {
  it('GET /api/v1/student/dashboard without token -> 401 MISSING_TOKEN', async () => {
    const res = await request(app).get('/api/v1/student/dashboard');
    expect(res.status).toBe(401);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.MISSING_TOKEN);
  });

  it('GET /api/v1/student/dashboard with ADMIN token -> 403 INSUFFICIENT_ROLE', async () => {
    const res = await request(app)
      .get('/api/v1/student/dashboard')
      .set('x-test-role', Role.ADMIN);
    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.INSUFFICIENT_ROLE);
  });

  it('GET /api/v1/student/dashboard with STUDENT token -> 200', async () => {
    const res = await request(app)
      .get('/api/v1/student/dashboard')
      .set('x-test-role', Role.STUDENT);
    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(res.body?.data?.ok).toBe(true);
    expect(res.body?.data?.role).toBe(Role.STUDENT);
  });

  it('GET /api/v1/admin/dashboard without token -> 401 MISSING_TOKEN', async () => {
    const res = await request(app).get('/api/v1/admin/dashboard');
    expect(res.status).toBe(401);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.MISSING_TOKEN);
  });

  it('GET /api/v1/admin/dashboard with STUDENT token -> 403 INSUFFICIENT_ROLE', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('x-test-role', Role.STUDENT);
    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.INSUFFICIENT_ROLE);
  });

  it('GET /api/v1/admin/dashboard with ADMIN token -> 200', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('x-test-role', Role.ADMIN);
    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(res.body?.data?.ok).toBe(true);
    expect(res.body?.data?.role).toBe(Role.ADMIN);
  });
});
