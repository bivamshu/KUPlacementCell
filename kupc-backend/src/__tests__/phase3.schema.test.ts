import fs from 'fs';
import path from 'path';

const migrationPath = path.join(
  __dirname,
  '..',
  '..',
  'supabase',
  'migrations',
  '20260710000000_phase3_schema.sql'
);

const REQUIRED_NEW_TABLES = [
  'skills',
  'resumes',
  'resume_analysis',
  'student_skills',
  'jobs',
  'swipes',
  'matches',
  'saved_jobs',
  'conversations',
  'messages',
  'notifications',
  'reports',
  'analytics_events'
];

describe('Milestone 6 - Phase 3 database schema migration', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');

  it('migration file exists', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it('extends students with profile columns', () => {
    expect(sql).toMatch(/ALTER TABLE public\.students/i);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS phone/i);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS cgpa/i);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS resume_id/i);
  });

  it('extends companies with profile columns', () => {
    expect(sql).toMatch(/ALTER TABLE public\.companies/i);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS industry/i);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS logo_url/i);
  });

  it.each(REQUIRED_NEW_TABLES)('defines table %s', (table) => {
    expect(sql).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}`, 'i'));
  });

  it('renames company_requests to company_verification_requests', () => {
    expect(sql).toMatch(/RENAME TO company_verification_requests/i);
  });

  it('adds students.resume_id foreign key after resumes exist', () => {
    expect(sql).toMatch(/students_resume_id_fkey/i);
    expect(sql).toMatch(/REFERENCES public\.resumes \(id\) ON DELETE SET NULL/i);
  });

  it('creates set_updated_at trigger helper', () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.set_updated_at/i);
    expect(sql).toMatch(/trg_students_updated_at/i);
    expect(sql).toMatch(/trg_companies_updated_at/i);
    expect(sql).toMatch(/trg_jobs_updated_at/i);
  });

  it('enables RLS on new Phase 3 tables', () => {
    expect(sql).toMatch(/ALTER TABLE public\.jobs ENABLE ROW LEVEL SECURITY/i);
    expect(sql).toMatch(/ALTER TABLE public\.swipes ENABLE ROW LEVEL SECURITY/i);
    expect(sql).toMatch(/ALTER TABLE public\.messages ENABLE ROW LEVEL SECURITY/i);
  });
});
