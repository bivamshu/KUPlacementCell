import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const SRC = path.join(__dirname, '..');

const REQUIRED_PHASE5_TESTS = [
  'phase5.students.test.ts',
  'phase5.companies.test.ts',
  'phase5.upload.test.ts',
  'phase5.swagger.test.ts',
  'phase5.mapper.test.ts',
  'phase5.matrix.test.ts'
];

const REQUIRED_STUDENTS_MODULE_FILES = [
  'students.constants.ts',
  'students.types.ts',
  'students.validation.ts',
  'students.errors.ts',
  'students.mapper.ts',
  'students.service.ts',
  'students.controller.ts',
  'students.routes.ts',
  'index.ts'
];

const REQUIRED_COMPANIES_MODULE_FILES = [
  'companies.constants.ts',
  'companies.types.ts',
  'companies.validation.ts',
  'companies.errors.ts',
  'companies.mapper.ts',
  'companies.service.ts',
  'companies.controller.ts',
  'companies.routes.ts',
  'index.ts'
];

function read(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

describe('Phase 5 Milestone B5 - testing matrix', () => {
  it('includes all Phase 5 Jest suites', () => {
    for (const file of REQUIRED_PHASE5_TESTS) {
      expect(fs.existsSync(path.join(__dirname, file))).toBe(true);
    }
  });

  it('includes core students module files', () => {
    const moduleDir = path.join(SRC, 'modules', 'students');
    for (const file of REQUIRED_STUDENTS_MODULE_FILES) {
      expect(fs.existsSync(path.join(moduleDir, file))).toBe(true);
    }
  });

  it('includes core companies module files', () => {
    const moduleDir = path.join(SRC, 'modules', 'companies');
    for (const file of REQUIRED_COMPANIES_MODULE_FILES) {
      expect(fs.existsSync(path.join(moduleDir, file))).toBe(true);
    }
  });

  it('includes shared profile image infrastructure', () => {
    expect(fs.existsSync(path.join(SRC, 'config', 'profileImageStorage.ts'))).toBe(true);
    expect(fs.existsSync(path.join(SRC, 'middleware', 'profileImageUpload.ts'))).toBe(true);
  });

  it('registers the Phase 5 bucket migration in apply-migrations script', () => {
    const script = read(path.join(ROOT, 'scripts', 'apply-migrations.mjs'));
    expect(script).toMatch(/phase5_profile_image_buckets\.sql/);
  });

  it('documents npm run test:phase5 script', () => {
    const pkg = JSON.parse(read(path.join(ROOT, 'package.json'))) as { scripts?: Record<string, string> };
    expect(pkg.scripts?.['test:phase5']).toMatch(/phase5/);
  });

  it('mounts students and companies routers under /api/v1', () => {
    const routes = read(path.join(SRC, 'routes', 'index.ts'));
    expect(routes).toMatch(/router\.use\('\/students', studentsRouter\)/);
    expect(routes).toMatch(/router\.use\('\/companies', companiesRouter\)/);
  });

  it('registers /me routes before /:id in both routers', () => {
    for (const [module, prefix] of [
      ['students', 'students'],
      ['companies', 'companies']
    ] as const) {
      const source = read(path.join(SRC, 'modules', module, `${prefix}.routes.ts`));
      const meIndex = source.indexOf("'/me'");
      const idIndex = source.indexOf("'/:id'");
      expect(meIndex).toBeGreaterThan(-1);
      expect(idIndex).toBeGreaterThan(-1);
      expect(meIndex).toBeLessThan(idIndex);
    }
  });

  it('keeps rate limiter wired on both image upload routes', () => {
    const studentRoutes = read(path.join(SRC, 'modules', 'students', 'students.routes.ts'));
    const companyRoutes = read(path.join(SRC, 'modules', 'companies', 'companies.routes.ts'));
    expect(studentRoutes).toMatch(/profileImageRateLimiter/);
    expect(companyRoutes).toMatch(/profileImageRateLimiter/);
  });

  it('never exposes verification_status as a PATCHable field', () => {
    const validation = read(path.join(SRC, 'modules', 'companies', 'companies.validation.ts'));
    expect(validation).not.toMatch(/verification_status:\s*z\./);
  });

  it('declares Phase 5 storage env keys in env.ts', () => {
    const envSource = read(path.join(SRC, 'config', 'env.ts'));
    expect(envSource).toMatch(/PROFILE_IMAGE_MAX_BYTES/);
    expect(envSource).toMatch(/AVATAR_STORAGE_BUCKET/);
    expect(envSource).toMatch(/COMPANY_LOGO_STORAGE_BUCKET/);
  });
});
