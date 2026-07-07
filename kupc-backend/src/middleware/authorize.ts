import { RequestHandler } from 'express';
import { AUTH_ERROR_CODES, Role } from '../modules/auth';
import { AppError } from '../utils/AppError';

export const authorize = (...allowedRoles: Role[]): RequestHandler => {
  return (req, res, next) => {
    if (!req.user) {
      next(new AppError('Missing authenticated user', 401, AUTH_ERROR_CODES.MISSING_TOKEN));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new AppError('Insufficient role', 403, AUTH_ERROR_CODES.INSUFFICIENT_ROLE));
      return;
    }

    next();
  };
};
