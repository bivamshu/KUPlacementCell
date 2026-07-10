/**
 * Phase 3 Milestone 9 — Seed data for local / staging Supabase.
 *
 * NEVER run against production.
 *
 * Usage (from kupc-backend/):
 *   npm run db:seed
 *
 * Volumes (Phase 3 spec):
 *   ~40 skills, 100 students, 50 companies, 200 jobs, ~500 swipes,
 *   matches + conversations derived from a subset of right-swipes.
 *
 * Idempotency: clears prior rows whose emails match seed.* then re-inserts.
 */
import { faker } from '@faker-js/faker';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const STUDENT_COUNT = 100;
const COMPANY_COUNT = 50;
const JOB_COUNT = 200;
const SWIPE_COUNT = 500;
const MATCH_TARGET = 25;
const SEED_PASSWORD = 'SeedPass123!';
const SEED_EMAIL_PREFIX = 'seed.';

const DEPARTMENTS = [
  'Computer Science',
  'Computer Engineering',
  'Electrical Engineering',
  'Electronics and Communication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Geomatics Engineering',
  'Architecture',
  'Business Administration',
  'Economics',
  'Pharmacy'
];

const DEGREES = ['B.E.', 'B.Sc.', 'BBA', 'B.Arch.', 'B.Pharm.'];

const INDUSTRIES = [
  'Technology',
  'Finance',
  'Consulting',
  'Healthcare',
  'Education',
  'Manufacturing',
  'Telecommunications',
  'Energy',
  'Retail',
  'Media'
];

const JOB_TITLES = [
  'Software Engineering Intern',
  'Full Stack Developer',
  'Backend Engineer',
  'Frontend Developer',
  'Data Analyst',
  'DevOps Intern',
  'QA Engineer',
  'Product Management Intern',
  'UI/UX Designer',
  'Mobile App Developer',
  'Machine Learning Intern',
  'Business Analyst',
  'Cloud Engineer',
  'Cybersecurity Analyst',
  'Technical Support Engineer'
];

const CANONICAL_SKILLS = [
  'Python',
  'JavaScript',
  'TypeScript',
  'React',
  'Node.js',
  'SQL',
  'Figma',
  'Java',
  'C++',
  'Go',
  'Docker',
  'AWS',
  'Git',
  'Excel',
  'PostgreSQL',
  'MongoDB',
  'Redis',
  'GraphQL',
  'Next.js',
  'Express',
  'Django',
  'Flask',
  'Spring Boot',
  'Kotlin',
  'Swift',
  'Flutter',
  'React Native',
  'Linux',
  'Kubernetes',
  'Terraform',
  'CI/CD',
  'Machine Learning',
  'Data Analysis',
  'Power BI',
  'Tableau',
  'Communication',
  'Leadership',
  'Problem Solving',
  'Agile',
  'UI/UX Design'
];

