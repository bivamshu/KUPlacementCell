import { ApiError } from '../api/errors';

const CODE_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Incorrect email or password.',
  ACCOUNT_NOT_VERIFIED: 'Please verify your email with the OTP before logging in.',
  ACCOUNT_SUSPENDED: 'This account has been suspended.',
  EMAIL_ALREADY_REGISTERED: 'That email is already registered.',
  INVALID_EMAIL_DOMAIN: 'Students must use a KU institutional email.',
  INVALID_OTP: 'That OTP is invalid. Check the code and try again.',
  OTP_EXPIRED: 'That OTP has expired. Register again to get a new code.',
  MISSING_TOKEN: 'Your session expired. Please sign in again.',
  INVALID_TOKEN: 'Your session is invalid. Please sign in again.',
  TOKEN_EXPIRED: 'Your session expired. Please sign in again.',
  INSUFFICIENT_ROLE: 'You do not have permission to do that.',
  STUDENT_NOT_FOUND: 'Student profile not found.',
  COMPANY_NOT_FOUND: 'Company profile not found.',
  VALIDATION_ERROR: 'Please check the form fields and try again.',
  INVALID_FILE_TYPE: 'Only JPEG, PNG, or WebP images are allowed (PDF for resumes).',
  FILE_TOO_LARGE: 'That file is too large.',
  RESUME_INVALID_TYPE: 'Only PDF resumes are allowed.',
  RESUME_TOO_LARGE: 'Resume exceeds the maximum size.',
  STORAGE_UPLOAD_FAILED: 'Upload failed. Please try again.',
};

export function messageFromError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof ApiError) {
    return CODE_MESSAGES[error.code] ?? error.message ?? fallback;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
