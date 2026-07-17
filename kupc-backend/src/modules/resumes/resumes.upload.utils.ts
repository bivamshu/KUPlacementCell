import path from 'path';
import { RESUME_ERROR_CODES } from './resumes.constants';
import { AppError } from '../../utils/AppError';

const PDF_MAGIC = '%PDF-';

export function sanitizeResumeFileName(originalName: string): string {
  const base = path.basename(originalName).replace(/[^\w.\-() ]+/g, '_').trim();
  const withExt = base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
  return withExt.slice(0, 200);
}

export function assertValidPdfBuffer(buffer: Buffer): void {
  if (buffer.length < 5 || buffer.subarray(0, 5).toString('utf8') !== PDF_MAGIC) {
    throw new AppError('Only PDF resumes are allowed', 400, RESUME_ERROR_CODES.RESUME_INVALID_TYPE);
  }
}

export function mapMulterUploadError(error: unknown): AppError | null {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const err = error as { code?: string; message?: string };

  if (err.code === 'LIMIT_FILE_SIZE') {
    return new AppError('Resume file exceeds maximum size', 400, RESUME_ERROR_CODES.RESUME_TOO_LARGE);
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return new AppError('Resume upload must use field name "file"', 400, 'VALIDATION_ERROR');
  }

  if (error instanceof AppError) {
    return error;
  }

  return null;
}
