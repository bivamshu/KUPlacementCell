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
    RESUME_STORAGE_BUCKET: 'resumes',
    PROFILE_IMAGE_MAX_BYTES: 2_097_152,
    AVATAR_STORAGE_BUCKET: 'avatars',
    COMPANY_LOGO_STORAGE_BUCKET: 'company-logos'
  }
}));

jest.mock('../database/jobs.repository', () => ({
  jobsRepository: {
    findById: jest.fn(),
    findByIds: jest.fn()
  }
}));

jest.mock('../database/companies.repository', () => ({
  companiesRepository: {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findByIds: jest.fn()
  }
}));

jest.mock('../database/students.repository', () => ({
  studentsRepository: {
    findByIds: jest.fn()
  }
}));

jest.mock('../database/swipes.repository', () => ({
  swipesRepository: {
    listByCompany: jest.fn(),
    findStudentRightSwipe: jest.fn()
  }
}));

jest.mock('../database/matches.repository', () => ({
  matchesRepository: {
    create: jest.fn(),
    findByTriple: jest.fn(),
    listByStudent: jest.fn(),
    listByCompany: jest.fn()
  }
}));

import app from '../app';
import { companiesRepository } from '../database/companies.repository';
import { jobsRepository } from '../database/jobs.repository';
import { matchesRepository } from '../database/matches.repository';
import { studentsRepository } from '../database/students.repository';
import { swipesRepository } from '../database/swipes.repository';
import { AUTH_ERROR_CODES, Role } from '../modules/auth';
import { JOB_ERROR_CODES } from '../modules/jobs';
import { MATCH_ERROR_CODES } from '../modules/matches';

const companyUserId = '550e8400-e29b-41d4-a716-446655440002';
const otherCompanyId = '550e8400-e29b-41d4-a716-446655440003';
const studentId = '550e8400-e29b-41d4-a716-446655440010';
const jobId = '550e8400-e29b-41d4-a716-446655440001';
const foreignJobId = '550e8400-e29b-41d4-a716-446655440099';

jest.mock('../middleware/authenticate', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    const role = req.get('x-test-role');

    if (!role) {
      const { UnauthorizedError } = require('../utils/AppError');
      return next(new UnauthorizedError(AUTH_ERROR_CODES.MISSING_TOKEN, 'Missing token'));
    }

    req.user = {
      id: role === Role.COMPANY ? companyUserId : studentId,
      sessionId: 'session-1',
      role,
      email: role === Role.STUDENT ? 'student@ku.edu.np' : 'company@example.com',
      emailVerified: true,
      status: 'active'
    };

    next();
  }
}));

const approvedCompany = {
  id: companyUserId,
  company_name: 'Approved Co',
  website: 'https://approved.example',
  verification_status: 'approved' as const,
  verified_at: '2026-07-01T00:00:00.000Z',
  industry: 'Software',
  description: 'Verified employer',
  logo_url: null,
  created_at: '2026-07-01T00:00:00.000Z',
  updated_at: '2026-07-01T00:00:00.000Z'
};

const openJob = {
  id: jobId,
  company_id: companyUserId,
  title: 'Backend Intern',
  description: 'Ship APIs.',
  location: 'Dhulikhel',
  job_type: 'internship' as const,
  min_cgpa: 3.0,
  status: 'open' as const,
  created_at: '2026-07-17T10:00:00.000Z',
  updated_at: '2026-07-17T11:00:00.000Z'
};

const foreignJob = {
  ...openJob,
  id: foreignJobId,
  company_id: otherCompanyId,
  title: 'Foreign Role'
};

const studentRow = {
  id: studentId,
  ku_id: 'KU001',
  full_name: 'Alex Student',
  graduation_year: 2027,
  department: 'CS',
  phone: null,
  degree: null,
  cgpa: null,
  bio: null,
  profile_picture_url: 'https://cdn.example/a.png',
  resume_id: null,
  created_at: '2026-07-01T00:00:00.000Z',
  updated_at: '2026-07-01T00:00:00.000Z'
};

const rightSwipe = {
  id: '550e8400-e29b-41d4-a716-446655440050',
  student_id: studentId,
  company_id: companyUserId,
  job_id: jobId,
  direction: 'right' as const,
  swiped_at: '2026-07-18T12:00:00.000Z'
};

const leftSwipe = {
  ...rightSwipe,
  id: '550e8400-e29b-41d4-a716-446655440051',
  direction: 'left' as const
};

const matchRow = {
  id: '550e8400-e29b-41d4-a716-446655440060',
  student_id: studentId,
  company_id: companyUserId,
  job_id: jobId,
  matched_at: '2026-07-18T12:05:00.000Z'
};

