import { env } from '../../config/env';
import { supabaseAdmin, supabaseAnon } from '../../config/supabase';
import { companiesRepository } from '../../database/companies.repository';
import { companyRequestsRepository } from '../../database/companyRequests.repository';
import { refreshTokensRepository } from '../../database/refreshTokens.repository';
import { sessionsRepository } from '../../database/sessions.repository';
import { studentOtpsRepository } from '../../database/studentOtps.repository';
import { usersRepository } from '../../database/users.repository';
import { authUserCache } from '../../middleware/authUserCache';
import { addSeconds, generateNumericOtp, generateSecureToken, hashToken, parseDurationToSeconds } from '../../utils/auth';
import { AppError, UnauthorizedError } from '../../utils/AppError';
import { sendStudentOtpEmail } from '../../utils/email';
import { signAccessToken } from '../../utils/jwt';
import { verifyAdminTotp } from '../../utils/totp';
import { AUTH_ERROR_CODES, Role } from './auth.constants';
import { AuthenticatedUser } from './auth.types';
import {
  AdminLoginInput,
  CompanyVerificationDocumentInput,
  LoginInput,
  RegisterCompanyInput,
  RegisterStudentInput,
  VerifyOtpInput
} from './auth.validation';

type LogoutInput = {
  refresh_token: string;
};

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
  await sendStudentOtpEmail(email, otp);
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

function isAuthEmailNotConfirmed(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const message = (error.message ?? '').toLowerCase();
  return error.code === 'email_not_confirmed' || message.includes('email not confirmed');
}

