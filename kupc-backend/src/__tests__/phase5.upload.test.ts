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

jest.mock('../config/profileImageStorage', () => {
  const actual = jest.requireActual('../config/profileImageStorage');
  return {
    ...actual,
    profileImageStorage: {
      uploadImage: jest.fn(),
      deleteObject: jest.fn()
    }
  };
});

jest.mock('../database/students.repository', () => ({
  studentsRepository: {
    findById: jest.fn(),
    updateProfile: jest.fn()
  }
}));

jest.mock('../database/companies.repository', () => ({
  companiesRepository: {
    findByUserId: jest.fn(),
    updateProfile: jest.fn()
  }
}));

jest.mock('../database/resumes.repository', () => ({
  resumesRepository: {
    findById: jest.fn().mockResolvedValue(null)
  }
}));

import app from '../app';
import { profileImageStorage } from '../config/profileImageStorage';
import { companiesRepository } from '../database/companies.repository';
import { studentsRepository } from '../database/students.repository';
import { PROFILE_IMAGE_ERROR_CODES } from '../middleware/profileImageUpload';
import { AUTH_ERROR_CODES, Role } from '../modules/auth';

jest.mock('../middleware/authenticate', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    const role = req.get('x-test-role');

    if (!role) {
      const { UnauthorizedError } = require('../utils/AppError');
      return next(new UnauthorizedError(AUTH_ERROR_CODES.MISSING_TOKEN, 'Missing token'));
    }

    req.user = {
      id: '550e8400-e29b-41d4-a716-446655440030',
      sessionId: 'session-1',
      role,
      email: 'user@ku.edu.np',
      emailVerified: true,
      status: 'active'
    };

    next();
  }
}));

const userId = '550e8400-e29b-41d4-a716-446655440030';

const PNG_BUFFER = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(64)
]);

const studentRecord = {
  id: userId,
  ku_id: '078bct000',
  full_name: 'Test Student',
  graduation_year: null,
  department: null,
  phone: null,
  degree: null,
  cgpa: null,
  bio: null,
  profile_picture_url: 'https://test.supabase.co/storage/v1/object/public/avatars/old/1.png',
  resume_id: null,
  created_at: '2026-07-10T10:00:00.000Z',
  updated_at: '2026-07-11T10:00:00.000Z'
};

const companyRecord = {
  id: userId,
  company_name: 'Acme Corp',
  website: null,
  verification_status: 'pending' as const,
  verified_at: null,
  industry: null,
  description: null,
  logo_url: null,
  created_at: '2026-07-10T10:00:00.000Z',
  updated_at: '2026-07-11T10:00:00.000Z'
};

const uploadedUrl = 'https://test.supabase.co/storage/v1/object/public/avatars/new/2.png';

