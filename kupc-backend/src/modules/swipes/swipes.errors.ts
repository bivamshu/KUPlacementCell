import { AppError } from '../../utils/AppError';
import { SWIPE_ERROR_CODES } from './swipes.constants';

export function swipeNotFoundError(message = 'Swipe not found'): AppError {
  return new AppError(message, 404, SWIPE_ERROR_CODES.SWIPE_NOT_FOUND);
}

export function swipeConflictError(message = 'Swipe already recorded for this job'): AppError {
  return new AppError(message, 409, SWIPE_ERROR_CODES.SWIPE_CONFLICT);
}

export function swipeJobNotOpenError(message = 'Job is not open for swiping'): AppError {
  return new AppError(message, 409, SWIPE_ERROR_CODES.SWIPE_JOB_NOT_OPEN);
}

export function swipeUndoExpiredError(message = 'Swipe undo window has expired'): AppError {
  return new AppError(message, 409, SWIPE_ERROR_CODES.SWIPE_UNDO_EXPIRED);
}

export function invalidSwipePayloadError(message = 'Invalid swipe payload'): AppError {
  return new AppError(message, 400, SWIPE_ERROR_CODES.INVALID_SWIPE_PAYLOAD);
}

export function swipeNotImplementedError(
  message = 'Swipes handler not implemented yet (Phase 7 B2+)'
): AppError {
  return new AppError(message, 501, SWIPE_ERROR_CODES.NOT_IMPLEMENTED);
}
