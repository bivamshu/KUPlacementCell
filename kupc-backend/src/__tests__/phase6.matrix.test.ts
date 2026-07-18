import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const SRC = path.join(__dirname, '..');

const REQUIRED_PHASE6_TESTS = [
  'phase6.scaffold.test.ts',
  'phase6.mapper.test.ts',
  'phase6.jobs.crud.test.ts',
  'phase6.feed.test.ts',
  'phase6.saved.test.ts',
  'phase6.swagger.test.ts',
  'phase6.matrix.test.ts'
];

const REQUIRED_JOBS_MODULE_FILES = [
  'jobs.constants.ts',
  'jobs.types.ts',
  'jobs.validation.ts',
  'jobs.errors.ts',
  'jobs.mapper.ts',
  'jobs.service.ts',
  'jobs.controller.ts',
  'jobs.routes.ts',
  'index.ts'
];

function read(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

describe('Phase 6 Milestone B5 - testing matrix', () => {
  it('includes all Phase 6 Jest suites', () => {
    for (const file of REQUIRED_PHASE6_TESTS) {
      expect(fs.existsSync(path.join(__dirname, file))).toBe(true);
    }
  });

  it('includes core jobs module files', () => {
    const moduleDir = path.join(SRC, 'modules', 'jobs');
    for (const file of REQUIRED_JOBS_MODULE_FILES) {
      expect(fs.existsSync(path.join(moduleDir, file))).toBe(true);
    }
  });

  it('documents npm run test:phase6 script', () => {
    const pkg = JSON.parse(read(path.join(ROOT, 'package.json'))) as { scripts?: Record<string, string> };
    expect(pkg.scripts?.['test:phase6']).toMatch(/phase6/);
  });

  it('mounts jobs router under /api/v1 from modules/jobs', () => {
    const routes = read(path.join(SRC, 'routes', 'index.ts'));
    expect(routes).toMatch(/from '\.\.\/modules\/jobs'/);
    expect(routes).toMatch(/router\.use\('\/jobs', jobsRouter\)/);
    expect(fs.existsSync(path.join(SRC, 'routes', 'jobs.ts'))).toBe(false);
  });

  it('registers static job paths before /:id', () => {
    const source = read(path.join(SRC, 'modules', 'jobs', 'jobs.routes.ts'));
    const savedIndex = source.indexOf("'/saved'");
    const meIndex = source.indexOf("'/me'");
    const idIndex = source.lastIndexOf("'/:id'");
    expect(savedIndex).toBeGreaterThan(-1);
    expect(meIndex).toBeGreaterThan(-1);
    expect(idIndex).toBeGreaterThan(-1);
    expect(meIndex).toBeLessThan(idIndex);
    expect(savedIndex).toBeLessThan(idIndex);
  });

  it('never exposes status as a PATCHable Zod field', () => {
    const validation = read(path.join(SRC, 'modules', 'jobs', 'jobs.validation.ts'));
    expect(validation).toMatch(/\.strip\(\)/);
    expect(validation).not.toMatch(/status:\s*z\./);
  });

  it('creates jobs as draft and transitions via publish/close', () => {
    const service = read(path.join(SRC, 'modules', 'jobs', 'jobs.service.ts'));
    expect(service).toMatch(/status:\s*'draft'/);
    expect(service).toMatch(/status:\s*'open'/);
    expect(service).toMatch(/status:\s*'closed'/);
  });

  it('allows Vite CORS origins used in local frontend', () => {
    const config = read(path.join(SRC, 'config', 'config.ts'));
    expect(config).toMatch(/localhost:5173/);
    expect(config).toMatch(/localhost:5174/);
  });

  it('documents Phase 6 implementation log', () => {
    expect(fs.existsSync(path.join(ROOT, 'documentation', 'PHASE_6_DOCUMENTATION.md'))).toBe(true);
  });

  it('extends jobs repository with feed filter and batch find', () => {
    const repo = read(path.join(SRC, 'database', 'jobs.repository.ts'));
    expect(repo).toMatch(/listOpenFiltered/);
    expect(repo).toMatch(/findByIds/);
  });
});
