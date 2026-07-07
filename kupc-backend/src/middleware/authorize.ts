import { RequestHandler } from 'express';
import { Role } from '../modules/auth';
import { AppError } from '../utils/AppError';

export const authorize = (...allowedRoles: Role[]): RequestHandler => {
  return (req, res, next) => {
    if (!req.user) {
      next(new AppError('Missing authenticated user', 401));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new AppError('Insufficient role', 403));
      return;
    }

    next();
  };
};
