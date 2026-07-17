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

jest.mock('../database/resumes.repository', () => ({
  resumesRepository: {
    listByStudent: jest.fn(),
    findById: jest.fn(),
    findAnalysisByResumeId: jest.fn(),
    deleteById: jest.fn()
  }
}));

jest.mock('../database/students.repository', () => ({
  studentsRepository: {
    findById: jest.fn()
  }
}));

jest.mock('../config/resumeStorage', () => ({
  resumeStorage: {
    deleteObject: jest.fn()
  }
}));

jest.mock('../queues/resumeAnalysis.queue', () => ({
  enqueueResumeAnalysis: jest.fn()
}));

import app from '../app';
import { resumeStorage } from '../config/resumeStorage';
import { resumesRepository } from '../database/resumes.repository';
import { studentsRepository } from '../database/students.repository';
import { AUTH_ERROR_CODES, Role } from '../modules/auth';
import { AnalysisStatus, RESUME_ERROR_CODES } from '../modules/resumes';

jest.mock('../middleware/authenticate', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    const role = req.get('x-test-role');

    if (!role) {
      const { UnauthorizedError } = require('../utils/AppError');
      return next(new UnauthorizedError(AUTH_ERROR_CODES.MISSING_TOKEN, 'Missing token'));
    }

    req.user = {
      id: 'student-1',
      sessionId: 'session-1',
      role,
      email: 'student@ku.edu.np',
      emailVerified: true,
      status: 'active'
    };

    next();
  }
}));

const resumeId = '550e8400-e29b-41d4-a716-446655440001';
const analysisId = '550e8400-e29b-41d4-a716-446655440002';

const resumeRecord = {
  id: resumeId,
  student_id: 'student-1',
  file_url: 'student-1/resume-1/resume.pdf',
  file_name: 'resume.pdf',
  uploaded_at: '2026-07-11T10:00:00.000Z'
};

describe('Phase 4 Milestone 8 - resume read APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (studentsRepository.findById as jest.Mock).mockResolvedValue({
      id: 'student-1',
      resume_id: resumeId
    });
  });

  it('GET /api/v1/resumes lists student resumes with is_active', async () => {
    (resumesRepository.listByStudent as jest.Mock).mockResolvedValue([resumeRecord]);

    const res = await request(app).get('/api/v1/resumes').set('x-test-role', Role.STUDENT);

    expect(res.status).toBe(200);
    expect(res.body?.data).toEqual([
      {
        id: resumeId,
        file_name: 'resume.pdf',
        file_url: 'student-1/resume-1/resume.pdf',
        uploaded_at: '2026-07-11T10:00:00.000Z',
        is_active: true
      }
    ]);
  });

  it('GET /api/v1/resumes/:id returns owned resume metadata', async () => {
    (resumesRepository.findById as jest.Mock).mockResolvedValue(resumeRecord);

    const res = await request(app)
      .get(`/api/v1/resumes/${resumeId}`)
      .set('x-test-role', Role.STUDENT);

    expect(res.status).toBe(200);
    expect(res.body?.data?.id).toBe(resumeId);
    expect(res.body?.data?.is_active).toBe(true);
  });

  it('GET /api/v1/resumes/:id returns 404 for non-owner', async () => {
    (resumesRepository.findById as jest.Mock).mockResolvedValue({
      ...resumeRecord,
      student_id: 'other-student'
    });

    const res = await request(app)
      .get(`/api/v1/resumes/${resumeId}`)
      .set('x-test-role', Role.STUDENT);

    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe(RESUME_ERROR_CODES.RESUME_NOT_FOUND);
  });

  it('GET /api/v1/resumes/:id/analysis returns pending status for polling', async () => {
    (resumesRepository.findById as jest.Mock).mockResolvedValue(resumeRecord);
    (resumesRepository.findAnalysisByResumeId as jest.Mock).mockResolvedValue({
      id: analysisId,
      resume_id: resumeId,
      status: AnalysisStatus.PENDING,
      error_message: null
    });

    const res = await request(app)
      .get(`/api/v1/resumes/${resumeId}/analysis`)
      .set('x-test-role', Role.STUDENT);

    expect(res.status).toBe(200);
    expect(res.body?.data).toMatchObject({
      analysisId,
      resumeId,
      status: 'pending',
      result: null
    });
  });

  it('GET /api/v1/resumes/:id/analysis returns completed result', async () => {
    (resumesRepository.findById as jest.Mock).mockResolvedValue(resumeRecord);
    (resumesRepository.findAnalysisByResumeId as jest.Mock).mockResolvedValue({
      id: analysisId,
      resume_id: resumeId,
      status: AnalysisStatus.COMPLETED,
      error_message: null,
      ats_score: 72,
      grade: 'B',
      score_breakdown: [{ category: 'skills', label: 'Skills', score: 18, max_score: 25 }],
      extracted_skills: { languages: ['Python'], frameworks: [], databases: [], cloud: [], data_ml: [], other: [] },
      summary: 'Strong resume',
      strengths: ['Clear skills'],
      suggestions: [],
      issues_identified: []
    });

    const res = await request(app)
      .get(`/api/v1/resumes/${resumeId}/analysis`)
      .set('x-test-role', Role.STUDENT);

    expect(res.status).toBe(200);
    expect(res.body?.data?.status).toBe('completed');
    expect(res.body?.data?.result?.ats_score?.total_score).toBe(72);
  });

  it('GET /api/v1/resumes/:id/analysis returns 404 when no analysis row', async () => {
    (resumesRepository.findById as jest.Mock).mockResolvedValue(resumeRecord);
    (resumesRepository.findAnalysisByResumeId as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get(`/api/v1/resumes/${resumeId}/analysis`)
      .set('x-test-role', Role.STUDENT);

    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe(RESUME_ERROR_CODES.ANALYSIS_NOT_FOUND);
  });

  it('DELETE /api/v1/resumes/:id removes storage object and DB row', async () => {
    (resumesRepository.findById as jest.Mock).mockResolvedValue(resumeRecord);
    (resumeStorage.deleteObject as jest.Mock).mockResolvedValue(undefined);
    (resumesRepository.deleteById as jest.Mock).mockResolvedValue(undefined);

    const res = await request(app)
      .delete(`/api/v1/resumes/${resumeId}`)
      .set('x-test-role', Role.STUDENT);

    expect(res.status).toBe(200);
    expect(res.body?.data?.deleted).toBe(true);
    expect(resumeStorage.deleteObject).toHaveBeenCalledWith('student-1/resume-1/resume.pdf');
    expect(resumesRepository.deleteById).toHaveBeenCalledWith(resumeId);
  });

  it('GET /api/v1/resumes as COMPANY -> 403', async () => {
    const res = await request(app).get('/api/v1/resumes').set('x-test-role', Role.COMPANY);
    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.INSUFFICIENT_ROLE);
  });
});
