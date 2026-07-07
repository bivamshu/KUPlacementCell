import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { Role } from '../modules/auth';

export type AccessTokenPayload = {
  sub: string;
  role: Role;
  email: string;
  sessionId: string;
};

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn']
  };

  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_SECRET);

  if (typeof payload === 'string') {
    throw new Error('Invalid token payload');
  }

  const roleValues: string[] = Object.values(Role);

  if (
    typeof payload.sub !== 'string' ||
    typeof payload.email !== 'string' ||
    typeof payload.sessionId !== 'string' ||
    typeof payload.role !== 'string' ||
    !roleValues.includes(payload.role)
  ) {
    throw new Error('Invalid token payload');
  }

  return {
    sub: payload.sub,
    role: payload.role as Role,
    email: payload.email,
    sessionId: payload.sessionId
  };
}
