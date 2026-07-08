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
import { requireVerifiedCompany } from '../middleware/requireVerifiedCompany';
import { AUTH_ERROR_CODES, Role } from '../modules/auth';
import { AppError } from '../utils/AppError';

async function runMiddleware(
  handler: typeof requireVerifiedCompany,
  user?: {
    id: string;
    sessionId: string;
    role: Role;
    email: string;
    emailVerified: boolean;
    status: 'active' | 'suspended' | 'deleted';
    verificationStatus?: 'pending' | 'approved' | 'rejected';
  }
): Promise<AppError | undefined> {
  return new Promise((resolve) => {
    const req = { user } as any;
    handler(req, {} as any, (err?: unknown) => {
      resolve(err as AppError | undefined);
    });
  });
}

describe('Milestone 11 - Phase 2 testing matrix', () => {
  describe('Exit checklist: Zod validation on auth endpoints', () => {
    it('Student registration rejects non-KU email -> 400 INVALID_EMAIL_DOMAIN', async () => {
      const res = await request(app).post('/api/v1/auth/register/student').send({
        email: 'student@gmail.com',
        full_name: 'Test Student',
        password: 'password1'
      });

      expect(res.status).toBe(400);
      expect(res.body?.success).toBe(false);
      expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.INVALID_EMAIL_DOMAIN);
    });

    it('Student registration rejects invalid password -> 400 VALIDATION_ERROR', async () => {
      const res = await request(app).post('/api/v1/auth/register/student').send({
        email: 'student@ku.edu.np',
        full_name: 'Test Student',
        password: 'short'
      });

      expect(res.status).toBe(400);
      expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
    });

    it('Login rejects missing password -> 400 VALIDATION_ERROR', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'student@ku.edu.np'
      });

      expect(res.status).toBe(400);
      expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
    });

    it('Admin login rejects invalid email -> 400 VALIDATION_ERROR', async () => {
      const res = await request(app).post('/api/v1/auth/admin/login').send({
        email: 'not-an-email',
        password: 'password1'
      });

      expect(res.status).toBe(400);
      expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
    });

    it('OTP verification rejects malformed OTP -> 400 VALIDATION_ERROR', async () => {
      const res = await request(app).post('/api/v1/auth/verify-otp').send({
        email: 'student@ku.edu.np',
        otp: '12'
      });

      expect(res.status).toBe(400);
      expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
    });

    it('Company registration rejects invalid body -> 400 VALIDATION_ERROR', async () => {
      const res = await request(app).post('/api/v1/auth/register/company').send({
        company_name: 'A',
        email: 'recruiter@company.com',
        password: 'password1'
      });

      expect(res.status).toBe(400);
      expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Exit checklist: separate admin login route', () => {
    it('POST /api/v1/auth/login and /admin/login are both mounted (not 404)', async () => {
      const loginRes = await request(app).post('/api/v1/auth/login').send({ email: 'bad', password: '' });
      const adminRes = await request(app).post('/api/v1/auth/admin/login').send({ email: 'bad', password: '' });

      expect(loginRes.status).not.toBe(404);
      expect(adminRes.status).not.toBe(404);
      expect(loginRes.status).toBe(400);
      expect(adminRes.status).toBe(400);
    });
  });

  describe('Exit checklist: pending company gate', () => {
    it('requireVerifiedCompany blocks pending companies -> 403 PENDING_VERIFICATION', async () => {
      const err = await runMiddleware(requireVerifiedCompany, {
        id: 'company-id',
        sessionId: 'sess-1',
        role: Role.COMPANY,
        email: 'company@example.com',
        emailVerified: true,
        status: 'active',
        verificationStatus: 'pending'
      });

      expect(err).toBeInstanceOf(AppError);
      expect(err?.statusCode).toBe(403);
      expect(err?.code).toBe(AUTH_ERROR_CODES.PENDING_VERIFICATION);
    });

    it('requireVerifiedCompany allows approved companies', async () => {
      const err = await runMiddleware(requireVerifiedCompany, {
        id: 'company-id',
        sessionId: 'sess-1',
        role: Role.COMPANY,
        email: 'company@example.com',
        emailVerified: true,
        status: 'active',
        verificationStatus: 'approved'
      });

      expect(err).toBeUndefined();
    });

    it('requireVerifiedCompany rejects non-company users -> 403 INSUFFICIENT_ROLE', async () => {
      const err = await runMiddleware(requireVerifiedCompany, {
        id: 'student-id',
        sessionId: 'sess-1',
        role: Role.STUDENT,
        email: 'student@ku.edu.np',
        emailVerified: true,
        status: 'active'
      });

      expect(err).toBeInstanceOf(AppError);
      expect(err?.code).toBe(AUTH_ERROR_CODES.INSUFFICIENT_ROLE);
    });
  });

  describe('Exit checklist: stable auth error envelope', () => {
    it('Refresh without token -> 401 INVALID_TOKEN with stable error shape', async () => {
      const res = await request(app).post('/api/v1/auth/refresh').send({});

      expect(res.status).toBe(401);
      expect(res.body?.success).toBe(false);
      expect(res.body?.data).toBeNull();
      expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.INVALID_TOKEN);
      expect(res.body?.error?.statusCode).toBe(401);
    });
  });
});
