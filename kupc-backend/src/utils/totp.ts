import speakeasy from 'speakeasy';
import { env } from '../config/env';

export function verifyAdminTotp(totpCode: string): boolean {
  if (!env.ADMIN_TOTP_SECRET) {
    return false;
  }

  return speakeasy.totp.verify({
    secret: env.ADMIN_TOTP_SECRET,
    encoding: 'base32',
    token: totpCode,
    window: 1
  });
}
