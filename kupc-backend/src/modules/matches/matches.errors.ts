import { AppError } from '../../utils/AppError';
import { MATCH_ERROR_CODES } from './matches.constants';

export function matchNotFoundError(message = 'Match not found'): AppError {
  return new AppError(message, 404, MATCH_ERROR_CODES.MATCH_NOT_FOUND);
}

export function matchForbiddenError(message = 'Match access forbidden'): AppError {
  return new AppError(message, 403, MATCH_ERROR_CODES.MATCH_FORBIDDEN);
}

export function matchConflictError(message = 'Match already exists'): AppError {
  return new AppError(message, 409, MATCH_ERROR_CODES.MATCH_CONFLICT);
}

export function invalidMatchPayloadError(message = 'Invalid match payload'): AppError {
  return new AppError(message, 400, MATCH_ERROR_CODES.INVALID_MATCH_PAYLOAD);
}

export function matchNotImplementedError(
  message = 'Matches handler not implemented yet (Phase 7 B4/B5)'
): AppError {
  return new AppError(message, 501, MATCH_ERROR_CODES.NOT_IMPLEMENTED);
}
