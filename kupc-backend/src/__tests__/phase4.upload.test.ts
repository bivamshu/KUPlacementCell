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

jest.mock('../config/resumeStorage', () => ({
  buildResumeObjectPath: jest.fn(
    (studentId: string, resumeId: string, fileName: string) => `${studentId}/${resumeId}/${fileName}`
  ),
  resumeStorage: {
    uploadPdf: jest.fn(),
    deleteObject: jest.fn()
  }
}));

jest.mock('../database/resumes.repository', () => ({
  resumesRepository: {
    create: jest.fn(),
    createAnalysis: jest.fn()
  }
}));

jest.mock('../queues/resumeAnalysis.queue', () => ({
  enqueueResumeAnalysis: jest.fn()
}));

import app from '../app';
import { resumeStorage } from '../config/resumeStorage';
import { resumesRepository } from '../database/resumes.repository';
import { enqueueResumeAnalysis } from '../queues/resumeAnalysis.queue';
import { AUTH_ERROR_CODES, Role } from '../modules/auth';
import { RESUME_ERROR_CODES } from '../modules/resumes';

jest.mock('../middleware/authenticate', () => {
  return {
    authenticate: (req: any, _res: any, next: any) => {
      const role = req.get('x-test-role');

      if (!role) {
        const { UnauthorizedError } = require('../utils/AppError');
        return next(new UnauthorizedError(AUTH_ERROR_CODES.MISSING_TOKEN, 'Missing token'));
      }

      req.user = {
        id: 'test-student-id',
        sessionId: 'test-session-id',
        role,
        email: 'student@ku.edu.np',
        emailVerified: true,
        status: 'active'
      };

      next();
    }
  };
});

const pdfBuffer = Buffer.from('%PDF-1.4 test resume');

describe('Phase 4 Milestone 3 - resume upload pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (resumeStorage.uploadPdf as jest.Mock).mockResolvedValue('test-student-id/resume-id/resume.pdf');
    (resumesRepository.create as jest.Mock).mockResolvedValue({
      id: 'resume-id',
      student_id: 'test-student-id',
      file_url: 'test-student-id/resume-id/resume.pdf',
      file_name: 'resume.pdf',
      uploaded_at: new Date().toISOString()
    });
    (resumesRepository.createAnalysis as jest.Mock).mockResolvedValue({
      id: 'analysis-id',
      resume_id: 'resume-id',
      status: 'pending'
    });
  });

  it('POST /api/v1/resumes without file -> 400 VALIDATION_ERROR', async () => {
    const res = await request(app).post('/api/v1/resumes').set('x-test-role', Role.STUDENT);
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/v1/resumes with non-PDF -> 400 RESUME_INVALID_TYPE', async () => {
    const res = await request(app)
      .post('/api/v1/resumes')
      .set('x-test-role', Role.STUDENT)
      .attach('file', Buffer.from('not a pdf'), { filename: 'resume.txt', contentType: 'text/plain' });

    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe(RESUME_ERROR_CODES.RESUME_INVALID_TYPE);
  });

  it('POST /api/v1/resumes with valid PDF -> 202 pending analysis', async () => {
    const res = await request(app)
      .post('/api/v1/resumes')
      .set('x-test-role', Role.STUDENT)
      .attach('file', pdfBuffer, { filename: 'resume.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(202);
    expect(res.body?.success).toBe(true);
    expect(res.body?.data).toEqual({
      resumeId: 'resume-id',
      analysisId: 'analysis-id',
      status: 'pending'
    });
    expect(resumeStorage.uploadPdf).toHaveBeenCalled();
    expect(resumesRepository.create).toHaveBeenCalled();
    expect(resumesRepository.createAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({ resumeId: 'resume-id', status: 'pending' })
    );
    expect(enqueueResumeAnalysis).toHaveBeenCalledWith({
      resumeId: 'resume-id',
      analysisId: 'analysis-id',
      studentId: 'test-student-id'
    });
  });

  it('cleans up storage object when DB insert fails', async () => {
    (resumesRepository.create as jest.Mock).mockRejectedValueOnce(new Error('db failed'));

    const res = await request(app)
      .post('/api/v1/resumes')
      .set('x-test-role', Role.STUDENT)
      .attach('file', pdfBuffer, { filename: 'resume.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(500);
    expect(resumeStorage.deleteObject).toHaveBeenCalled();
  });

  it('POST /api/v1/resumes as COMPANY -> 403 INSUFFICIENT_ROLE', async () => {
    const res = await request(app)
      .post('/api/v1/resumes')
      .set('x-test-role', Role.COMPANY)
      .attach('file', pdfBuffer, { filename: 'resume.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.INSUFFICIENT_ROLE);
  });
});
