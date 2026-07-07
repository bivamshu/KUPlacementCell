import { RequestHandler } from 'express';
import { AUTH_ERROR_CODES, Role } from '../modules/auth';
import { AppError } from '../utils/AppError';

export const requireVerifiedCompany: RequestHandler = (req, res, next) => {
  if (!req.user || req.user.role !== Role.COMPANY) {
    next(new AppError('Company account required', 403, AUTH_ERROR_CODES.INSUFFICIENT_ROLE));
    return;
  }

  if (req.user.verificationStatus !== 'approved') {
    next(new AppError('Company account is pending verification', 403, AUTH_ERROR_CODES.PENDING_VERIFICATION));
    return;
  }

  next();
};
