import fs from 'fs';
import path from 'path';

const migrationPath = path.join(
  __dirname,
  '..',
  '..',
  'supabase',
  'migrations',
  '20260710000001_phase3_indexes.sql'
);

const REQUIRED_INDEXES = [
  'idx_companies_verification_status',
  'idx_jobs_company_id',
  'idx_jobs_status',
  'idx_jobs_open_company_id',
  'idx_swipes_student_id',
  'idx_swipes_company_id',
  'idx_matches_student_id',
  'idx_matches_company_id',
  'idx_messages_conversation_id',
  'idx_notifications_user_id',
  'idx_resumes_student_id'
];

describe('Milestone 7 - Phase 3 indexing strategy', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');

  it('migration file exists', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it.each(REQUIRED_INDEXES)('defines index %s', (indexName) => {
    expect(sql).toMatch(new RegExp(indexName, 'i'));
  });

  it('includes partial index for open jobs', () => {
    expect(sql).toMatch(/WHERE status = 'open'/i);
  });
});