describe('Phase 7 Milestone B4 - inbound + match create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (companiesRepository.findByUserId as jest.Mock).mockResolvedValue(approvedCompany);
  });

  it('GET /swipes/inbound returns right-swipes with student + job', async () => {
    (swipesRepository.listByCompany as jest.Mock).mockResolvedValue([leftSwipe, rightSwipe]);
    (studentsRepository.findByIds as jest.Mock).mockResolvedValue([studentRow]);
    (jobsRepository.findByIds as jest.Mock).mockResolvedValue([openJob]);

    const res = await request(app).get('/api/v1/swipes/inbound').set('x-test-role', Role.COMPANY);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      swipe: { id: rightSwipe.id, direction: 'right', job_id: jobId },
      student: {
        id: studentId,
        full_name: 'Alex Student',
        department: 'CS',
        avatar_url: 'https://cdn.example/a.png'
      },
      job: { id: jobId, title: 'Backend Intern', status: 'open' }
    });
    expect(swipesRepository.listByCompany).toHaveBeenCalledWith(companyUserId);
  });

  it('GET /swipes/inbound empty when no right swipes', async () => {
    (swipesRepository.listByCompany as jest.Mock).mockResolvedValue([leftSwipe]);

    const res = await request(app).get('/api/v1/swipes/inbound').set('x-test-role', Role.COMPANY);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(studentsRepository.findByIds).not.toHaveBeenCalled();
  });

  it('POST /matches creates match when student right-swiped owned job', async () => {
    (jobsRepository.findById as jest.Mock).mockResolvedValue(openJob);
    (swipesRepository.findStudentRightSwipe as jest.Mock).mockResolvedValue(rightSwipe);
    (matchesRepository.findByTriple as jest.Mock).mockResolvedValue(null);
    (matchesRepository.create as jest.Mock).mockResolvedValue(matchRow);

    const res = await request(app)
      .post('/api/v1/matches')
      .set('x-test-role', Role.COMPANY)
      .send({ job_id: jobId, student_id: studentId });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      id: matchRow.id,
      student_id: studentId,
      company_id: companyUserId,
      job_id: jobId
    });
    expect(matchesRepository.create).toHaveBeenCalledWith({
      studentId,
      companyId: companyUserId,
      jobId
    });
  });

  it('POST /matches is idempotent when match already exists', async () => {
    (jobsRepository.findById as jest.Mock).mockResolvedValue(openJob);
    (swipesRepository.findStudentRightSwipe as jest.Mock).mockResolvedValue(rightSwipe);
    (matchesRepository.findByTriple as jest.Mock).mockResolvedValue(matchRow);

    const res = await request(app)
      .post('/api/v1/matches')
      .set('x-test-role', Role.COMPANY)
      .send({ job_id: jobId, student_id: studentId });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe(matchRow.id);
    expect(matchesRepository.create).not.toHaveBeenCalled();
  });

  it('POST /matches on foreign job -> 403 MATCH_FORBIDDEN', async () => {
    (jobsRepository.findById as jest.Mock).mockResolvedValue(foreignJob);

    const res = await request(app)
      .post('/api/v1/matches')
      .set('x-test-role', Role.COMPANY)
      .send({ job_id: foreignJobId, student_id: studentId });

    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe(MATCH_ERROR_CODES.MATCH_FORBIDDEN);
    expect(matchesRepository.create).not.toHaveBeenCalled();
  });

  it('POST /matches without right-swipe -> 403 MATCH_FORBIDDEN', async () => {
    (jobsRepository.findById as jest.Mock).mockResolvedValue(openJob);
    (swipesRepository.findStudentRightSwipe as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/matches')
      .set('x-test-role', Role.COMPANY)
      .send({ job_id: jobId, student_id: studentId });

    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe(MATCH_ERROR_CODES.MATCH_FORBIDDEN);
    expect(matchesRepository.create).not.toHaveBeenCalled();
  });

  it('POST /matches on missing job -> 404 JOB_NOT_FOUND', async () => {
    (jobsRepository.findById as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/matches')
      .set('x-test-role', Role.COMPANY)
      .send({ job_id: jobId, student_id: studentId });

    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe(JOB_ERROR_CODES.JOB_NOT_FOUND);
  });

  it('GET /matches/me as STUDENT returns matches with job + company', async () => {
    (matchesRepository.listByStudent as jest.Mock).mockResolvedValue([matchRow]);
    (jobsRepository.findByIds as jest.Mock).mockResolvedValue([openJob]);
    (companiesRepository.findByIds as jest.Mock).mockResolvedValue([approvedCompany]);

    const res = await request(app).get('/api/v1/matches/me').set('x-test-role', Role.STUDENT);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      id: matchRow.id,
      job: { id: jobId, title: 'Backend Intern', status: 'open' },
      company: { id: companyUserId, company_name: 'Approved Co', logo_url: null }
    });
    expect(res.body.data[0].student).toBeUndefined();
    expect(matchesRepository.listByStudent).toHaveBeenCalledWith(studentId);
    expect(studentsRepository.findByIds).not.toHaveBeenCalled();
  });

  it('GET /matches/me as COMPANY returns matches with job + student', async () => {
    (matchesRepository.listByCompany as jest.Mock).mockResolvedValue([matchRow]);
    (jobsRepository.findByIds as jest.Mock).mockResolvedValue([openJob]);
    (studentsRepository.findByIds as jest.Mock).mockResolvedValue([studentRow]);

    const res = await request(app).get('/api/v1/matches/me').set('x-test-role', Role.COMPANY);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      id: matchRow.id,
      job: { id: jobId, title: 'Backend Intern', status: 'open' },
      student: {
        id: studentId,
        full_name: 'Alex Student',
        avatar_url: 'https://cdn.example/a.png'
      }
    });
    expect(res.body.data[0].company).toBeUndefined();
    expect(matchesRepository.listByCompany).toHaveBeenCalledWith(companyUserId);
    expect(companiesRepository.findByIds).not.toHaveBeenCalled();
  });

  it('GET /matches/me as STUDENT returns empty list', async () => {
    (matchesRepository.listByStudent as jest.Mock).mockResolvedValue([]);

    const res = await request(app).get('/api/v1/matches/me').set('x-test-role', Role.STUDENT);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(jobsRepository.findByIds).not.toHaveBeenCalled();
  });
});
