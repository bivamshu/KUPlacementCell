import { RequestHandler } from 'express';
import { companiesRepository } from '../database/companies.repository';
import { AUTH_ERROR_CODES, Role } from '../modules/auth';
import { ForbiddenError } from '../utils/AppError';

export const requireVerifiedCompany: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== Role.COMPANY) {
      next(new ForbiddenError(AUTH_ERROR_CODES.INSUFFICIENT_ROLE, 'Company account required'));
      return;
    }

    const company = await companiesRepository.findByUserId(req.user.id);

    if (!company || company.verification_status !== 'approved') {
      next(
        new ForbiddenError(
          AUTH_ERROR_CODES.PENDING_VERIFICATION,
          'Company account is pending verification'
        )
      );
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};
