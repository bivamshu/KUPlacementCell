import fs from 'fs';
import path from 'path';

const seedPath = path.join(__dirname, '..', '..', 'scripts', 'seed.ts');

describe('Milestone 9 - Phase 3 seed script', () => {
  const source = fs.readFileSync(seedPath, 'utf8');

  it('seed script exists', () => {
    expect(fs.existsSync(seedPath)).toBe(true);
  });

  it('targets required volumes from the Phase 3 spec', () => {
    expect(source).toMatch(/STUDENT_COUNT\s*=\s*100/);
    expect(source).toMatch(/COMPANY_COUNT\s*=\s*50/);
    expect(source).toMatch(/JOB_COUNT\s*=\s*200/);
    expect(source).toMatch(/SWIPE_COUNT\s*=\s*500/);
    expect(source).toMatch(/CANONICAL_SKILLS/);
  });

  it('is idempotent via clearing prior seed.* users', () => {
    expect(source).toMatch(/clearPreviousSeed/);
    expect(source).toMatch(/seed\./);
    expect(source).toMatch(/deleteUser/);
  });

  it('creates auth users then profiles, jobs, swipes, and matches', () => {
    expect(source).toMatch(/auth\.admin\.createUser/);
    expect(source).toMatch(/register_student_profile/);
    expect(source).toMatch(/register_company_profile/);
    expect(source).toMatch(/seedSkills/);
    expect(source).toMatch(/seedJobs/);
    expect(source).toMatch(/seedSwipesMatchesAndChat/);
    expect(source).toMatch(/from\('matches'\)/);
    expect(source).toMatch(/from\('conversations'\)/);
  });

  it('refuses to run in production', () => {
    expect(source).toMatch(/assertNotProduction/);
    expect(source).toMatch(/NODE_ENV=production/);
  });
});
