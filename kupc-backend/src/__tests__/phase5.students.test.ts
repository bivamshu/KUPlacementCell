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
    RESUME_STORAGE_BUCKET: 'resumes'
  }
}));

jest.mock('../database/students.repository', () => ({
  studentsRepository: {
    findById: jest.fn(),
    updateProfile: jest.fn()
  }
}));

jest.mock('../database/resumes.repository', () => ({
  resumesRepository: {
    findById: jest.fn()
  }
}));

import app from '../app';
import { resumesRepository } from '../database/resumes.repository';
import { studentsRepository } from '../database/students.repository';
import { AUTH_ERROR_CODES, Role } from '../modules/auth';
import { STUDENT_ERROR_CODES } from '../modules/students';

jest.mock('../middleware/authenticate', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    const role = req.get('x-test-role');

    if (!role) {
      const { UnauthorizedError } = require('../utils/AppError');
      return next(new UnauthorizedError(AUTH_ERROR_CODES.MISSING_TOKEN, 'Missing token'));
    }

    req.user = {
      id: '550e8400-e29b-41d4-a716-446655440010',
      sessionId: 'session-1',
      role,
      email: 'student@ku.edu.np',
      emailVerified: true,
      status: 'active'
    };

    next();
  }
}));

const studentId = '550e8400-e29b-41d4-a716-446655440010';
const resumeId = '550e8400-e29b-41d4-a716-446655440001';

const studentRecord = {
  id: studentId,
  ku_id: '078bct000',
  full_name: 'Test Student',
  graduation_year: 2026,
  department: 'Computer Engineering',
  phone: '9800000000',
  degree: 'B.E.',
  cgpa: 3.5,
  bio: 'Hello',
  profile_picture_url: null,
  resume_id: resumeId,
  created_at: '2026-07-10T10:00:00.000Z',
  updated_at: '2026-07-11T10:00:00.000Z'
};

const resumeRecord = {
  id: resumeId,
  student_id: studentId,
  file_url: `${studentId}/${resumeId}/resume.pdf`,
  file_name: 'resume.pdf',
  uploaded_at: '2026-07-11T09:00:00.000Z'
};

describe('Phase 5 Milestone B1 - students profile module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (studentsRepository.findById as jest.Mock).mockResolvedValue(studentRecord);
    (studentsRepository.updateProfile as jest.Mock).mockImplementation(async (_id, input) => ({
      ...studentRecord,
      bio: input.bio ?? studentRecord.bio,
      cgpa: input.cgpa !== undefined ? input.cgpa : studentRecord.cgpa,
      phone: input.phone !== undefined ? input.phone : studentRecord.phone,
      degree: input.degree !== undefined ? input.degree : studentRecord.degree,
      department: input.department !== undefined ? input.department : studentRecord.department,
      graduation_year:
        input.graduationYear !== undefined ? input.graduationYear : studentRecord.graduation_year,
      full_name: input.fullName ?? studentRecord.full_name,
      updated_at: '2026-07-17T12:00:00.000Z'
    }));
    (resumesRepository.findById as jest.Mock).mockResolvedValue(resumeRecord);
  });

  it('GET /api/v1/students/me without token -> 401 MISSING_TOKEN', async () => {
    const res = await request(app).get('/api/v1/students/me');
    expect(res.status).toBe(401);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.MISSING_TOKEN);
  });

  it('GET /api/v1/students/me as COMPANY -> 403 INSUFFICIENT_ROLE', async () => {
    const res = await request(app).get('/api/v1/students/me').set('x-test-role', Role.COMPANY);
    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.INSUFFICIENT_ROLE);
  });

  it('GET /api/v1/students/me as STUDENT returns profile with active resume summary', async () => {
    const res = await request(app).get('/api/v1/students/me').set('x-test-role', Role.STUDENT);

    expect(res.status).toBe(200);
    expect(res.body?.data).toMatchObject({
      id: studentId,
      ku_id: '078bct000',
      full_name: 'Test Student',
      phone: '9800000000',
      resume_id: resumeId,
      active_resume: {
        id: resumeId,
        file_name: 'resume.pdf',
        uploaded_at: '2026-07-11T09:00:00.000Z'
      }
    });
  });

  it('GET /api/v1/students/me returns 404 STUDENT_NOT_FOUND when row missing', async () => {
    (studentsRepository.findById as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get('/api/v1/students/me').set('x-test-role', Role.STUDENT);

    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe(STUDENT_ERROR_CODES.STUDENT_NOT_FOUND);
  });

  it('PATCH /api/v1/students/me updates allowed fields', async () => {
    const res = await request(app)
      .patch('/api/v1/students/me')
      .set('x-test-role', Role.STUDENT)
      .send({ bio: 'Updated bio', cgpa: 3.75 });

    expect(res.status).toBe(200);
    expect(studentsRepository.updateProfile).toHaveBeenCalledWith(studentId, {
      bio: 'Updated bio',
      cgpa: 3.75
    });
    expect(res.body?.data?.bio).toBe('Updated bio');
    expect(res.body?.data?.cgpa).toBe(3.75);
  });

  it('PATCH /api/v1/students/me with invalid cgpa -> 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .patch('/api/v1/students/me')
      .set('x-test-role', Role.STUDENT)
      .send({ cgpa: 4.5 });

    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
    expect(studentsRepository.updateProfile).not.toHaveBeenCalled();
  });

  it('PATCH /api/v1/students/me as COMPANY -> 403', async () => {
    const res = await request(app)
      .patch('/api/v1/students/me')
      .set('x-test-role', Role.COMPANY)
      .send({ bio: 'Nope' });

    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.INSUFFICIENT_ROLE);
  });

  it('GET /api/v1/students/:id returns public card without phone/ku_id', async () => {
    const res = await request(app)
      .get(`/api/v1/students/${studentId}`)
      .set('x-test-role', Role.COMPANY);

    expect(res.status).toBe(200);
    expect(res.body?.data).toMatchObject({
      id: studentId,
      full_name: 'Test Student',
      department: 'Computer Engineering'
    });
    expect(res.body?.data).not.toHaveProperty('phone');
    expect(res.body?.data).not.toHaveProperty('ku_id');
  });

  it('GET /api/v1/students/:id as STUDENT is allowed', async () => {
    const res = await request(app)
      .get(`/api/v1/students/${studentId}`)
      .set('x-test-role', Role.STUDENT);

    expect(res.status).toBe(200);
    expect(res.body?.data?.id).toBe(studentId);
  });

  it('GET /api/v1/students/:id with non-UUID -> 400 VALIDATION_ERROR', async () => {
    const res = await request(app).get('/api/v1/students/not-a-uuid').set('x-test-role', Role.ADMIN);

    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/v1/students/:id unknown id -> 404 STUDENT_NOT_FOUND', async () => {
    (studentsRepository.findById as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get(`/api/v1/students/${studentId}`)
      .set('x-test-role', Role.ADMIN);

    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe(STUDENT_ERROR_CODES.STUDENT_NOT_FOUND);
  });

  it('exports student error codes', () => {
    expect(STUDENT_ERROR_CODES.STUDENT_NOT_FOUND).toBe('STUDENT_NOT_FOUND');
    expect(STUDENT_ERROR_CODES.STUDENT_PROFILE_FORBIDDEN).toBe('STUDENT_PROFILE_FORBIDDEN');
    expect(STUDENT_ERROR_CODES.INVALID_PROFILE_PAYLOAD).toBe('INVALID_PROFILE_PAYLOAD');
  });
});
