import { RequestHandler } from 'express';
import { AUTH_ERROR_CODES, Role } from '../modules/auth';
import { ForbiddenError, UnauthorizedError } from '../utils/AppError';

export const authorize = (...allowedRoles: Role[]): RequestHandler => {
  return (req, res, next) => {
    if (!req.user) {
      next(new UnauthorizedError(AUTH_ERROR_CODES.MISSING_TOKEN, 'Missing authenticated user'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new ForbiddenError(AUTH_ERROR_CODES.INSUFFICIENT_ROLE, 'Insufficient role'));
      return;
    }

    next();
  };
};
