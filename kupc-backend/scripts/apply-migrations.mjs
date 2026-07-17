/**
 * Apply Supabase SQL migrations in order via DATABASE_URL
 * Run: npm run db:migrate
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

dotenv.config({ path: path.join(root, '.env') });

const migrations = [
  '20260709000000_phase2_auth_schema.sql',
  '20260709000001_phase2_registration_rpcs.sql',
  '20260710000000_phase3_schema.sql',
  '20260710000001_phase3_indexes.sql',
  '20260710000002_phase3_rls_policies.sql',
  '20260711000000_phase4_resume_analysis.sql',
  '20260711000001_phase4_fix_issues_identified.sql',
  '20260712000000_phase4_resume_storage_bucket.sql'
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is missing from .env — get it from Supabase Settings -> Database -> Connection string (URI)');
  }

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to database.\n');

  try {
    for (const file of migrations) {
      const filePath = path.join(root, 'supabase', 'migrations', file);
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`Applying ${file}...`);
      await client.query(sql);
      console.log(`  OK\n`);
    }

    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'users','students','companies','sessions','refresh_tokens','student_otps',
          'company_verification_requests','skills','resumes','resume_analysis','student_skills',
          'jobs','swipes','matches','saved_jobs','conversations','messages',
          'notifications','reports','analytics_events'
        )
      ORDER BY table_name
    `);

    console.log('Tables present:', tables.rows.map((r) => r.table_name).join(', '));

    const rpcs = await client.query(`
      SELECT routine_name FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name IN ('register_student_profile','register_company_profile')
    `);

    console.log('RPCs present:', rpcs.rows.map((r) => r.routine_name).join(', '));
    console.log('\nMigrations complete.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
