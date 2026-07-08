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

jest.mock('../database/refreshTokens.repository', () => {
  return {
    refreshTokensRepository: {
      revokeBySessionId: jest.fn()
    }
  };
});

jest.mock('../database/sessions.repository', () => {
  return {
    sessionsRepository: {
      deleteById: jest.fn()
    }
  };
});

jest.mock('../middleware/authUserCache', () => {
  return {
    authUserCache: {
      delete: jest.fn()
    }
  };
});

import app from '../app';
import { authUserCache } from '../middleware/authUserCache';
import { refreshTokensRepository } from '../database/refreshTokens.repository';
import { sessionsRepository } from '../database/sessions.repository';
import { AUTH_ERROR_CODES, Role } from '../modules/auth';

jest.mock('../middleware/authenticate', () => {
  return {
    authenticate: (req: any, _res: any, next: any) => {
      const enabled = req.get('x-test-auth');

      if (!enabled) {
        const { AppError } = require('../utils/AppError');
        return next(new AppError('Missing token', 401, AUTH_ERROR_CODES.MISSING_TOKEN));
      }

      req.user = {
        id: 'test-user-id',
        sessionId: 'test-session-id',
        role: Role.STUDENT,
        email: 'test@example.com',
        emailVerified: true,
        status: 'active'
      };

      next();
    }
  };
});

describe('Milestone 9 - POST /api/v1/auth/logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (refreshTokensRepository.revokeBySessionId as jest.Mock).mockResolvedValue(undefined);
    (sessionsRepository.deleteById as jest.Mock).mockResolvedValue(undefined);
    (authUserCache.delete as jest.Mock).mockReturnValue(undefined);
  });

  it('Missing token -> 401 MISSING_TOKEN', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    expect(res.status).toBe(401);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.MISSING_TOKEN);
  });

  it('Valid token -> 200 and revokes session refresh tokens + deletes session', async () => {
    const res = await request(app).post('/api/v1/auth/logout').set('x-test-auth', '1');

    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(res.body?.data?.logged_out).toBe(true);

    expect(refreshTokensRepository.revokeBySessionId).toHaveBeenCalledWith('test-session-id');
    expect(sessionsRepository.deleteById).toHaveBeenCalledWith('test-session-id');
    expect(authUserCache.delete).toHaveBeenCalledWith('test-user-id');
  });
});
