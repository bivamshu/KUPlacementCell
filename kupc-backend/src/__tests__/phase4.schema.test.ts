import fs from 'fs';
import path from 'path';

const migrationPath = path.join(
  __dirname,
  '..',
  '..',
  'supabase',
  'migrations',
  '20260711000000_phase4_resume_analysis.sql'
);

const REQUIRED_COLUMNS = [
  'status',
  'error_message',
  'grade',
  'score_breakdown',
  'strengths',
  'suggestions',
  'issues_identified',
  'raw_response',
  'model',
  'started_at',
  'completed_at'
];

describe('Phase 4 Milestone 2 - resume_analysis schema migration', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');

  it('migration file exists', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it.each(REQUIRED_COLUMNS)('adds column %s', (column) => {
    expect(sql).toMatch(new RegExp(`ADD COLUMN IF NOT EXISTS ${column}`, 'i'));
  });

  it('adds status CHECK for pending|processing|completed|failed', () => {
    expect(sql).toMatch(/resume_analysis_status_check/i);
    expect(sql).toMatch(/pending.*processing.*completed.*failed/is);
  });

  it('creates GIN index on extracted_skills', () => {
    expect(sql).toMatch(/idx_resume_analysis_skills/i);
    expect(sql).toMatch(/USING gin \(extracted_skills\)/i);
  });
});

const source  = fs.readFileSync(
    path.join(__dirname, '..', 'database', 'resumes.repository.ts'),
    'utf8'
);

expect(source).toContain('createAnalysis');
expect(source).toContain('updateAnalysisStatus');
expect(source).toContain('completeAnalysis');
expect(source).toContain('failAnalysis');
expect(source).toContain('findAnalysisById');