type SeedStudent = { id: string; email: string };
type SeedCompany = { id: string; email: string; verification_status: string };
type SeedJob = { id: string; company_id: string; status: string };

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is missing from .env`);
  }
  return value;
}

function assertNotProduction(): void {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const url = process.env.SUPABASE_URL ?? '';
  if (nodeEnv === 'production') {
    throw new Error('Refusing to seed: NODE_ENV=production');
  }
  if (/prod/i.test(url) && !process.env.ALLOW_SEED_ON_PROD_URL) {
    throw new Error(
      'Refusing to seed: SUPABASE_URL looks like production. Set ALLOW_SEED_ON_PROD_URL=1 to override (not recommended).'
    );
  }
}

function studentEmail(index: number): string {
  return `${SEED_EMAIL_PREFIX}student.${String(index).padStart(3, '0')}@ku.edu.np`;
}

function companyEmail(index: number): string {
  return `${SEED_EMAIL_PREFIX}company.${String(index).padStart(3, '0')}@example.com`;
}

function kuIdFromEmail(email: string): string {
  return email.split('@')[0]!;
}

async function createAdminClient(): Promise<SupabaseClient> {
  const url = requireEnv('SUPABASE_URL');
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function clearPreviousSeed(admin: SupabaseClient): Promise<number> {
  console.log('Clearing previous seed users (email LIKE seed.% )...');

  const { data: users, error } = await admin
    .from('users')
    .select('id, email')
    .like('email', `${SEED_EMAIL_PREFIX}%`);

  if (error) {
    throw new Error(`Failed to list seed users: ${error.message}`);
  }

  const rows = users ?? [];
  for (const row of rows) {
    const { error: deleteError } = await admin.auth.admin.deleteUser(row.id);
    if (deleteError) {
      console.warn(`  warn: could not delete auth user ${row.email}: ${deleteError.message}`);
    }
  }

  // Skills are upserted; leave them. Orphaned domain rows cascade with users.
  console.log(`  Removed ${rows.length} seed user(s).`);
  return rows.length;
}

async function seedSkills(admin: SupabaseClient): Promise<{ id: string; name: string }[]> {
  console.log(`Seeding ${CANONICAL_SKILLS.length} skills...`);
  const { data, error } = await admin
    .from('skills')
    .upsert(
      CANONICAL_SKILLS.map((name) => ({ name })),
      { onConflict: 'name' }
    )
    .select('id, name');

  if (error) {
    throw new Error(`Failed to seed skills: ${error.message}`);
  }

  return data ?? [];
}

async function createAuthAndProfile(
  admin: SupabaseClient,
  input: {
    email: string;
    password: string;
    role: 'STUDENT' | 'COMPANY';
    metadata: Record<string, string>;
  }
): Promise<string> {
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { ...input.metadata, role: input.role, seeded: true }
  });

  if (authError || !authData.user) {
    throw new Error(`Auth createUser failed for ${input.email}: ${authError?.message ?? 'unknown'}`);
  }

  return authData.user.id;
}

async function seedStudents(
  admin: SupabaseClient,
  skills: { id: string; name: string }[]
): Promise<SeedStudent[]> {
  console.log(`Seeding ${STUDENT_COUNT} students...`);
  const students: SeedStudent[] = [];
  const yearNow = new Date().getFullYear();

  for (let i = 1; i <= STUDENT_COUNT; i++) {
    const email = studentEmail(i);
    const fullName = faker.person.fullName();
    const userId = await createAuthAndProfile(admin, {
      email,
      password: SEED_PASSWORD,
      role: 'STUDENT',
      metadata: { full_name: fullName }
    });

    const { error: rpcError } = await admin.rpc('register_student_profile', {
      p_user_id: userId,
      p_email: email,
      p_ku_id: kuIdFromEmail(email),
      p_full_name: fullName
    });

    if (rpcError) {
      await admin.auth.admin.deleteUser(userId);
      throw new Error(`register_student_profile failed for ${email}: ${rpcError.message}`);
    }

    const cgpa = Number(faker.number.float({ min: 2.0, max: 4.0, fractionDigits: 2 }).toFixed(2));
    const department = faker.helpers.arrayElement(DEPARTMENTS);
    const graduationYear = faker.helpers.arrayElement([yearNow, yearNow + 1, yearNow + 2, yearNow + 3]);

    const { error: updateError } = await admin
      .from('students')
      .update({
        phone: faker.phone.number({ style: 'international' }),
        degree: faker.helpers.arrayElement(DEGREES),
        cgpa,
        bio: faker.lorem.sentence(),
        department,
        graduation_year: graduationYear
      })
      .eq('id', userId);

    if (updateError) {
      throw new Error(`Failed to update student profile ${email}: ${updateError.message}`);
    }

    const { error: verifyError } = await admin
      .from('users')
      .update({ email_verified: true })
      .eq('id', userId);

    if (verifyError) {
      throw new Error(`Failed to mark student verified ${email}: ${verifyError.message}`);
    }

    // Attach 3–8 skills per student
    const skillSample = faker.helpers.arrayElements(skills, faker.number.int({ min: 3, max: 8 }));
    const skillRows = skillSample.map((skill) => ({
      student_id: userId,
      skill_id: skill.id,
      proficiency: faker.helpers.arrayElement(['beginner', 'intermediate', 'advanced'] as const)
    }));

    const { error: skillError } = await admin.from('student_skills').insert(skillRows);
    if (skillError) {
      throw new Error(`Failed to link skills for ${email}: ${skillError.message}`);
    }

    students.push({ id: userId, email });
    if (i % 20 === 0) {
      console.log(`  students: ${i}/${STUDENT_COUNT}`);
    }
  }

  return students;
}

async function seedCompanies(admin: SupabaseClient): Promise<SeedCompany[]> {
  console.log(`Seeding ${COMPANY_COUNT} companies...`);
  const companies: SeedCompany[] = [];

  for (let i = 1; i <= COMPANY_COUNT; i++) {
    const email = companyEmail(i);
    const companyName = `${faker.company.name()} ${String(i).padStart(2, '0')}`;
    const website = faker.internet.url();
    const userId = await createAuthAndProfile(admin, {
      email,
      password: SEED_PASSWORD,
      role: 'COMPANY',
      metadata: { company_name: companyName }
    });

    const { error: rpcError } = await admin.rpc('register_company_profile', {
      p_user_id: userId,
      p_email: email,
      p_company_name: companyName,
      p_website: website,
      p_email_verified: true
    });

    if (rpcError) {
      await admin.auth.admin.deleteUser(userId);
      throw new Error(`register_company_profile failed for ${email}: ${rpcError.message}`);
    }

    // ~70% approved, ~20% pending, ~10% rejected
    let verification_status: 'pending' | 'approved' | 'rejected' = 'pending';
    let verified_at: string | null = null;
    const roll = i / COMPANY_COUNT;
    if (roll <= 0.7) {
      verification_status = 'approved';
      verified_at = new Date().toISOString();
    } else if (roll <= 0.9) {
      verification_status = 'pending';
    } else {
      verification_status = 'rejected';
    }

    const { error: updateError } = await admin
      .from('companies')
      .update({
        industry: faker.helpers.arrayElement(INDUSTRIES),
        description: faker.company.catchPhrase(),
        logo_url: null,
        verification_status,
        verified_at
      })
      .eq('id', userId);

    if (updateError) {
      throw new Error(`Failed to update company ${email}: ${updateError.message}`);
    }

    companies.push({ id: userId, email, verification_status });
    if (i % 10 === 0) {
      console.log(`  companies: ${i}/${COMPANY_COUNT}`);
    }
  }

  return companies;
}

async function seedJobs(admin: SupabaseClient, companies: SeedCompany[]): Promise<SeedJob[]> {
  console.log(`Seeding ${JOB_COUNT} jobs...`);
  const approved = companies.filter((c) => c.verification_status === 'approved');
  const jobCompanies = approved.length > 0 ? approved : companies;
  const jobs: SeedJob[] = [];
  const batch: Record<string, unknown>[] = [];

  for (let i = 0; i < JOB_COUNT; i++) {
    const company = faker.helpers.arrayElement(jobCompanies);
    const status = faker.helpers.weightedArrayElement([
      { weight: 7, value: 'open' as const },
      { weight: 2, value: 'closed' as const },
      { weight: 1, value: 'draft' as const }
    ]);

    batch.push({
      company_id: company.id,
      title: faker.helpers.arrayElement(JOB_TITLES),
      description: faker.lorem.paragraphs(2),
      location: faker.helpers.arrayElement(['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Remote', 'Pokhara']),
      job_type: faker.helpers.arrayElement(['internship', 'full_time', 'part_time'] as const),
      min_cgpa: Number(faker.number.float({ min: 2.0, max: 3.5, fractionDigits: 2 }).toFixed(2)),
      status
    });
  }

  // Insert in chunks of 50
  for (let offset = 0; offset < batch.length; offset += 50) {
    const chunk = batch.slice(offset, offset + 50);
    const { data, error } = await admin.from('jobs').insert(chunk).select('id, company_id, status');
    if (error) {
      throw new Error(`Failed to insert jobs: ${error.message}`);
    }
    for (const row of data ?? []) {
      jobs.push(row);
    }
    console.log(`  jobs: ${Math.min(offset + 50, JOB_COUNT)}/${JOB_COUNT}`);
  }

  return jobs;
}

async function seedSwipesMatchesAndChat(
  admin: SupabaseClient,
  students: SeedStudent[],
  jobs: SeedJob[]
): Promise<{ swipes: number; matches: number; conversations: number; messages: number; savedJobs: number }> {
  console.log(`Seeding ~${SWIPE_COUNT} swipes + derived matches...`);

  const openJobs = jobs.filter((j) => j.status === 'open');
  const swipePool = openJobs.length > 0 ? openJobs : jobs;
  const usedKeys = new Set<string>();
  const swipeRows: {
    student_id: string;
    company_id: string;
    job_id: string;
    direction: 'left' | 'right';
  }[] = [];

  let attempts = 0;
  while (swipeRows.length < SWIPE_COUNT && attempts < SWIPE_COUNT * 20) {
    attempts += 1;
    const student = faker.helpers.arrayElement(students);
    const job = faker.helpers.arrayElement(swipePool);
    const key = `${student.id}:${job.id}`;
    if (usedKeys.has(key)) {
      continue;
    }
    usedKeys.add(key);
    swipeRows.push({
      student_id: student.id,
      company_id: job.company_id,
      job_id: job.id,
      direction: faker.helpers.weightedArrayElement([
        { weight: 55, value: 'right' as const },
        { weight: 45, value: 'left' as const }
      ])
    });
  }

  for (let offset = 0; offset < swipeRows.length; offset += 100) {
    const chunk = swipeRows.slice(offset, offset + 100);
    const { error } = await admin.from('swipes').insert(chunk);
    if (error) {
      throw new Error(`Failed to insert swipes: ${error.message}`);
    }
  }

  const rightSwipes = swipeRows.filter((s) => s.direction === 'right');
  const matchCandidates = faker.helpers.arrayElements(
    rightSwipes,
    Math.min(MATCH_TARGET, rightSwipes.length)
  );

  let matchCount = 0;
  let conversationCount = 0;
  let messageCount = 0;

  for (const swipe of matchCandidates) {
    const { data: match, error: matchError } = await admin
      .from('matches')
      .insert({
        student_id: swipe.student_id,
        company_id: swipe.company_id,
        job_id: swipe.job_id
      })
      .select('id')
      .single();

    if (matchError) {
      // Unique conflict or race — skip
      continue;
    }

    matchCount += 1;

    const { data: conversation, error: convError } = await admin
      .from('conversations')
      .insert({ match_id: match.id })
      .select('id')
      .single();

    if (convError) {
      throw new Error(`Failed to create conversation: ${convError.message}`);
    }

    conversationCount += 1;

    const opener = faker.helpers.arrayElement([
      'Hi! Thanks for the match — excited to learn more about this role.',
      'Hello, I would love to discuss the opportunity further.',
      'Thanks for connecting! When would be a good time to chat?'
    ]);

    const { error: msgError } = await admin.from('messages').insert({
      conversation_id: conversation.id,
      sender_id: swipe.student_id,
      content: opener
    });

    if (msgError) {
      throw new Error(`Failed to insert seed message: ${msgError.message}`);
    }
    messageCount += 1;

    await admin.from('notifications').insert([
      {
        user_id: swipe.student_id,
        type: 'match',
        payload: { match_id: match.id, job_id: swipe.job_id }
      },
      {
        user_id: swipe.company_id,
        type: 'match',
        payload: { match_id: match.id, job_id: swipe.job_id }
      }
    ]);
  }

  // Saved jobs: ~80 bookmarks from open jobs
  const savedRows: { student_id: string; job_id: string }[] = [];
  const savedKeys = new Set<string>();
  while (savedRows.length < 80 && openJobs.length > 0) {
    const student = faker.helpers.arrayElement(students);
    const job = faker.helpers.arrayElement(openJobs);
    const key = `${student.id}:${job.id}`;
    if (savedKeys.has(key)) {
      continue;
    }
    savedKeys.add(key);
    savedRows.push({ student_id: student.id, job_id: job.id });
  }

  if (savedRows.length > 0) {
    const { error: savedError } = await admin.from('saved_jobs').insert(savedRows);
    if (savedError) {
      throw new Error(`Failed to insert saved_jobs: ${savedError.message}`);
    }
  }

  return {
    swipes: swipeRows.length,
    matches: matchCount,
    conversations: conversationCount,
    messages: messageCount,
    savedJobs: savedRows.length
  };
}

async function printCounts(admin: SupabaseClient): Promise<void> {
  const tables = [
    'skills',
    'students',
    'companies',
    'jobs',
    'student_skills',
    'swipes',
    'matches',
    'conversations',
    'messages',
    'saved_jobs',
    'notifications'
  ] as const;

  console.log('\nFinal counts:');
  for (const table of tables) {
    const { count, error } = await admin.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`  ${table}: error (${error.message})`);
    } else {
      console.log(`  ${table}: ${count ?? 0}`);
    }
  }

  const { count: seedUsers } = await admin
    .from('users')
    .select('*', { count: 'exact', head: true })
    .like('email', `${SEED_EMAIL_PREFIX}%`);
  console.log(`  seed users (email seed.%): ${seedUsers ?? 0}`);
}

async function main(): Promise<void> {
  assertNotProduction();
  faker.seed(20260710);

  const admin = await createAdminClient();
  console.log('KUPC Phase 3B Milestone 9 — seed\n');

  await clearPreviousSeed(admin);
  const skills = await seedSkills(admin);
  const students = await seedStudents(admin, skills);
  const companies = await seedCompanies(admin);
  const jobs = await seedJobs(admin, companies);
  const derived = await seedSwipesMatchesAndChat(admin, students, jobs);

  console.log('\nSeed summary:');
  console.log(`  skills: ${skills.length}`);
  console.log(`  students: ${students.length}`);
  console.log(`  companies: ${companies.length}`);
  console.log(
    `    approved=${companies.filter((c) => c.verification_status === 'approved').length}` +
      ` pending=${companies.filter((c) => c.verification_status === 'pending').length}` +
      ` rejected=${companies.filter((c) => c.verification_status === 'rejected').length}`
  );
  console.log(`  jobs: ${jobs.length}`);
  console.log(`  swipes: ${derived.swipes}`);
  console.log(`  matches: ${derived.matches}`);
  console.log(`  conversations: ${derived.conversations}`);
  console.log(`  messages: ${derived.messages}`);
  console.log(`  saved_jobs: ${derived.savedJobs}`);
  console.log(`\nDemo password for all seed accounts: ${SEED_PASSWORD}`);
  console.log(`Example student: ${studentEmail(1)}`);
  console.log(`Example company: ${companyEmail(1)}`);

  await printCounts(admin);
  console.log('\nSeed complete.');
}

main().catch((err) => {
  console.error('Seed failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