describe('Phase 5 Milestone B3 - avatar & logo uploads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (studentsRepository.findById as jest.Mock).mockResolvedValue(studentRecord);
    (studentsRepository.updateProfile as jest.Mock).mockImplementation(async (_id, input) => ({
      ...studentRecord,
      profile_picture_url: input.profilePictureUrl
    }));
    (companiesRepository.findByUserId as jest.Mock).mockResolvedValue(companyRecord);
    (companiesRepository.updateProfile as jest.Mock).mockImplementation(async (_id, input) => ({
      ...companyRecord,
      logo_url: input.logoUrl
    }));
    (profileImageStorage.uploadImage as jest.Mock).mockResolvedValue(uploadedUrl);
    (profileImageStorage.deleteObject as jest.Mock).mockResolvedValue(undefined);
  });

  it('POST /students/me/avatar stores image and persists URL', async () => {
    const res = await request(app)
      .post('/api/v1/students/me/avatar')
      .set('x-test-role', Role.STUDENT)
      .attach('file', PNG_BUFFER, { filename: 'avatar.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(profileImageStorage.uploadImage).toHaveBeenCalledWith(
      'avatar',
      expect.stringMatching(new RegExp(`^${userId}/\\d+\\.png$`)),
      expect.any(Buffer),
      'image/png'
    );
    expect(studentsRepository.updateProfile).toHaveBeenCalledWith(userId, {
      profilePictureUrl: uploadedUrl
    });
    expect(res.body?.data?.profile_picture_url).toBe(uploadedUrl);
  });

  it('POST /students/me/avatar best-effort deletes previous avatar', async () => {
    await request(app)
      .post('/api/v1/students/me/avatar')
      .set('x-test-role', Role.STUDENT)
      .attach('file', PNG_BUFFER, { filename: 'avatar.png', contentType: 'image/png' });

    expect(profileImageStorage.deleteObject).toHaveBeenCalledWith('avatar', 'old/1.png');
  });

  it('POST /students/me/avatar rejects non-image mime -> 400 INVALID_FILE_TYPE', async () => {
    const res = await request(app)
      .post('/api/v1/students/me/avatar')
      .set('x-test-role', Role.STUDENT)
      .attach('file', Buffer.from('%PDF-1.4'), {
        filename: 'resume.pdf',
        contentType: 'application/pdf'
      });

    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe(PROFILE_IMAGE_ERROR_CODES.INVALID_FILE_TYPE);
    expect(profileImageStorage.uploadImage).not.toHaveBeenCalled();
  });

  it('POST /students/me/avatar rejects renamed non-image buffer -> 400', async () => {
    const res = await request(app)
      .post('/api/v1/students/me/avatar')
      .set('x-test-role', Role.STUDENT)
      .attach('file', Buffer.from('not really an image'), {
        filename: 'fake.png',
        contentType: 'image/png'
      });

    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe(PROFILE_IMAGE_ERROR_CODES.INVALID_FILE_TYPE);
    expect(profileImageStorage.uploadImage).not.toHaveBeenCalled();
  });

  it('POST /students/me/avatar without file -> 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/students/me/avatar')
      .set('x-test-role', Role.STUDENT);

    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
  });

  it('POST /students/me/avatar as COMPANY -> 403', async () => {
    const res = await request(app)
      .post('/api/v1/students/me/avatar')
      .set('x-test-role', Role.COMPANY)
      .attach('file', PNG_BUFFER, { filename: 'avatar.png', contentType: 'image/png' });

    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.INSUFFICIENT_ROLE);
  });

  it('POST /companies/me/logo stores image and persists URL', async () => {
    const res = await request(app)
      .post('/api/v1/companies/me/logo')
      .set('x-test-role', Role.COMPANY)
      .attach('file', PNG_BUFFER, { filename: 'logo.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(profileImageStorage.uploadImage).toHaveBeenCalledWith(
      'logo',
      expect.stringMatching(new RegExp(`^${userId}/\\d+\\.png$`)),
      expect.any(Buffer),
      'image/png'
    );
    expect(companiesRepository.updateProfile).toHaveBeenCalledWith(userId, {
      logoUrl: uploadedUrl
    });
    expect(res.body?.data?.logo_url).toBe(uploadedUrl);
  });

  it('POST /companies/me/logo as STUDENT -> 403', async () => {
    const res = await request(app)
      .post('/api/v1/companies/me/logo')
      .set('x-test-role', Role.STUDENT)
      .attach('file', PNG_BUFFER, { filename: 'logo.png', contentType: 'image/png' });

    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES.INSUFFICIENT_ROLE);
  });

  it('storage failure surfaces 500 STORAGE_UPLOAD_FAILED and does not update profile', async () => {
    (profileImageStorage.uploadImage as jest.Mock).mockRejectedValue(new Error('boom'));

    const res = await request(app)
      .post('/api/v1/students/me/avatar')
      .set('x-test-role', Role.STUDENT)
      .attach('file', PNG_BUFFER, { filename: 'avatar.png', contentType: 'image/png' });

    expect(res.status).toBe(500);
    expect(res.body?.error?.code).toBe('STORAGE_UPLOAD_FAILED');
    expect(studentsRepository.updateProfile).not.toHaveBeenCalled();
  });
});
