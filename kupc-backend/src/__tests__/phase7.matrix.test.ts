import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const SRC = path.join(__dirname, '..');

const REQUIRED_PHASE7_TESTS = [
  'phase7.scaffold.test.ts',
  'phase7.mapper.test.ts',
  'phase7.swipes.test.ts',
  'phase7.matches.test.ts',
  'phase7.swagger.test.ts',
  'phase7.matrix.test.ts'
];

const REQUIRED_SWIPES_MODULE_FILES = [
  'swipes.constants.ts',
  'swipes.types.ts',
  'swipes.validation.ts',
  'swipes.errors.ts',
  'swipes.mapper.ts',
  'swipes.service.ts',
  'swipes.controller.ts',
  'swipes.routes.ts',
  'index.ts'
];

const REQUIRED_MATCHES_MODULE_FILES = [
  'matches.constants.ts',
  'matches.types.ts',
  'matches.validation.ts',
  'matches.errors.ts',
  'matches.mapper.ts',
  'matches.service.ts',
  'matches.controller.ts',
  'matches.routes.ts',
  'index.ts'
];

function read(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

describe('Phase 7 Milestone B6 - testing matrix', () => {
  it('includes all Phase 7 Jest suites', () => {
    for (const file of REQUIRED_PHASE7_TESTS) {
      expect(fs.existsSync(path.join(__dirname, file))).toBe(true);
    }
  });

  it('includes core swipes and matches module files', () => {
    const swipesDir = path.join(SRC, 'modules', 'swipes');
    const matchesDir = path.join(SRC, 'modules', 'matches');

    for (const file of REQUIRED_SWIPES_MODULE_FILES) {
      expect(fs.existsSync(path.join(swipesDir, file))).toBe(true);
    }
    for (const file of REQUIRED_MATCHES_MODULE_FILES) {
      expect(fs.existsSync(path.join(matchesDir, file))).toBe(true);
    }
  });

  it('documents npm run test:phase7 script', () => {
    const pkg = JSON.parse(read(path.join(ROOT, 'package.json'))) as { scripts?: Record<string, string> };
    expect(pkg.scripts?.['test:phase7']).toMatch(/phase7/);
  });

  it('mounts swipes and matches routers under /api/v1', () => {
    const routes = read(path.join(SRC, 'routes', 'index.ts'));
    expect(routes).toMatch(/from '\.\.\/modules\/swipes'/);
    expect(routes).toMatch(/from '\.\.\/modules\/matches'/);
    expect(routes).toMatch(/router\.use\('\/swipes', swipesRouter\)/);
    expect(routes).toMatch(/router\.use\('\/matches', matchesRouter\)/);
  });

  it('registers static swipe paths before /:jobId', () => {
    const source = read(path.join(SRC, 'modules', 'swipes', 'swipes.routes.ts'));
    const meIndex = source.indexOf("'/me'");
    const inboundIndex = source.indexOf("'/inbound'");
    const jobIdIndex = source.indexOf("'/:jobId'");
    expect(meIndex).toBeGreaterThan(-1);
    expect(inboundIndex).toBeGreaterThan(-1);
    expect(jobIdIndex).toBeGreaterThan(-1);
    expect(meIndex).toBeLessThan(jobIdIndex);
    expect(inboundIndex).toBeLessThan(jobIdIndex);
  });

  it('keeps Express 5 query/params validation via defineProperty', () => {
    const validate = read(path.join(SRC, 'middleware', 'validate.ts'));
    expect(validate).toMatch(/defineProperty/);
    expect(validate).not.toMatch(/Object\.assign\(req\.query/);
    expect(validate).not.toMatch(/Object\.assign\(req\.params/);
  });

  it('does not auto-create matches on swipe create', () => {
    const service = read(path.join(SRC, 'modules', 'swipes', 'swipes.service.ts'));
    expect(service).toMatch(/async create\(/);
    expect(service).not.toMatch(/matchesRepository\.create/);
  });

  it('excludes swiped job IDs from student job feed', () => {
    const jobsService = read(path.join(SRC, 'modules', 'jobs', 'jobs.service.ts'));
    const jobsRepo = read(path.join(SRC, 'database', 'jobs.repository.ts'));
    expect(jobsService).toMatch(/listJobIdsByStudent/);
    expect(jobsService).toMatch(/excludeJobIds/);
    expect(jobsRepo).toMatch(/excludeJobIds/);
  });

  it('enforces undo TTL and refuses undo when a match exists', () => {
    const service = read(path.join(SRC, 'modules', 'swipes', 'swipes.service.ts'));
    expect(service).toMatch(/SWIPE_UNDO_WINDOW_SECONDS/);
    expect(service).toMatch(/findByTriple/);
    expect(service).toMatch(/swipeUndoExpiredError|matchConflictError/);
  });

  it('allows Vite CORS origins used in local frontend', () => {
    const config = read(path.join(SRC, 'config', 'config.ts'));
    expect(config).toMatch(/localhost:5173/);
    expect(config).toMatch(/localhost:5174/);
  });

  it('documents Phase 7 implementation log', () => {
    expect(fs.existsSync(path.join(ROOT, 'documentation', 'PHASE_7_DOCUMENTATION.md'))).toBe(true);
  });
});
