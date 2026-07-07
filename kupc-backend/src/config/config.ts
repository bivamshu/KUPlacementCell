import { env } from './env';

export const config = {
  port: env.PORT,
  env: env.NODE_ENV,
  api: {
    name: 'KUPC API',
    version: '1.0.0'
  },
  auth: {
    jwtExpiresIn: env.JWT_EXPIRES_IN,
    refreshExpiresIn: env.REFRESH_EXPIRES_IN,
    otpLength: env.OTP_LENGTH,
    otpExpiresIn: env.OTP_EXPIRES_IN,
    otpMaxAttempts: env.OTP_MAX_ATTEMPTS,
    kuEmailDomain: env.KU_EMAIL_DOMAIN,
    userCacheTtlSeconds: env.AUTH_USER_CACHE_TTL_SECONDS,
    adminPasswordLoginEnabled: env.ADMIN_PASSWORD_LOGIN_ENABLED
  },
  cors: {
    allowedOrigins: ['http://localhost:5173']
  }
};
