import { RequestHandler } from 'express';
import { TokenExpiredError } from 'jsonwebtoken';
import { companiesRepository } from '../database/companies.repository';
import { sessionsRepository } from '../database/sessions.repository';
import { usersRepository } from '../database/users.repository';
import { AUTH_ERROR_CODES, AuthenticatedUser, Role } from '../modules/auth';
import { ForbiddenError, UnauthorizedError } from '../utils/AppError';
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
  const session = await sessionsRepository.findById(sessionId);

  if (!session || session.user_id !== userId) {
    return null;
  }

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    return null;
  }

  const cachedUser = await authUserCache.get(userId);

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
    throw new ForbiddenError(AUTH_ERROR_CODES.ACCOUNT_SUSPENDED, 'Account is suspended');
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

  await authUserCache.set(identity);

  return {
    ...identity,
    sessionId
  };
}

export const authenticate: RequestHandler = async (req, res, next) => {
  try {
    const token = getBearerToken(req.get('authorization'));

    if (!token) {
      next(new UnauthorizedError(AUTH_ERROR_CODES.MISSING_TOKEN, 'Missing token'));
      return;
    }

    const payload = verifyAccessToken(token);
    const user = await loadUserIdentity(payload.sub, payload.sessionId);

    if (!user) {
      next(new UnauthorizedError(AUTH_ERROR_CODES.INVALID_TOKEN, 'Invalid token'));
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof UnauthorizedError) {
      next(error);
      return;
    }

    if (error instanceof TokenExpiredError) {
      next(new UnauthorizedError(AUTH_ERROR_CODES.TOKEN_EXPIRED, 'Token expired'));
      return;
    }

    next(new UnauthorizedError(AUTH_ERROR_CODES.INVALID_TOKEN, 'Invalid token'));
  }
};
