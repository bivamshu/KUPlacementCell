import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const SRC = path.join(__dirname, '..');

const REQUIRED_PHASE4_TESTS = [
  'phase4.scaffold.test.ts',
  'phase4.schema.test.ts',
  'phase4.upload.test.ts',
  'phase4.queue.test.ts',
  'phase4.worker.test.ts',
  'phase4.extract.test.ts',
  'phase4.openai.test.ts',
  'phase4.read.test.ts',
  'phase4.swagger.test.ts',
  'phase4.mapper.test.ts',
  'phase4.matrix.test.ts'
];

const REQUIRED_RESUMES_MODULE_FILES = [
  'resumes.constants.ts',
  'resumes.types.ts',
  'resumes.validation.ts',
  'resumes.controller.ts',
  'resumes.service.ts',
  'resumes.routes.ts',
  'resumes.mapper.ts',
  'resumes.extract.ts',
  'resumes.openai.ts',
  'resumes.openai.schema.ts',
  'resumes.errors.ts',
  'resumeAnalysis.processor.ts',
  'index.ts'
];

const PRODUCTION_RESUME_PATHS = [
  path.join(SRC, 'modules', 'resumes', 'resumes.openai.ts'),
  path.join(SRC, 'modules', 'resumes', 'resumeAnalysis.processor.ts'),
  path.join(SRC, 'workers', 'resumeAnalysis.worker.ts'),
  path.join(SRC, 'modules', 'resumes', 'resumes.extract.ts')
];

function read(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

describe('Phase 4 Milestone 9 - testing matrix', () => {
  it('includes all Phase 4 Jest suites', () => {
    for (const file of REQUIRED_PHASE4_TESTS) {
      expect(fs.existsSync(path.join(__dirname, file))).toBe(true);
    }
  });

  it('includes core resumes module files', () => {
    const moduleDir = path.join(SRC, 'modules', 'resumes');
    for (const file of REQUIRED_RESUMES_MODULE_FILES) {
      expect(fs.existsSync(path.join(moduleDir, file))).toBe(true);
    }
  });

  it('registers Phase 4 migrations in apply-migrations script', () => {
    const script = read(path.join(ROOT, 'scripts', 'apply-migrations.mjs'));
    expect(script).toMatch(/phase4_resume_analysis\.sql/);
    expect(script).toMatch(/phase4_fix_issues_identified\.sql/);
    expect(script).toMatch(/phase4_resume_storage_bucket\.sql/);
  });

  it('documents npm run test:phase4 script', () => {
    const pkg = JSON.parse(read(path.join(ROOT, 'package.json'))) as { scripts?: Record<string, string> };
    expect(pkg.scripts?.['test:phase4']).toMatch(/phase4/);
  });

  it('excludes .env from version control', () => {
    const gitignore = read(path.join(ROOT, '..', '.gitignore'));
    expect(gitignore).toMatch(/kupc-backend\/\.env/);
  });

  it('does not hardcode OpenAI secrets in production source', () => {
    const offenders: string[] = [];
    const secretPattern = /sk-[A-Za-z0-9]{10,}/;

    for (const filePath of walkTsFiles(SRC)) {
      if (filePath.includes(`${path.sep}__tests__${path.sep}`)) {
        continue;
      }

      const source = read(filePath);
      if (secretPattern.test(source)) {
        offenders.push(path.relative(SRC, filePath));
      }
    }

    expect(offenders).toEqual([]);
  });

  it('does not log resume plaintext or API keys in worker/AI modules', () => {
    for (const filePath of PRODUCTION_RESUME_PATHS) {
      const source = read(filePath);
      expect(source).not.toMatch(/console\.(log|info|debug)\([^)]*OPENAI_API_KEY/);
      expect(source).not.toMatch(/console\.(log|info|debug)\([^)]*Analyze this resume text/);
    }
  });

  it('keeps upload rate limiter wired on POST /resumes', () => {
    const routes = read(path.join(SRC, 'modules', 'resumes', 'resumes.routes.ts'));
    expect(routes).toMatch(/resumeUploadRateLimiter/);
    expect(routes).toMatch(/handleResumeUpload/);
  });

  it('loads secrets from env.ts rather than inline credentials', () => {
    const envSource = read(path.join(SRC, 'config', 'env.ts'));
    expect(envSource).toMatch(/OPENAI_API_KEY/);
    expect(envSource).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(envSource).toMatch(/process\.env/);
  });
});

function walkTsFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') {
        continue;
      }
      files.push(...walkTsFiles(full));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(full);
    }
  }

  return files;
}
