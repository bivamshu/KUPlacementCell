import { env } from '../../config/env';
import { supabaseAdmin, supabaseAnon } from '../../config/supabase';
import { companiesRepository } from '../../database/companies.repository';
import { companyRequestsRepository } from '../../database/companyRequests.repository';
import { refreshTokensRepository } from '../../database/refreshTokens.repository';
import { sessionsRepository } from '../../database/sessions.repository';
import { studentsRepository } from '../../database/students.repository';
import { studentOtpsRepository } from '../../database/studentOtps.repository';
import { usersRepository } from '../../database/users.repository';
import { addSeconds, generateNumericOtp, generateSecureToken, hashToken, parseDurationToSeconds } from '../../utils/auth';
import { AppError } from '../../utils/AppError';
import { signAccessToken } from '../../utils/jwt';
import { AUTH_ERROR_CODES, Role } from './auth.constants';
import {
  AdminLoginInput,
  CompanyVerificationDocumentInput,
  LoginInput,
  RegisterCompanyInput,
  RegisterStudentInput,
  VerifyOtpInput
} from './auth.validation';

type RequestContext = {
  ipAddress?: string;
  deviceInfo?: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getKuId(email: string): string {
  return email.split('@')[0];
}

function getOtpExpiresInSeconds(): number {
  return parseDurationToSeconds(env.OTP_EXPIRES_IN);
}

function getRefreshExpiresInSeconds(): number {
  return parseDurationToSeconds(env.REFRESH_EXPIRES_IN);
}

async function issueTokenPair(
  user: {
    id: string;
    email: string;
    role: Role;
    email_verified: boolean;
    status: string;
  },
  context: RequestContext
): Promise<{
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    role: Role;
    email_verified: boolean;
    status: string;
    verification_status?: string;
  };
}> {
  const refreshExpiresAt = addSeconds(new Date(), getRefreshExpiresInSeconds());
  const session = await sessionsRepository.create({
    userId: user.id,
    deviceInfo: context.deviceInfo,
    ipAddress: context.ipAddress,
    expiresAt: refreshExpiresAt
  });

  const refreshToken = generateSecureToken();
  await refreshTokensRepository.create({
    userId: user.id,
    sessionId: session.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshExpiresAt
  });

  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    email: user.email,
    sessionId: session.id
  });

  const company = user.role === Role.COMPANY ? await companiesRepository.findByUserId(user.id) : null;

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      email_verified: user.email_verified,
      status: user.status,
      verification_status: company?.verification_status
    }
  };
}

async function deliverStudentOtp(email: string, otp: string): Promise<void> {
  if (env.NODE_ENV !== 'production') {
    console.log(`Student OTP for ${email}: ${otp}`);
  }
}

function mapRegistrationError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const message = error instanceof Error ? error.message : 'Student registration failed';

  if (message.toLowerCase().includes('already') || message.toLowerCase().includes('duplicate')) {
    return new AppError('Email is already registered', 409, AUTH_ERROR_CODES.EMAIL_ALREADY_REGISTERED);
  }

  return new AppError(message, 500);
}

async function loginWithPassword(
  input: LoginInput,
  context: RequestContext,
  allowedRoles: Role[]
): Promise<Awaited<ReturnType<typeof issueTokenPair>>> {
  const email = normalizeEmail(input.email);
  const { data: authData, error } = await supabaseAnon.auth.signInWithPassword({
    email,
    password: input.password
  });

  if (error) {
    throw new AppError('Invalid credentials', 401, AUTH_ERROR_CODES.INVALID_CREDENTIALS);
  }

  let user = await usersRepository.findByEmail(email);

  if (!user) {
    throw new AppError('Invalid credentials', 401, AUTH_ERROR_CODES.INVALID_CREDENTIALS);
  }

  if (!allowedRoles.includes(user.role)) {
    throw new AppError('Invalid credentials', 401, AUTH_ERROR_CODES.INVALID_CREDENTIALS);
  }

  if (user.status !== 'active') {
    throw new AppError('Account is suspended', 403, AUTH_ERROR_CODES.ACCOUNT_SUSPENDED);
  }

  if (user.role === Role.STUDENT && !user.email_verified) {
    throw new AppError('Account is not verified', 403, AUTH_ERROR_CODES.ACCOUNT_NOT_VERIFIED);
  }

  const supabaseEmailVerified = Boolean(authData.user?.email_confirmed_at);
  const shouldSyncEmailVerification = user.role !== Role.STUDENT && supabaseEmailVerified && !user.email_verified;

  if (shouldSyncEmailVerification) {
    user = await usersRepository.updateEmailVerified(user.id, true);
  }

  return issueTokenPair(user, context);
}

