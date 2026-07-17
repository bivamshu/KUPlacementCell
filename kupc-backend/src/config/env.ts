import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/** Treat blank .env values as unset so optional fields don't fail Zod. */
const emptyToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());
const optionalNonEmpty = z.preprocess(emptyToUndefined, z.string().min(1).optional());
const optionalEmail = z.preprocess(emptyToUndefined, z.string().email().optional());
const optionalTotp = z.preprocess(emptyToUndefined, z.string().min(16).optional());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  JWT_EXPIRES_IN: z.string().min(1).default('15m'),
  REFRESH_EXPIRES_IN: z.string().min(1).default('30d'),
  OTP_LENGTH: z.coerce.number().int().positive().default(6),
  OTP_EXPIRES_IN: z.string().min(1).default('10m'),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  KU_EMAIL_DOMAIN: z.string().min(1).default('ku.edu.np'),
  AUTH_USER_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(30),
  REDIS_URL: optionalUrl,
  OTP_EMAIL_ENABLED: z.coerce.boolean().default(false),
  SMTP_HOST: optionalNonEmpty,
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: optionalNonEmpty,
  SMTP_PASS: optionalNonEmpty,
  SMTP_FROM: optionalEmail,
  ADMIN_PASSWORD_LOGIN_ENABLED: z.coerce.boolean().default(false),
  ADMIN_TOTP_SECRET: optionalTotp,
  RESUME_MAX_BYTES: z.coerce.number().int().positive().default(5_242_880),
  RESUME_STORAGE_BUCKET: z.string().min(1).default('resumes'),
  PROFILE_IMAGE_MAX_BYTES: z.coerce.number().int().positive().default(2_097_152),
  AVATAR_STORAGE_BUCKET: z.string().min(1).default('avatars'),
  COMPANY_LOGO_STORAGE_BUCKET: z.string().min(1).default('company-logos'),
  RESUME_ANALYSIS_QUEUE_CONCURRENCY: z.coerce.number().int().positive().default(3),
  RESUME_ANALYSIS_JOB_ATTEMPTS: z.coerce.number().int().positive().default(3),
  RESUME_ANALYSIS_BACKOFF_MS: z.coerce.number().int().positive().default(5_000),
  RESUME_MIN_EXTRACT_CHARS: z.coerce.number().int().positive().default(100),
  OPENAI_API_KEY: optionalNonEmpty,
  OPENAI_MODEL: z.string().min(1).default('gpt-4o-mini'),
  OPENAI_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000)
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const details = parsedEnv.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');

  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = parsedEnv.data;
