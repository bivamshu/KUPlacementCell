import { AppError } from '../../utils/AppError';
import { JOB_ERROR_CODES } from './jobs.constants';

export function jobNotFoundError(message = 'Job not found'): AppError {
  return new AppError(message, 404, JOB_ERROR_CODES.JOB_NOT_FOUND);
}

export function jobForbiddenError(message = 'Job access forbidden'): AppError {
  return new AppError(message, 403, JOB_ERROR_CODES.JOB_FORBIDDEN);
}

export function invalidJobPayloadError(message = 'Invalid job payload'): AppError {
  return new AppError(message, 400, JOB_ERROR_CODES.INVALID_JOB_PAYLOAD);
}

export function invalidJobTransitionError(message = 'Invalid job status transition'): AppError {
  return new AppError(message, 409, JOB_ERROR_CODES.INVALID_JOB_TRANSITION);
}

export function savedJobNotFoundError(message = 'Saved job not found'): AppError {
  return new AppError(message, 404, JOB_ERROR_CODES.SAVED_JOB_NOT_FOUND);
}

export function jobNotImplementedError(message = 'Jobs handler not implemented yet (Phase 6 B2+)'): AppError {
  return new AppError(message, 501, JOB_ERROR_CODES.NOT_IMPLEMENTED);
}
