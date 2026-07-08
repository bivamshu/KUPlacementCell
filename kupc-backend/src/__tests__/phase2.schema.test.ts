import fs from 'fs';
import path from 'path';

const migrationPath = path.join(
  __dirname,
  '..',
  '..',
  'supabase',
  'migrations',
  '20260709000000_phase2_auth_schema.sql'
);

const REQUIRED_TABLES = [
  'users',
  'students',
  'companies',
  'sessions',
  'refresh_tokens',
  'student_otps',
  'company_requests'
];

describe('Milestone 12 - Phase 2 database schema migration', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');

  it('migration file exists', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it.each(REQUIRED_TABLES)('defines table %s', (table) => {
    expect(sql).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}`, 'i'));
  });

  it('links users.id to auth.users', () => {
    expect(sql).toMatch(/REFERENCES auth\.users \(id\)/i);
  });

  it('indexes refresh token hash for rotation lookups', () => {
    expect(sql).toMatch(/refresh_tokens_token_hash_idx/i);
  });

  it('enables RLS on Phase 2 tables', () => {
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/i);
  });
});

describe('Milestone 13 - Phase 2 registration RPC migration', () => {
  const rpcMigrationPath = path.join(
    __dirname,
    '..',
    '..',
    'supabase',
    'migrations',
    '20260709000001_phase2_registration_rpcs.sql'
  );

  const rpcSql = fs.readFileSync(rpcMigrationPath, 'utf8');

  it('registration RPC migration file exists', () => {
    expect(fs.existsSync(rpcMigrationPath)).toBe(true);
  });

  it('defines register_student_profile RPC', () => {
    expect(rpcSql).toMatch(/register_student_profile/i);
  });

  it('defines register_company_profile RPC', () => {
    expect(rpcSql).toMatch(/register_company_profile/i);
  });
});
