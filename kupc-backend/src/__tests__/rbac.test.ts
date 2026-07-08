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

describe('Milestone 6 - RBAC', () => {
  it('No token at all hitting any protected route -> 401 MISSING_TOKEN', async () => {
    const res = await request(app).get('/api/v1/rbac/admin/dashboard');
    expect(res.status).toBe(401);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.MISSING_TOKEN);
  });

  it('Student token hitting an ADMIN-only route -> 403 INSUFFICIENT_ROLE', async () => {
    const res = await request(app)
      .get('/api/v1/rbac/admin/dashboard')
      .set('x-test-role', Role.STUDENT);
    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.INSUFFICIENT_ROLE);
  });

  it('Company token hitting a STUDENT-only route -> 403 INSUFFICIENT_ROLE', async () => {
    const res = await request(app)
      .get('/api/v1/rbac/student/dashboard')
      .set('x-test-role', Role.COMPANY);
    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.INSUFFICIENT_ROLE);
  });

  it('Valid token, correct role -> 200 and controller executes', async () => {
    const res = await request(app)
      .get('/api/v1/rbac/company/dashboard')
      .set('x-test-role', Role.COMPANY);
    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(res.body?.data?.ok).toBe(true);
    expect(res.body?.data?.role).toBe(Role.COMPANY);
  });
});

