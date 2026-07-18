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

jest.mock('../database/companies.repository', () => ({
  companiesRepository: {
    findByUserId: jest.fn(),
    findById: jest.fn()
  }
}));

jest.mock('../database/jobs.repository', () => ({
  jobsRepository: {
    findById: jest.fn()
  }
}));

jest.mock('../database/swipes.repository', () => ({
  swipesRepository: {
    create: jest.fn(),
    findByStudentAndJob: jest.fn(),
    listJobIdsByStudent: jest.fn()
  }
}));

import app from '../app';
import { companiesRepository } from '../database/companies.repository';
import { jobsRepository } from '../database/jobs.repository';
import { swipesRepository } from '../database/swipes.repository';
import { AUTH_ERROR_CODES, Role } from '../modules/auth';
import { MATCH_ERROR_CODES } from '../modules/matches';
import { SWIPE_ERROR_CODES } from '../modules/swipes';

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

const jobId = '550e8400-e29b-41d4-a716-446655440001';
const studentId = '550e8400-e29b-41d4-a716-446655440010';

const validSwipeBody = {
  job_id: jobId,
  direction: 'right'
};

const validMatchBody = {
  job_id: jobId,
  student_id: studentId
};

describe('Phase 7 Milestone B1 - swipes/matches module scaffold', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('swipes module files exist', () => {
    const dir = path.join(__dirname, '../modules/swipes');
    for (const file of [
      'swipes.constants.ts',
      'swipes.types.ts',
      'swipes.validation.ts',
      'swipes.errors.ts',
      'swipes.mapper.ts',
      'swipes.service.ts',
      'swipes.controller.ts',
      'swipes.routes.ts',
      'index.ts'
    ]) {
      expect(fs.existsSync(path.join(dir, file))).toBe(true);
    }
  });

  it('matches module files exist', () => {
    const dir = path.join(__dirname, '../modules/matches');
    for (const file of [
      'matches.constants.ts',
      'matches.types.ts',
      'matches.validation.ts',
      'matches.errors.ts',
      'matches.mapper.ts',
      'matches.service.ts',
      'matches.controller.ts',
      'matches.routes.ts',
      'index.ts'
    ]) {
      expect(fs.existsSync(path.join(dir, file))).toBe(true);
    }
  });

  it('POST /swipes without token -> 401 MISSING_TOKEN', async () => {
    const res = await request(app).post('/api/v1/swipes').send(validSwipeBody);
    expect(res.status).toBe(401);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.MISSING_TOKEN);
  });

  it('POST /swipes as COMPANY -> 403 INSUFFICIENT_ROLE', async () => {
    const res = await request(app)
      .post('/api/v1/swipes')
      .set('x-test-role', Role.COMPANY)
      .send(validSwipeBody);
    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.INSUFFICIENT_ROLE);
  });

  it('POST /swipes as STUDENT with empty body -> 400 VALIDATION_ERROR', async () => {
    const res = await request(app).post('/api/v1/swipes').set('x-test-role', Role.STUDENT).send({});
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
  });

  it('POST /swipes as STUDENT with valid body -> 201 SwipeDto', async () => {
    (jobsRepository.findById as jest.Mock).mockResolvedValue({
      id: jobId,
      company_id: '550e8400-e29b-41d4-a716-446655440002',
      title: 'Backend Intern',
      description: 'Ship APIs for the placement cell with mentorship.',
      location: 'Dhulikhel',
      job_type: 'internship',
      min_cgpa: 3.0,
      status: 'open',
      created_at: '2026-07-17T10:00:00.000Z',
      updated_at: '2026-07-17T11:00:00.000Z'
    });
    (companiesRepository.findById as jest.Mock).mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440002',
      verification_status: 'approved',
      company_name: 'Co',
      website: null,
      verified_at: null,
      industry: null,
      description: null,
      logo_url: null,
      created_at: '2026-07-01T00:00:00.000Z',
      updated_at: '2026-07-01T00:00:00.000Z'
    });
    (swipesRepository.findByStudentAndJob as jest.Mock).mockResolvedValue(null);
    (swipesRepository.create as jest.Mock).mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440099',
      student_id: '550e8400-e29b-41d4-a716-446655440099',
      company_id: '550e8400-e29b-41d4-a716-446655440002',
      job_id: jobId,
      direction: 'right',
      swiped_at: '2026-07-18T12:00:00.000Z'
    });

    const res = await request(app)
      .post('/api/v1/swipes')
      .set('x-test-role', Role.STUDENT)
      .send(validSwipeBody);
    expect(res.status).toBe(201);
    expect(res.body.data.direction).toBe('right');
  });

  it('GET /swipes/inbound as pending COMPANY -> 403 PENDING_VERIFICATION', async () => {
    (companiesRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440099',
      verification_status: 'pending'
    });

    const res = await request(app).get('/api/v1/swipes/inbound').set('x-test-role', Role.COMPANY);
    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.PENDING_VERIFICATION);
  });

  it('GET /swipes/me as STUDENT -> 501 NOT_IMPLEMENTED', async () => {
    const res = await request(app).get('/api/v1/swipes/me').set('x-test-role', Role.STUDENT);
    expect(res.status).toBe(501);
    expect(res.body?.error?.code).toBe(SWIPE_ERROR_CODES.NOT_IMPLEMENTED);
  });

  it('POST /matches as STUDENT -> 403 INSUFFICIENT_ROLE', async () => {
    const res = await request(app)
      .post('/api/v1/matches')
      .set('x-test-role', Role.STUDENT)
      .send(validMatchBody);
    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.INSUFFICIENT_ROLE);
  });

  it('GET /matches/me as STUDENT -> 501 NOT_IMPLEMENTED', async () => {
    const res = await request(app).get('/api/v1/matches/me').set('x-test-role', Role.STUDENT);
    expect(res.status).toBe(501);
    expect(res.body?.error?.code).toBe(MATCH_ERROR_CODES.NOT_IMPLEMENTED);
  });

  it('POST /matches with invalid body -> 400 VALIDATION_ERROR', async () => {
    (companiesRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440099',
      verification_status: 'approved'
    });

    const res = await request(app)
      .post('/api/v1/matches')
      .set('x-test-role', Role.COMPANY)
      .send({ job_id: 'not-a-uuid' });
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
  });
});
