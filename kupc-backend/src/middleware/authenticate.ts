import { RequestHandler } from 'express';
import { TokenExpiredError } from 'jsonwebtoken';
import { companiesRepository } from '../database/companies.repository';
import { usersRepository } from '../database/users.repository';
import { AUTH_ERROR_CODES, AuthenticatedUser, Role } from '../modules/auth';
import { AppError } from '../utils/AppError';
import { verifyAccessToken } from '../utils/jwt';
import { authUserCache } from './authUserCache';

function getBearerToken(authHeader?: string): string | null {
  if (!authHeader) {
    return null;
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

async function loadUserIdentity(userId: string, sessionId: string): Promise<AuthenticatedUser | null> {
  const cachedUser = authUserCache.get(userId);

  if (cachedUser) {
    return {
      ...cachedUser,
      sessionId
    };
  }

  const user = await usersRepository.findById(userId);

  if (!user) {
    return null;
  }

  if (user.status !== 'active') {
    throw new AppError('Account is suspended', 403, AUTH_ERROR_CODES.ACCOUNT_SUSPENDED);
  }

  const company = user.role === Role.COMPANY ? await companiesRepository.findByUserId(user.id) : null;
  const identity = {
    id: user.id,
    role: user.role,
    email: user.email,
    emailVerified: user.email_verified,
    status: user.status,
    verificationStatus: company?.verification_status
  };

  authUserCache.set(identity);

  return {
    ...identity,
    sessionId
  };
}

export const authenticate: RequestHandler = async (req, res, next) => {
  try {
    const token = getBearerToken(req.get('authorization'));

    if (!token) {
      next(new AppError('Missing token', 401, AUTH_ERROR_CODES.MISSING_TOKEN));
      return;
    }

    const payload = verifyAccessToken(token);
    const user = await loadUserIdentity(payload.sub, payload.sessionId);

    if (!user) {
      next(new AppError('Invalid token', 401, AUTH_ERROR_CODES.INVALID_TOKEN));
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    if (error instanceof TokenExpiredError) {
      next(new AppError('Token expired', 401, AUTH_ERROR_CODES.TOKEN_EXPIRED));
      return;
    }

    next(new AppError('Invalid token', 401, AUTH_ERROR_CODES.INVALID_TOKEN));
  }
};
