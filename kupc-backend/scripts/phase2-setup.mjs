/**
 * Phase 2 operational setup — generates secrets, dev SMTP (Ethereal), and .env
 * Run: npm run setup:phase2
 *
 * After creating your Supabase project, fill in the SUPABASE_* and DATABASE_URL
 * placeholders in .env, then run: npm run db:migrate
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import speakeasy from 'speakeasy';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env');

function generateJwtSecret(length = 48) {
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

async function createEtherealSmtp() {
  const account = await nodemailer.createTestAccount();
  return {
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    user: account.user,
    pass: account.pass,
    from: account.user,
    previewUrl: 'https://ethereal.email'
  };
}

async function main() {
  console.log('KUPC Phase 2 setup\n');

  const jwtSecret = generateJwtSecret(48);
  const totp = speakeasy.generateSecret({ length: 20, name: 'KUPC Admin' });

  console.log('Creating Ethereal SMTP test account (free dev email)...');
  const smtp = await createEtherealSmtp();
  console.log(`  SMTP user: ${smtp.user}`);
  console.log(`  View sent emails at: ${smtp.previewUrl}\n`);

  const envContent = `PORT=5000
NODE_ENV=development

# --- Supabase (fill after creating project at https://supabase.com) ---
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
# Database direct connection for migrations (Settings -> Database -> Connection string -> URI)
DATABASE_URL=

JWT_SECRET=${jwtSecret}
JWT_EXPIRES_IN=15m
REFRESH_EXPIRES_IN=30d

OTP_LENGTH=6
OTP_EXPIRES_IN=10m
OTP_MAX_ATTEMPTS=5
KU_EMAIL_DOMAIN=ku.edu.np
AUTH_USER_CACHE_TTL_SECONDS=30

# Redis optional — leave empty for in-memory cache (fine for local dev)
REDIS_URL=

# Student OTP email (Ethereal dev SMTP — preview at https://ethereal.email)
OTP_EMAIL_ENABLED=true
SMTP_HOST=${smtp.host}
SMTP_PORT=${smtp.port}
SMTP_SECURE=${smtp.secure}
SMTP_USER=${smtp.user}
SMTP_PASS=${smtp.pass}
SMTP_FROM=${smtp.from}

# Admin 2FA (scan otpauth URL in setup output with Google Authenticator)
ADMIN_PASSWORD_LOGIN_ENABLED=false
ADMIN_TOTP_SECRET=${totp.base32}
`;

  if (fs.existsSync(envPath)) {
    const backup = `${envPath}.backup.${Date.now()}`;
    fs.copyFileSync(envPath, backup);
    console.log(`Existing .env backed up to ${path.basename(backup)}`);
  }

  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log(`Wrote ${envPath}\n`);

  console.log('Admin TOTP — add to Google Authenticator / Authy:');
  console.log(`  Secret (base32): ${totp.base32}`);
  console.log(`  OTPAuth URL: ${totp.otpauth_url}\n`);

  console.log('Next steps:');
  console.log('  1. Create Supabase project (see supabase/SETUP.md)');
  console.log('  2. Fill SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL in .env');
  console.log('  3. Run: npm run db:migrate');
  console.log('  4. Run: npm run dev');
  console.log('  5. Open: http://localhost:5000/api/docs');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
