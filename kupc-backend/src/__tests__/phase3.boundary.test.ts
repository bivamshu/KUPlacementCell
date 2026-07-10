import fs from 'fs';
import path from 'path';

const SRC_ROOT = path.join(__dirname, '..');

const ALLOWED_FROM_PATHS = new Set([
  path.join('database'),
  path.join('config', 'supabase.ts')
]);

function walkTsFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') {
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

function isAllowed(filePath: string): boolean {
  const rel = path.relative(SRC_ROOT, filePath);
  if (rel.startsWith(`database${path.sep}`) || rel === path.join('database')) {
    return true;
  }
  if (rel === path.join('config', 'supabase.ts')) {
    return true;
  }
  return ALLOWED_FROM_PATHS.has(rel);
}

describe('Milestone 11 - repository boundary', () => {
  it('no Supabase table .from(...) calls exist outside src/database (and config/supabase.ts)', () => {
    const offenders: string[] = [];
    const fromCall = /\.from\(\s*['"`][a-z_]+['"`]\s*\)/;

    for (const file of walkTsFiles(SRC_ROOT)) {
      if (isAllowed(file)) {
        continue;
      }

      const source = fs.readFileSync(file, 'utf8');
      if (fromCall.test(source)) {
        offenders.push(path.relative(SRC_ROOT, file));
      }
    }

    expect(offenders).toEqual([]);
  });

  it('auth service uses repositories for table access (not inline .from)', () => {
    const authService = fs.readFileSync(
      path.join(SRC_ROOT, 'modules', 'auth', 'auth.service.ts'),
      'utf8'
    );
    expect(authService).not.toMatch(/\.from\(\s*['"`]/);
    expect(authService).toMatch(/usersRepository/);
    expect(authService).toMatch(/companiesRepository/);
  });
});
