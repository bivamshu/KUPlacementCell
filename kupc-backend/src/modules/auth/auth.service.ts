import { env } from '../../config/env';
import { supabaseAdmin } from '../../config/supabase';
import { refreshTokensRepository } from '../../database/refreshTokens.repository';
import { sessionsRepository } from '../../database/sessions.repository';
import { studentsRepository } from '../../database/students.repository';
import { studentOtpsRepository } from '../../database/studentOtps.repository';
import { usersRepository } from '../../database/users.repository';
import { addSeconds, generateNumericOtp, generateSecureToken, hashToken, parseDurationToSeconds } from '../../utils/auth';
import { AppError } from '../../utils/AppError';
import { signAccessToken } from '../../utils/jwt';
import { AUTH_ERROR_CODES, Role } from './auth.constants';
import { RegisterStudentInput, VerifyOtpInput } from './auth.validation';

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

    const refreshExpiresAt = addSeconds(new Date(), getRefreshExpiresInSeconds());
    const session = await sessionsRepository.create({
      userId: verifiedUser.id,
      deviceInfo: context.deviceInfo,
      ipAddress: context.ipAddress,
      expiresAt: refreshExpiresAt
    });

    const refreshToken = generateSecureToken();
    await refreshTokensRepository.create({
      userId: verifiedUser.id,
      sessionId: session.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshExpiresAt
    });

    const accessToken = signAccessToken({
      sub: verifiedUser.id,
      role: verifiedUser.role,
      email: verifiedUser.email,
      sessionId: session.id
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: verifiedUser.id,
        email: verifiedUser.email,
        role: verifiedUser.role,
        email_verified: verifiedUser.email_verified,
        status: verifiedUser.status
      }
    };
  }
};