async function loginWithPassword(
  input: LoginInput,
  context: RequestContext,
  allowedRoles: Role[]
): Promise<Awaited<ReturnType<typeof issueTokenPair>>> {
  const email = normalizeEmail(input.email);
  let { data: authData, error } = await supabaseAnon.auth.signInWithPassword({
    email,
    password: input.password
  });

  // Self-heal accounts verified in our DB (or companies) but still unconfirmed in Supabase Auth.
  // OTP / company signup used to skip Auth email_confirm, so signInWithPassword looked like a bad password.
  if (error && isAuthEmailNotConfirmed(error)) {
    const existing = await usersRepository.findByEmail(email);

    if (existing?.role === Role.STUDENT && !existing.email_verified) {
      throw new AppError('Account is not verified', 403, AUTH_ERROR_CODES.ACCOUNT_NOT_VERIFIED);
    }

    if (existing && (existing.email_verified || existing.role === Role.COMPANY || existing.role === Role.ADMIN)) {
      const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        email_confirm: true
      });

      if (!confirmError) {
        ({ data: authData, error } = await supabaseAnon.auth.signInWithPassword({
          email,
          password: input.password
        }));
      }
    }
  }

  if (error || !authData.user) {
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
  async getMe(user: AuthenticatedUser): Promise<AuthenticatedUser> {
    return user;
  },

  async logout(user: AuthenticatedUser, input: LogoutInput): Promise<{ logged_out: true }> {
    const tokenRecord = await refreshTokensRepository.findByHash(hashToken(input.refresh_token));

    if (!tokenRecord || tokenRecord.session_id !== user.sessionId || tokenRecord.revoked) {
      throw new UnauthorizedError(AUTH_ERROR_CODES.INVALID_TOKEN, 'Invalid refresh token');
    }

    await refreshTokensRepository.revokeBySessionId(user.sessionId);
    await sessionsRepository.deleteById(user.sessionId);
    await authUserCache.delete(user.id);

    return { logged_out: true };
  },

  async logoutAll(user: AuthenticatedUser): Promise<{ logged_out_all: true; sessions_revoked: true }> {
    await refreshTokensRepository.revokeAllByUserId(user.id);
    await sessionsRepository.deleteAllByUserId(user.id);
    await authUserCache.delete(user.id);

    return {
      logged_out_all: true,
      sessions_revoked: true
    };
  },

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
      await usersRepository.registerStudentProfile({
        id: authData.user.id,
        email,
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

    // Confirm in Supabase Auth so later signInWithPassword works (OTP only marked public.users before).
    const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      email_confirm: true
    });

    if (confirmError) {
      throw new AppError('Failed to confirm account', 500);
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

    // Confirm email in Auth immediately — company approval is separate (verification_status).
    // Public signUp left accounts unconfirmed when Supabase "Confirm email" is enabled.
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        company_name: input.company_name,
        role: Role.COMPANY
      }
    });

    if (authError || !authData.user) {
      throw mapRegistrationError(authError);
    }

    try {
      await usersRepository.registerCompanyProfile({
        id: authData.user.id,
        email,
        companyName: input.company_name,
        website: input.website,
        emailVerified: true
      });

      const company = await companiesRepository.findByUserId(authData.user.id);

      if (!company) {
        throw new AppError('Company registration failed', 500);
      }

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
    if (!env.ADMIN_PASSWORD_LOGIN_ENABLED) {
      if (!input.totp_code) {
        throw new AppError('Admin TOTP is required', 401, AUTH_ERROR_CODES.INVALID_CREDENTIALS);
      }

      if (!env.ADMIN_TOTP_SECRET || !verifyAdminTotp(input.totp_code)) {
        throw new AppError('Invalid admin TOTP', 401, AUTH_ERROR_CODES.INVALID_CREDENTIALS);
      }
    } else if (input.totp_code && env.ADMIN_TOTP_SECRET && !verifyAdminTotp(input.totp_code)) {
      throw new AppError('Invalid admin TOTP', 401, AUTH_ERROR_CODES.INVALID_CREDENTIALS);
    }

    return loginWithPassword(input, context, [Role.ADMIN]);
  },

  async refreshTokens(
    providedRefreshToken: string, 
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
    if (!providedRefreshToken) {
      throw new AppError('Refresh token required', 401, AUTH_ERROR_CODES.INVALID_TOKEN);
    }

    const hashedProvidedToken = hashToken(providedRefreshToken);

    // 1. Look up the token record from your refresh tokens repository
    const tokenRecord = await refreshTokensRepository.findByHash(hashedProvidedToken);
    if (!tokenRecord) {
      throw new AppError('Invalid refresh token', 401, AUTH_ERROR_CODES.INVALID_TOKEN);
    }

    // 2. BREACH DETECTION: If the token was already revoked, treat as reuse.
    if (tokenRecord.revoked) {
      // Wipe the entire parent session family and every child token linked to it.
      await refreshTokensRepository.revokeBySessionId(tokenRecord.session_id);
      await sessionsRepository.deleteById(tokenRecord.session_id);
      throw new AppError(
        'Security breach detected. All sessions revoked.',
        401,
        AUTH_ERROR_CODES.REFRESH_TOKEN_REUSE_DETECTED
      );
    }

    // 3. Verify absolute time expiration thresholds
    if (new Date(tokenRecord.expires_at).getTime() <= Date.now()) {
      throw new AppError('Refresh token has expired', 401, AUTH_ERROR_CODES.TOKEN_EXPIRED);
    }

    // 4. Resolve the user domain profile linked to the session
    const user = await usersRepository.findById(tokenRecord.user_id);
    if (!user || user.status !== 'active') {
      throw new AppError('User profile no longer active', 403, AUTH_ERROR_CODES.ACCOUNT_SUSPENDED);
    }

    // 5. Invalidate the old token record (mark revoked so it can't be reused)
    await refreshTokensRepository.revokeById(tokenRecord.id);

    // 6. Generate a pristine token/session rotation pair
    const refreshExpiresAt = addSeconds(new Date(), getRefreshExpiresInSeconds());
    const newRefreshToken = generateSecureToken();

    // 7. Store the fresh rotated token row under the existing session tree
    await refreshTokensRepository.create({
      userId: user.id,
      sessionId: tokenRecord.session_id,
      tokenHash: hashToken(newRefreshToken),
      expiresAt: refreshExpiresAt
    });

    // 8. Sign an accelerated short-lived access JWT
    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      email: user.email,
      sessionId: tokenRecord.session_id
    });

    const company = user.role === Role.COMPANY ? await companiesRepository.findByUserId(user.id) : null;

    return {
      access_token: accessToken,
      refresh_token: newRefreshToken,
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
};
