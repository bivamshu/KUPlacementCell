import speakeasy from 'speakeasy';

jest.mock('../config/env', () => {
  return {
    env: {
      NODE_ENV: 'test',
      ADMIN_TOTP_SECRET: 'JBSWY3DPEHPK3PXP'
    }
  };
});

import { verifyAdminTotp } from '../utils/totp';

describe('Milestone 4 - Admin TOTP verification', () => {
  it('accepts a valid TOTP for the configured secret', () => {
    const token = speakeasy.totp({
      secret: 'JBSWY3DPEHPK3PXP',
      encoding: 'base32'
    });

    expect(verifyAdminTotp(token)).toBe(true);
  });

  it('rejects an invalid TOTP', () => {
    expect(verifyAdminTotp('000000')).toBe(false);
  });
});
