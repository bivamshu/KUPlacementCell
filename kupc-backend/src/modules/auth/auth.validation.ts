import { z } from 'zod';
import { env } from '../../config/env';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/\d/, 'Password must contain at least one number');

const kuEmailSchema = z
  .string()
  .email()
  .refine(
    (email) => {
      const domain = email.toLowerCase().split('@')[1] ?? '';
      return domain === env.KU_EMAIL_DOMAIN || domain.endsWith(`.${env.KU_EMAIL_DOMAIN}`);
    },
    {
      message: 'Email must use the KU institutional domain'
    }
  );

export const registerStudentSchema = z.object({
  body: z
    .object({
      email: kuEmailSchema,
      full_name: z.string().min(2).max(100),
      password: passwordSchema
    })
    .strip()
});

export const registerCompanySchema = z.object({
  body: z
    .object({
      company_name: z.string().min(2).max(150),
      email: z.string().email(),
      password: passwordSchema,
      website: z.string().url().optional()
    })
    .strip()
});

export const companyVerificationDocumentSchema = z.object({
  body: z
    .object({
      document_type: z.string().min(2).max(100),
      file_url: z.string().url().or(z.literal(''))
    })
    .strip()
});

export const verifyOtpSchema = z.object({
  body: z
    .object({
      email: z.string().email(),
      otp: z.string().regex(new RegExp(`^\\d{${env.OTP_LENGTH}}$`))
    })
    .strip()
});

export const loginSchema = z.object({
  body: z
    .object({
      email: z.string().email(),
      password: z.string().min(1)
    })
    .strip()
});

export const adminLoginSchema = z.object({
  body: z
    .object({
      email: z.string().email(),
      password: z.string().min(1),
      totp_code: z.string().regex(/^\d{6}$/).optional()
    })
    .strip()
});

export const refreshTokensSchema = z.object({
  body: z
    .object({
      // Keep optional so service can return stable 401 errors for missing token.
      refresh_token: z.string().min(1).optional()
    })
    .strip()
});

export const logoutSchema = z.object({
  body: z
    .object({
      refresh_token: z.string().min(1)
    })
    .strip()
});

export type RegisterStudentInput = z.infer<typeof registerStudentSchema>['body'];
export type RegisterCompanyInput = z.infer<typeof registerCompanySchema>['body'];
export type CompanyVerificationDocumentInput = z.infer<typeof companyVerificationDocumentSchema>['body'];
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type AdminLoginInput = z.infer<typeof adminLoginSchema>['body'];
export type RefreshTokensInput = z.infer<typeof refreshTokensSchema>['body'];
export type LogoutInput = z.infer<typeof logoutSchema>['body'];
