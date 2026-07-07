import { RequestHandler } from 'express';
import { TokenExpiredError } from 'jsonwebtoken';
import { companiesRepository } from '../database/companies.repository';
import { usersRepository } from '../database/users.repository';
import { AUTH_ERROR_CODES, Role } from '../modules/auth';
import { AppError } from '../utils/AppError';
import { verifyAccessToken } from '../utils/jwt';

export const authenticate: RequestHandler = async (req, res, next) => {
  try {
    const authHeader = req.get('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      next(new AppError('Missing token', 401, AUTH_ERROR_CODES.MISSING_TOKEN));
      return;
    }

    const token = authHeader.slice('Bearer '.length).trim();
    const payload = verifyAccessToken(token);
    const user = await usersRepository.findById(payload.sub);

    if (!user) {
      next(new AppError('Invalid token', 401, AUTH_ERROR_CODES.INVALID_TOKEN));
      return;
    }

    if (user.status !== 'active') {
      next(new AppError('Account is suspended', 403, AUTH_ERROR_CODES.ACCOUNT_SUSPENDED));
      return;
    }

    const company = user.role === Role.COMPANY ? await companiesRepository.findByUserId(user.id) : null;

    req.user = {
      id: user.id,
      role: user.role,
      email: user.email,
      emailVerified: user.email_verified,
      status: user.status,
      verificationStatus: company?.verification_status
    };

    next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      next(new AppError('Token expired', 401, AUTH_ERROR_CODES.TOKEN_EXPIRED));
      return;
    }

    next(new AppError('Invalid token', 401, AUTH_ERROR_CODES.INVALID_TOKEN));
  }
};
