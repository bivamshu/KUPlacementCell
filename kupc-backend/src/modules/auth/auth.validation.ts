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

export const verifyOtpSchema = z.object({
  body: z
    .object({
      email: z.string().email(),
      otp: z.string().regex(new RegExp(`^\\d{${env.OTP_LENGTH}}$`))
    })
    .strip()
});

export type RegisterStudentInput = z.infer<typeof registerStudentSchema>['body'];
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>['body'];
