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
      findByHash: jest.fn(),
      create: jest.fn(),
      revokeById: jest.fn(),
      revokeBySessionId: jest.fn()
    }
  };
});

jest.mock('../database/sessions.repository', () => {
  return {
    sessionsRepository: {
      deleteById: jest.fn(),
      create: jest.fn()
    }
  };
});

jest.mock('../database/users.repository', () => {
  return {
    usersRepository: {
      findById: jest.fn()
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
import { refreshTokensRepository } from '../database/refreshTokens.repository';
import { sessionsRepository } from '../database/sessions.repository';
import { usersRepository } from '../database/users.repository';
import { AUTH_ERROR_CODES, Role } from '../modules/auth';
import { hashToken } from '../utils/auth';

describe('Milestone 8 - POST /api/v1/auth/refresh (rotation)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Valid refresh token -> 200 and returns rotated tokens', async () => {
    const refreshToken = 'refresh-token-1';
    const refreshTokenHash = hashToken(refreshToken);

    (refreshTokensRepository.findByHash as jest.Mock).mockResolvedValue({
      id: 'rt-1',
      user_id: 'user-1',
      session_id: 'sess-1',
      token_hash: refreshTokenHash,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      revoked: false,
      created_at: new Date().toISOString()
    });

    (usersRepository.findById as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      role: Role.STUDENT,
      email_verified: true,
      status: 'active'
    });

    (companiesRepository.findByUserId as jest.Mock).mockResolvedValue(null);
    (refreshTokensRepository.revokeById as jest.Mock).mockResolvedValue(undefined);
    (refreshTokensRepository.create as jest.Mock).mockResolvedValue({
      id: 'rt-2'
    });

    const res = await request(app).post('/api/v1/auth/refresh').send({ refresh_token: refreshToken });

    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(typeof res.body?.data?.access_token).toBe('string');
    expect(typeof res.body?.data?.refresh_token).toBe('string');
    expect(res.body?.data?.refresh_token).not.toBe(refreshToken);
    expect(res.body?.data?.user?.id).toBe('user-1');

    expect(refreshTokensRepository.findByHash).toHaveBeenCalledWith(refreshTokenHash);
    expect(refreshTokensRepository.revokeById).toHaveBeenCalledWith('rt-1');
    expect(refreshTokensRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        sessionId: 'sess-1'
      })
    );
  });

  it('Reused (revoked) refresh token -> 401 REFRESH_TOKEN_REUSE_DETECTED and session family revoked', async () => {
    const refreshToken = 'refresh-token-reused';
    const refreshTokenHash = hashToken(refreshToken);

    (refreshTokensRepository.findByHash as jest.Mock).mockResolvedValue({
      id: 'rt-old',
      user_id: 'user-1',
      session_id: 'sess-1',
      token_hash: refreshTokenHash,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      revoked: true,
      created_at: new Date().toISOString()
    });

    const res = await request(app).post('/api/v1/auth/refresh').send({ refresh_token: refreshToken });

    expect(res.status).toBe(401);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.REFRESH_TOKEN_REUSE_DETECTED);

    expect(refreshTokensRepository.revokeBySessionId).toHaveBeenCalledWith('sess-1');
    expect(sessionsRepository.deleteById).toHaveBeenCalledWith('sess-1');
  });
});

