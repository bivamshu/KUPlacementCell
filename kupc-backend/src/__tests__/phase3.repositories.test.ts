import fs from 'fs';
import path from 'path';

const databaseDir = path.join(__dirname, '..', 'database');

const REQUIRED_REPOSITORIES = [
  'students.repository.ts',
  'companies.repository.ts',
  'resumes.repository.ts',
  'jobs.repository.ts',
  'skills.repository.ts',
  'swipes.repository.ts',
  'matches.repository.ts',
  'conversations.repository.ts',
  'messages.repository.ts',
  'notifications.repository.ts',
  'savedJobs.repository.ts',
  'reports.repository.ts',
  'analyticsEvents.repository.ts',
  'companyRequests.repository.ts'
];

const REQUIRED_EXPORTS: Record<string, string[]> = {
  'students.repository.ts': ['studentsRepository', 'findById', 'updateProfile', 'listByDepartment'],
  'companies.repository.ts': ['companiesRepository', 'findByUserId', 'listPending', 'updateProfile'],
  'jobs.repository.ts': ['jobsRepository', 'create', 'listOpenForFeed', 'listByCompany', 'findById'],
  'resumes.repository.ts': ['resumesRepository', 'create', 'listByStudent', 'createAnalysis'],
  'swipes.repository.ts': ['swipesRepository', 'create', 'findStudentRightSwipe', 'listJobIdsByStudent'],
  'matches.repository.ts': ['matchesRepository', 'create', 'listByStudent', 'listByCompany', 'findByTriple'],
  'conversations.repository.ts': ['conversationsRepository', 'createForMatch', 'findByMatchId'],
  'messages.repository.ts': ['messagesRepository', 'create', 'listByConversation'],
  'notifications.repository.ts': ['notificationsRepository', 'create', 'listByUser', 'markRead']
};

describe('Milestone 10 - Phase 3 repository layer', () => {
  it.each(REQUIRED_REPOSITORIES)('defines repository file %s', (fileName) => {
    expect(fs.existsSync(path.join(databaseDir, fileName))).toBe(true);
  });

  it.each(Object.entries(REQUIRED_EXPORTS))(
    '%s exports the query shapes services need',
    (fileName, snippets) => {
      const source = fs.readFileSync(path.join(databaseDir, fileName), 'utf8');
      for (const snippet of snippets) {
        expect(source).toContain(snippet);
      }
    }
  );

  it('uses supabaseAdmin and surfaces errors (does not swallow them)', () => {
    const jobsSource = fs.readFileSync(path.join(databaseDir, 'jobs.repository.ts'), 'utf8');
    expect(jobsSource).toMatch(/import \{ supabaseAdmin \}/);
    expect(jobsSource).toMatch(/if \(error\) \{\s*throw error;/);
  });

  it('points company verification requests at the Phase 3 table name', () => {
    const source = fs.readFileSync(path.join(databaseDir, 'companyRequests.repository.ts'), 'utf8');
    expect(source).toContain("from('company_verification_requests')");
    expect(source).toContain('companyVerificationRequestsRepository');
  });

  it('keeps repositories as the only intended persistence boundary (no raw SQL strings)', () => {
    for (const fileName of REQUIRED_REPOSITORIES) {
      const source = fs.readFileSync(path.join(databaseDir, fileName), 'utf8');
      expect(source).not.toMatch(/\bSELECT\b.+\bFROM\b/i);
      expect(source).not.toMatch(/\bINSERT INTO\b/i);
    }
  });
});
