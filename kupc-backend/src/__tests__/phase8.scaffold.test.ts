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

import app from '../app';
import { AUTH_ERROR_CODES, Role } from '../modules/auth';
import { CONVERSATION_ERROR_CODES } from '../modules/conversations';

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

const matchId = '550e8400-e29b-41d4-a716-446655440001';
const conversationId = '550e8400-e29b-41d4-a716-446655440002';

const MODULE_FILES = [
  'conversations.constants.ts',
  'conversations.types.ts',
  'conversations.validation.ts',
  'conversations.errors.ts',
  'conversations.mapper.ts',
  'conversations.service.ts',
  'conversations.controller.ts',
  'conversations.routes.ts',
  'index.ts'
];

describe('Phase 8 Milestone B1 - conversations module scaffold', () => {
  it('conversations module files exist', () => {
    const dir = path.join(__dirname, '../modules/conversations');
    for (const file of MODULE_FILES) {
      expect(fs.existsSync(path.join(dir, file))).toBe(true);
    }
  });

  it('mounts conversations router under /api/v1', () => {
    const routes = fs.readFileSync(path.join(__dirname, '../routes/index.ts'), 'utf8');
    expect(routes).toMatch(/from '\.\.\/modules\/conversations'/);
    expect(routes).toMatch(/router\.use\('\/conversations', conversationsRouter\)/);
  });

  it('registers static paths before /:id', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '../modules/conversations/conversations.routes.ts'),
      'utf8'
    );
    const meIndex = source.indexOf("'/me'");
    const ensureIndex = source.indexOf("'/ensure'");
    const idIndex = source.lastIndexOf("'/:id'");
    expect(meIndex).toBeGreaterThan(-1);
    expect(ensureIndex).toBeGreaterThan(-1);
    expect(idIndex).toBeGreaterThan(-1);
    expect(meIndex).toBeLessThan(idIndex);
    expect(ensureIndex).toBeLessThan(idIndex);
  });

  it('GET /conversations/me without token -> 401', async () => {
    const res = await request(app).get('/api/v1/conversations/me');
    expect(res.status).toBe(401);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.MISSING_TOKEN);
  });

  it('GET /conversations/me as ADMIN -> 403 INSUFFICIENT_ROLE', async () => {
    const res = await request(app).get('/api/v1/conversations/me').set('x-test-role', Role.ADMIN);
    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.INSUFFICIENT_ROLE);
  });

  it('POST /conversations/ensure empty body -> 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/conversations/ensure')
      .set('x-test-role', Role.STUDENT)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
  });

  it('POST /conversations/ensure valid body as STUDENT -> 501 NOT_IMPLEMENTED', async () => {
    const res = await request(app)
      .post('/api/v1/conversations/ensure')
      .set('x-test-role', Role.STUDENT)
      .send({ match_id: matchId });
    expect(res.status).toBe(501);
    expect(res.body?.error?.code).toBe(CONVERSATION_ERROR_CODES.NOT_IMPLEMENTED);
  });

  it('GET /conversations/me as STUDENT -> 501 NOT_IMPLEMENTED', async () => {
    const res = await request(app).get('/api/v1/conversations/me').set('x-test-role', Role.STUDENT);
    expect(res.status).toBe(501);
    expect(res.body?.error?.code).toBe(CONVERSATION_ERROR_CODES.NOT_IMPLEMENTED);
  });

  it('GET /conversations/:id as COMPANY -> 501 NOT_IMPLEMENTED', async () => {
    const res = await request(app)
      .get(`/api/v1/conversations/${conversationId}`)
      .set('x-test-role', Role.COMPANY);
    expect(res.status).toBe(501);
    expect(res.body?.error?.code).toBe(CONVERSATION_ERROR_CODES.NOT_IMPLEMENTED);
  });

  it('GET /conversations/:id/messages as STUDENT -> 501 NOT_IMPLEMENTED', async () => {
    const res = await request(app)
      .get(`/api/v1/conversations/${conversationId}/messages`)
      .set('x-test-role', Role.STUDENT);
    expect(res.status).toBe(501);
    expect(res.body?.error?.code).toBe(CONVERSATION_ERROR_CODES.NOT_IMPLEMENTED);
  });

  it('POST /conversations/:id/messages empty content -> 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('x-test-role', Role.STUDENT)
      .send({ content: '   ' });
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
  });

  it('POST /conversations/:id/messages valid as COMPANY -> 501 NOT_IMPLEMENTED', async () => {
    const res = await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('x-test-role', Role.COMPANY)
      .send({ content: 'Hello from company' });
    expect(res.status).toBe(501);
    expect(res.body?.error?.code).toBe(CONVERSATION_ERROR_CODES.NOT_IMPLEMENTED);
  });

  it('POST /conversations/:id/read as STUDENT -> 501 NOT_IMPLEMENTED', async () => {
    const res = await request(app)
      .post(`/api/v1/conversations/${conversationId}/read`)
      .set('x-test-role', Role.STUDENT);
    expect(res.status).toBe(501);
    expect(res.body?.error?.code).toBe(CONVERSATION_ERROR_CODES.NOT_IMPLEMENTED);
  });
});
