import { apiRequest } from './client';
import type {
  AdminLoginInput,
  AuthMeUser,
  AuthTokens,
  LoginInput,
  RegisterCompanyInput,
  RegisterStudentInput,
  VerifyOtpInput,
} from './types';

export const authApi = {
  registerStudent(input: RegisterStudentInput) {
    return apiRequest<{ otp_sent: boolean; expires_in: number }>('/auth/register/student', {
      method: 'POST',
      body: input,
      skipAuth: true,
    });
  },

  registerCompany(input: RegisterCompanyInput) {
    return apiRequest<{
      company_id: string;
      verification_status: 'pending' | 'approved' | 'rejected';
    }>('/auth/register/company', {
      method: 'POST',
      body: input,
      skipAuth: true,
    });
  },

  verifyOtp(input: VerifyOtpInput) {
    return apiRequest<AuthTokens>('/auth/verify-otp', {
      method: 'POST',
      body: input,
      skipAuth: true,
    });
  },

  login(input: LoginInput) {
    return apiRequest<AuthTokens>('/auth/login', {
      method: 'POST',
      body: input,
      skipAuth: true,
    });
  },

  adminLogin(input: AdminLoginInput) {
    return apiRequest<AuthTokens>('/auth/admin/login', {
      method: 'POST',
      body: input,
      skipAuth: true,
    });
  },

  refresh(refreshToken: string) {
    return apiRequest<AuthTokens>('/auth/refresh', {
      method: 'POST',
      body: { refresh_token: refreshToken },
      skipAuth: true,
    });
  },

  me() {
    return apiRequest<AuthMeUser>('/auth/me', { method: 'GET' });
  },

  logout(refreshToken: string) {
    return apiRequest<{ logged_out: true }>('/auth/logout', {
      method: 'POST',
      body: { refresh_token: refreshToken },
    });
  },

  logoutAll() {
    return apiRequest<{ logged_out_all: true; sessions_revoked: true }>('/auth/logout-all', {
      method: 'POST',
    });
  },
};