export const authService = {
  async registerStudent(input: RegisterStudentInput): Promise<{ otp_sent: boolean; expires_in: number }> {
    const email = normalizeEmail(input.email);
    const existingUser = await usersRepository.findByEmail(email);

    if (existingUser) {
      throw new AppError('Email is already registered', 409, AUTH_ERROR_CODES.EMAIL_ALREADY_REGISTERED);
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: false,
      user_metadata: {
        full_name: input.full_name,
        role: Role.STUDENT
      }
    });

    if (authError || !authData.user) {
      throw mapRegistrationError(authError);
    }

    try {
      await usersRepository.createStudentUser({ id: authData.user.id, email });
      await studentsRepository.create({
        id: authData.user.id,
        kuId: getKuId(email),
        fullName: input.full_name
      });

      const otp = generateNumericOtp(env.OTP_LENGTH);
      const expiresIn = getOtpExpiresInSeconds();

      await studentOtpsRepository.create({
        email,
        otpHash: hashToken(otp),
        expiresAt: addSeconds(new Date(), expiresIn)
      });

      await deliverStudentOtp(email, otp);

      return {
        otp_sent: true,
        expires_in: expiresIn
      };
    } catch (error) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw mapRegistrationError(error);
    }
  },

  async verifyStudentOtp(input: VerifyOtpInput, context: RequestContext): Promise<{
    access_token: string;
    refresh_token: string;
    user: {
      id: string;
      email: string;
      role: Role;
      email_verified: boolean;
      status: string;
    };
  }> {
    const email = normalizeEmail(input.email);
    const otpRecord = await studentOtpsRepository.findLatestActiveByEmail(email);

    if (!otpRecord) {
      throw new AppError('Invalid OTP', 400, AUTH_ERROR_CODES.INVALID_OTP);
    }

    if (new Date(otpRecord.expires_at).getTime() <= Date.now()) {
      throw new AppError('OTP has expired', 400, AUTH_ERROR_CODES.OTP_EXPIRED);
    }

    if (otpRecord.attempts >= env.OTP_MAX_ATTEMPTS) {
      throw new AppError('Invalid OTP', 400, AUTH_ERROR_CODES.INVALID_OTP);
    }

    if (hashToken(input.otp) !== otpRecord.otp_hash) {
      await studentOtpsRepository.incrementAttempts(otpRecord.id, otpRecord.attempts + 1);
      throw new AppError('Invalid OTP', 400, AUTH_ERROR_CODES.INVALID_OTP);
    }

    const user = await usersRepository.findByEmail(email);

    if (!user || user.role !== Role.STUDENT) {
      throw new AppError('Invalid OTP', 400, AUTH_ERROR_CODES.INVALID_OTP);
    }

    const verifiedUser = await usersRepository.markEmailVerified(user.id);
    await studentOtpsRepository.consume(otpRecord.id);

    return issueTokenPair(verifiedUser, context);
  },

  async registerCompany(input: RegisterCompanyInput): Promise<{ company_id: string; verification_status: 'pending' | 'approved' | 'rejected' }> {
    const email = normalizeEmail(input.email);
    const existingUser = await usersRepository.findByEmail(email);

    if (existingUser) {
      throw new AppError('Email is already registered', 409, AUTH_ERROR_CODES.EMAIL_ALREADY_REGISTERED);
    }

    const { data: authData, error: authError } = await supabaseAnon.auth.signUp({
      email,
      password: input.password,
      options: {
        data: {
          company_name: input.company_name,
          role: Role.COMPANY
        }
      }
    });

    if (authError || !authData.user) {
      throw mapRegistrationError(authError);
    }

    try {
      await usersRepository.createCompanyUser({
        id: authData.user.id,
        email,
        emailVerified: Boolean(authData.user.email_confirmed_at)
      });

      const company = await companiesRepository.create({
        id: authData.user.id,
        companyName: input.company_name,
        website: input.website
      });

      return {
        company_id: company.id,
        verification_status: company.verification_status
      };
    } catch (error) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw mapRegistrationError(error);
    }
  },

  async createCompanyVerificationDocument(
    userId: string,
    input: CompanyVerificationDocumentInput
  ): Promise<{ request_id: string; status: 'pending' | 'approved' | 'rejected' }> {
    const company = await companiesRepository.findByUserId(userId);

    if (!company) {
      throw new AppError('Company account required', 403, AUTH_ERROR_CODES.INSUFFICIENT_ROLE);
    }

    const request = await companyRequestsRepository.create({
      companyId: company.id,
      documentType: input.document_type,
      fileUrl: input.file_url
    });

    return {
      request_id: request.id,
      status: request.status
    };
  },

  async login(input: LoginInput, context: RequestContext): Promise<Awaited<ReturnType<typeof issueTokenPair>>> {
    return loginWithPassword(input, context, [Role.STUDENT, Role.COMPANY]);
  },

  async adminLogin(input: AdminLoginInput, context: RequestContext): Promise<Awaited<ReturnType<typeof issueTokenPair>>> {
    if (!input.totp_code && !env.ADMIN_PASSWORD_LOGIN_ENABLED) {
      throw new AppError('Admin TOTP is required', 501, 'ADMIN_TOTP_NOT_CONFIGURED');
    }

    if (input.totp_code) {
      throw new AppError('Admin TOTP verification is not implemented yet', 501, 'ADMIN_TOTP_NOT_CONFIGURED');
    }

    return loginWithPassword(input, context, [Role.ADMIN]);
  }
};
