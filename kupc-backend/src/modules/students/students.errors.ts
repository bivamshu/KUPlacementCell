import { AppError } from '../../utils/AppError';
import { STUDENT_ERROR_CODES } from './students.constants';

export function studentNotFoundError(message = 'Student not found'): AppError {
  return new AppError(message, 404, STUDENT_ERROR_CODES.STUDENT_NOT_FOUND);
}

export function studentProfileForbiddenError(message = 'Student profile access forbidden'): AppError {
  return new AppError(message, 403, STUDENT_ERROR_CODES.STUDENT_PROFILE_FORBIDDEN);
}

export function invalidProfilePayloadError(message = 'Invalid student profile payload'): AppError {
  return new AppError(message, 400, STUDENT_ERROR_CODES.INVALID_PROFILE_PAYLOAD);
}
