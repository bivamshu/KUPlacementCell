import fs from 'fs';
import path from 'path';

const migrationPath = path.join(
  __dirname,
  '..',
  '..',
  'supabase',
  'migrations',
  '20260710000002_phase3_rls_policies.sql'
);

const REQUIRED_POLICY_SNIPPETS = [
  'Students can view their own profile',
  'Students can update their own profile',
  'Companies can manage their own profile',
  'Anyone authenticated can view an approved company',
  'Companies manage their own jobs',
  'Students can view open jobs',
  'Students manage their own resumes',
  'Students can view analysis of their own resumes',
  'Students manage their own swipes',
  'Companies can view swipes on their jobs',
  'Participants can view their own matches',
  'Only conversation participants can read messages',
  'Only conversation participants can send messages',
  'Users can view their own notifications',
  'Students manage their own saved jobs',
  'Users can view reports they filed',
  'Users can file reports',
  'Companies manage their verification requests',
  'auth.uid()'
];

describe('Milestone 8 - Phase 3 RLS policies', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');

  it('migration file exists', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it.each(REQUIRED_POLICY_SNIPPETS)('includes policy/snippet: %s', (snippet) => {
    expect(sql).toContain(snippet);
  });

  it('uses DROP POLICY IF EXISTS for idempotent re-runs', () => {
    expect(sql).toMatch(/DROP POLICY IF EXISTS/i);
  });

  it('documents service_role admin bypass in comments', () => {
    expect(sql).toMatch(/service_role/i);
  });
});
