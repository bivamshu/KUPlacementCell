import { randomUUID } from 'crypto';
import {
  asAuthenticated,
  deleteAuthUser,
  hasDatabaseUrl,
  insertAuthUser,
  insertPublicUser,
  withDb
} from './helpers/phase3Db';

const describeDb = hasDatabaseUrl ? describe : describe.skip;

type Fixture = {
  studentA: string;
  studentB: string;
  companyA: string;
  companyB: string;
  skillId: string;
  jobOpenId: string;
  jobDraftId: string;
  resumeId: string;
  matchId: string;
  conversationId: string;
};

describeDb('Milestone 11 - Phase 3 testing matrix (live database)', () => {
  jest.setTimeout(120_000);

  let fx: Fixture;

  beforeAll(async () => {
    await withDb(async (client) => {
      const studentA = randomUUID();
      const studentB = randomUUID();
      const companyA = randomUUID();
      const companyB = randomUUID();
      const stamp = Date.now();

      await insertAuthUser(client, { id: studentA, email: `matrix.student.a.${stamp}@ku.edu.np` });
      await insertAuthUser(client, { id: studentB, email: `matrix.student.b.${stamp}@ku.edu.np` });
      await insertAuthUser(client, { id: companyA, email: `matrix.company.a.${stamp}@example.com` });
      await insertAuthUser(client, { id: companyB, email: `matrix.company.b.${stamp}@example.com` });

      await insertPublicUser(client, {
        id: studentA,
        email: `matrix.student.a.${stamp}@ku.edu.np`,
        role: 'STUDENT'
      });
      await insertPublicUser(client, {
        id: studentB,
        email: `matrix.student.b.${stamp}@ku.edu.np`,
        role: 'STUDENT'
      });
      await insertPublicUser(client, {
        id: companyA,
        email: `matrix.company.a.${stamp}@example.com`,
        role: 'COMPANY'
      });
      await insertPublicUser(client, {
        id: companyB,
        email: `matrix.company.b.${stamp}@example.com`,
        role: 'COMPANY'
      });

      await client.query(
        `
        INSERT INTO public.students (id, ku_id, full_name, department, graduation_year, cgpa)
        VALUES
          ($1, $2, 'Matrix Student A', 'Computer Science', 2027, 3.50),
          ($3, $4, 'Matrix Student B', 'Computer Engineering', 2028, 3.20)
        `,
        [studentA, `matrix.a.${stamp}`, studentB, `matrix.b.${stamp}`]
      );

      await client.query(
        `
        INSERT INTO public.companies (id, company_name, website, verification_status, verified_at, industry)
        VALUES
          ($1, 'Matrix Co A', 'https://a.example.com', 'approved', NOW(), 'Technology'),
          ($2, 'Matrix Co B', 'https://b.example.com', 'approved', NOW(), 'Finance')
        `,
        [companyA, companyB]
      );

      const skill = await client.query<{ id: string }>(
        `
        INSERT INTO public.skills (name)
        VALUES ($1)
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
        `,
        [`MatrixSkill-${stamp}`]
      );

      const jobs = await client.query<{ id: string; status: string }>(
        `
        INSERT INTO public.jobs (company_id, title, description, location, job_type, status)
        VALUES
          ($1, 'Open Role', 'Open job for matrix tests', 'Kathmandu', 'internship', 'open'),
          ($1, 'Draft Role', 'Draft job for matrix tests', 'Kathmandu', 'full_time', 'draft'),
          ($2, 'Other Co Role', 'Belonging to company B', 'Lalitpur', 'part_time', 'open')
        RETURNING id, status
        `,
        [companyA, companyB]
      );

      const jobOpenId = jobs.rows[0]!.id;
      const jobDraftId = jobs.rows[1]!.id;

      const resume = await client.query<{ id: string }>(
        `
        INSERT INTO public.resumes (student_id, file_url, file_name)
        VALUES ($1, 'https://example.com/a.pdf', 'a.pdf')
        RETURNING id
        `,
        [studentA]
      );

      await client.query(`UPDATE public.students SET resume_id = $1 WHERE id = $2`, [
        resume.rows[0]!.id,
        studentA
      ]);

      await client.query(
        `
        INSERT INTO public.resume_analysis (resume_id, extracted_skills, ats_score, summary)
        VALUES ($1, '{"skills":["Python"]}'::jsonb, 82.5, 'Strong candidate')
        `,
        [resume.rows[0]!.id]
      );

      await client.query(
        `
        INSERT INTO public.student_skills (student_id, skill_id, proficiency)
        VALUES ($1, $2, 'intermediate')
        `,
        [studentA, skill.rows[0]!.id]
      );

      const match = await client.query<{ id: string }>(
        `
        INSERT INTO public.matches (student_id, company_id, job_id)
        VALUES ($1, $2, $3)
        RETURNING id
        `,
        [studentA, companyA, jobOpenId]
      );

      const conversation = await client.query<{ id: string }>(
        `
        INSERT INTO public.conversations (match_id)
        VALUES ($1)
        RETURNING id
        `,
        [match.rows[0]!.id]
      );

      await client.query(
        `
        INSERT INTO public.messages (conversation_id, sender_id, content)
        VALUES ($1, $2, 'Hello from matrix fixture')
        `,
        [conversation.rows[0]!.id, studentA]
      );

      fx = {
        studentA,
        studentB,
        companyA,
        companyB,
        skillId: skill.rows[0]!.id,
        jobOpenId,
        jobDraftId,
        resumeId: resume.rows[0]!.id,
        matchId: match.rows[0]!.id,
        conversationId: conversation.rows[0]!.id
      };
    });
  });

  afterAll(async () => {
    if (!fx) {
      return;
    }
    await withDb(async (client) => {
      // Deleting auth users cascades public.users → students/companies → related rows
      for (const id of [fx.studentA, fx.studentB, fx.companyA, fx.companyB]) {
        await deleteAuthUser(client, id);
      }
      await client.query(`DELETE FROM public.skills WHERE id = $1`, [fx.skillId]);
    });
  });

  describe('Schema & CRUD', () => {
    it('inserts a valid row into each Phase 3 domain table shape', async () => {
      await withDb(async (client) => {
        const stamp = Date.now();
        const skill = await client.query(
          `INSERT INTO public.skills (name) VALUES ($1) RETURNING id`,
          [`MatrixCRUD-${stamp}`]
        );
        const skillId = skill.rows[0].id as string;

        await client.query(
          `INSERT INTO public.student_skills (student_id, skill_id, proficiency) VALUES ($1, $2, 'beginner')`,
          [fx.studentB, skillId]
        );

        const job = await client.query(
          `INSERT INTO public.jobs (company_id, title, description, status) VALUES ($1, 'CRUD Job', 'desc', 'open') RETURNING id`,
          [fx.companyA]
        );

        await client.query(
          `INSERT INTO public.swipes (student_id, company_id, job_id, direction) VALUES ($1, $2, $3, 'left')`,
          [fx.studentB, fx.companyA, job.rows[0].id]
        );

        await client.query(
          `INSERT INTO public.saved_jobs (student_id, job_id) VALUES ($1, $2)`,
          [fx.studentB, job.rows[0].id]
        );

        await client.query(
          `INSERT INTO public.notifications (user_id, type, payload) VALUES ($1, 'match', '{"ok":true}'::jsonb)`,
          [fx.studentB]
        );

        await client.query(
          `INSERT INTO public.reports (reporter_id, target_user_id, reason) VALUES ($1, $2, 'spam')`,
          [fx.studentB, fx.companyA]
        );

        await client.query(
          `INSERT INTO public.analytics_events (user_id, event_type, metadata) VALUES ($1, 'job_view', '{"job":1}'::jsonb)`,
          [fx.studentB]
        );

        await client.query(
          `INSERT INTO public.company_verification_requests (company_id, document_type, file_url, status)
           VALUES ($1, 'registration', NULL, 'pending')`,
          [fx.companyB]
        );

        // cleanup extras that won't cascade from auth delete of fixtures alone for skills
        await client.query(`DELETE FROM public.skills WHERE id = $1`, [skillId]);
        await client.query(`DELETE FROM public.jobs WHERE id = $1`, [job.rows[0].id]);
      });
    });

    it('rejects NOT NULL violations', async () => {
      await withDb(async (client) => {
        await expect(
          client.query(
            `INSERT INTO public.jobs (company_id, title, description) VALUES ($1, NULL, 'x')`,
            [fx.companyA]
          )
        ).rejects.toMatchObject({ code: '23502' });
      });
    });

    it('rejects CHECK violations (cgpa = 5.0)', async () => {
      await withDb(async (client) => {
        await expect(
          client.query(`UPDATE public.students SET cgpa = 5.0 WHERE id = $1`, [fx.studentA])
        ).rejects.toMatchObject({ code: '23514' });
      });
    });

    it('updates and deletes a row by primary key', async () => {
      await withDb(async (client) => {
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO public.jobs (company_id, title, description, status)
           VALUES ($1, 'Temp', 'temp', 'draft') RETURNING id`,
          [fx.companyA]
        );
        const id = inserted.rows[0]!.id;

        await client.query(`UPDATE public.jobs SET title = 'Temp Updated' WHERE id = $1`, [id]);
        const updated = await client.query(`SELECT title FROM public.jobs WHERE id = $1`, [id]);
        expect(updated.rows[0].title).toBe('Temp Updated');

        await client.query(`DELETE FROM public.jobs WHERE id = $1`, [id]);
        const gone = await client.query(`SELECT 1 FROM public.jobs WHERE id = $1`, [id]);
        expect(gone.rowCount).toBe(0);
      });
    });
  });

  describe('Relationships & Cascades', () => {
    it('deleting a student cascades resumes, swipes, matches, and student_skills', async () => {
      await withDb(async (client) => {
        const id = randomUUID();
        const stamp = Date.now();
        await insertAuthUser(client, { id, email: `matrix.cascade.student.${stamp}@ku.edu.np` });
        await insertPublicUser(client, {
          id,
          email: `matrix.cascade.student.${stamp}@ku.edu.np`,
          role: 'STUDENT'
        });
        await client.query(
          `INSERT INTO public.students (id, ku_id, full_name) VALUES ($1, $2, 'Cascade Student')`,
          [id, `matrix.cascade.${stamp}`]
        );

        const resume = await client.query(
          `INSERT INTO public.resumes (student_id, file_url, file_name) VALUES ($1, 'https://x', 'x.pdf') RETURNING id`,
          [id]
        );
        await client.query(
          `INSERT INTO public.student_skills (student_id, skill_id, proficiency) VALUES ($1, $2, 'advanced')`,
          [id, fx.skillId]
        );
        await client.query(
          `INSERT INTO public.swipes (student_id, company_id, job_id, direction) VALUES ($1, $2, $3, 'right')`,
          [id, fx.companyA, fx.jobOpenId]
        );
        const match = await client.query(
          `INSERT INTO public.matches (student_id, company_id, job_id) VALUES ($1, $2, $3) RETURNING id`,
          [id, fx.companyA, fx.jobDraftId]
        );

        await deleteAuthUser(client, id);

        const resumes = await client.query(`SELECT 1 FROM public.resumes WHERE id = $1`, [
          resume.rows[0].id
        ]);
        const skills = await client.query(
          `SELECT 1 FROM public.student_skills WHERE student_id = $1`,
          [id]
        );
        const swipes = await client.query(`SELECT 1 FROM public.swipes WHERE student_id = $1`, [id]);
        const matches = await client.query(`SELECT 1 FROM public.matches WHERE id = $1`, [
          match.rows[0].id
        ]);

        expect(resumes.rowCount).toBe(0);
        expect(skills.rowCount).toBe(0);
        expect(swipes.rowCount).toBe(0);
        expect(matches.rowCount).toBe(0);
      });
    });

    it('deleting a company cascades its jobs, swipes, and matches', async () => {
      await withDb(async (client) => {
        const id = randomUUID();
        const stamp = Date.now();
        await insertAuthUser(client, { id, email: `matrix.cascade.company.${stamp}@example.com` });
        await insertPublicUser(client, {
          id,
          email: `matrix.cascade.company.${stamp}@example.com`,
          role: 'COMPANY'
        });
        await client.query(
          `INSERT INTO public.companies (id, company_name, verification_status) VALUES ($1, 'Cascade Co', 'approved')`,
          [id]
        );
        const job = await client.query(
          `INSERT INTO public.jobs (company_id, title, description, status) VALUES ($1, 'C', 'd', 'open') RETURNING id`,
          [id]
        );
        await client.query(
          `INSERT INTO public.swipes (student_id, company_id, job_id, direction) VALUES ($1, $2, $3, 'left')`,
          [fx.studentA, id, job.rows[0].id]
        );
        await client.query(
          `INSERT INTO public.matches (student_id, company_id, job_id) VALUES ($1, $2, $3)`,
          [fx.studentB, id, job.rows[0].id]
        );

        await deleteAuthUser(client, id);

        const jobs = await client.query(`SELECT 1 FROM public.jobs WHERE id = $1`, [job.rows[0].id]);
        const swipes = await client.query(`SELECT 1 FROM public.swipes WHERE company_id = $1`, [id]);
        const matches = await client.query(`SELECT 1 FROM public.matches WHERE company_id = $1`, [
          id
        ]);

        expect(jobs.rowCount).toBe(0);
        expect(swipes.rowCount).toBe(0);
        expect(matches.rowCount).toBe(0);
      });
    });

    it('deleting active resume SETs students.resume_id NULL and keeps the student', async () => {
      await withDb(async (client) => {
        const before = await client.query(`SELECT resume_id FROM public.students WHERE id = $1`, [
          fx.studentA
        ]);
        expect(before.rows[0].resume_id).toBe(fx.resumeId);

        await client.query(`DELETE FROM public.resumes WHERE id = $1`, [fx.resumeId]);

        const after = await client.query(
          `SELECT id, resume_id FROM public.students WHERE id = $1`,
          [fx.studentA]
        );
        expect(after.rowCount).toBe(1);
        expect(after.rows[0].resume_id).toBeNull();

        // restore a resume pointer for later RLS resume tests
        const restored = await client.query<{ id: string }>(
          `INSERT INTO public.resumes (student_id, file_url, file_name)
           VALUES ($1, 'https://example.com/a2.pdf', 'a2.pdf') RETURNING id`,
          [fx.studentA]
        );
        fx.resumeId = restored.rows[0]!.id;
        await client.query(`UPDATE public.students SET resume_id = $1 WHERE id = $2`, [
          fx.resumeId,
          fx.studentA
        ]);
        await client.query(
          `INSERT INTO public.resume_analysis (resume_id, summary) VALUES ($1, 'restored')`,
          [fx.resumeId]
        );
      });
    });

    it('rejects swipe/match FK to non-existent student', async () => {
      await withDb(async (client) => {
        const missing = randomUUID();
        await expect(
          client.query(
            `INSERT INTO public.swipes (student_id, company_id, job_id, direction)
             VALUES ($1, $2, $3, 'right')`,
            [missing, fx.companyA, fx.jobOpenId]
          )
        ).rejects.toMatchObject({ code: '23503' });
      });
    });
  });

  describe('Uniqueness & Duplicates', () => {
    it('rejects duplicate swipe on the same triple', async () => {
      await withDb(async (client) => {
        await client.query(
          `INSERT INTO public.swipes (student_id, company_id, job_id, direction)
           VALUES ($1, $2, $3, 'right')
           ON CONFLICT DO NOTHING`,
          [fx.studentA, fx.companyA, fx.jobOpenId]
        );

        await expect(
          client.query(
            `INSERT INTO public.swipes (student_id, company_id, job_id, direction)
             VALUES ($1, $2, $3, 'left')`,
            [fx.studentA, fx.companyA, fx.jobOpenId]
          )
        ).rejects.toMatchObject({ code: '23505' });
      });
    });

    it('rejects duplicate ku_id', async () => {
      await withDb(async (client) => {
        const id = randomUUID();
        const stamp = Date.now();
        await insertAuthUser(client, { id, email: `matrix.dupku.${stamp}@ku.edu.np` });
        await insertPublicUser(client, {
          id,
          email: `matrix.dupku.${stamp}@ku.edu.np`,
          role: 'STUDENT'
        });

        const existing = await client.query(`SELECT ku_id FROM public.students WHERE id = $1`, [
          fx.studentA
        ]);

        await expect(
          client.query(
            `INSERT INTO public.students (id, ku_id, full_name) VALUES ($1, $2, 'Dup')`,
            [id, existing.rows[0].ku_id]
          )
        ).rejects.toMatchObject({ code: '23505' });

        await deleteAuthUser(client, id);
      });
    });

    it('rejects duplicate skill name', async () => {
      await withDb(async (client) => {
        const name = await client.query(`SELECT name FROM public.skills WHERE id = $1`, [
          fx.skillId
        ]);
        await expect(
          client.query(`INSERT INTO public.skills (name) VALUES ($1)`, [name.rows[0].name])
        ).rejects.toMatchObject({ code: '23505' });
      });
    });
  });

  describe('Indexes (EXPLAIN ANALYZE)', () => {
    it('jobs status filter can use idx_jobs_status', async () => {
      await withDb(async (client) => {
        await client.query('SET enable_seqscan = off');
        const plan = await client.query<{ 'QUERY PLAN': string }>(
          `EXPLAIN (ANALYZE, FORMAT TEXT) SELECT * FROM public.jobs WHERE status = 'open'`
        );
        await client.query('SET enable_seqscan = on');

        const text = plan.rows.map((r: { 'QUERY PLAN': string }) => r['QUERY PLAN']).join('\n');
        expect(text).toMatch(/idx_jobs_status|Index Scan|Bitmap Index Scan/i);
        expect(text).not.toMatch(/Seq Scan on jobs/i);
      });
    });

    it('swipes student_id lookup can use idx_swipes_student_id', async () => {
      await withDb(async (client) => {
        await client.query('SET enable_seqscan = off');
        const plan = await client.query<{ 'QUERY PLAN': string }>(
          `EXPLAIN (ANALYZE, FORMAT TEXT) SELECT * FROM public.swipes WHERE student_id = $1`,
          [fx.studentA]
        );
        await client.query('SET enable_seqscan = on');

        const text = plan.rows.map((r: { 'QUERY PLAN': string }) => r['QUERY PLAN']).join('\n');
        expect(text).toMatch(/idx_swipes_student_id|Index Scan|Bitmap Index Scan/i);
      });
    });

    it('required hot-path indexes exist', async () => {
      await withDb(async (client) => {
        const result = await client.query<{ indexname: string }>(
          `
          SELECT indexname FROM pg_indexes
          WHERE schemaname = 'public'
            AND indexname IN ('idx_jobs_status', 'idx_swipes_student_id', 'idx_jobs_open_company_id')
          `
        );
        const names = result.rows.map((r: { indexname: string }) => r.indexname);
        expect(names).toEqual(
          expect.arrayContaining([
            'idx_jobs_status',
            'idx_swipes_student_id',
            'idx_jobs_open_company_id'
          ])
        );
      });
    });
  });

  describe('Row Level Security', () => {
    it('student A cannot SELECT or UPDATE student B profile', async () => {
      await withDb(async (client) => {
        await asAuthenticated(client, fx.studentA, async () => {
          const visible = await client.query(`SELECT id FROM public.students WHERE id = $1`, [
            fx.studentB
          ]);
          expect(visible.rowCount).toBe(0);

          const updated = await client.query(
            `UPDATE public.students SET bio = 'hacked' WHERE id = $1 RETURNING id`,
            [fx.studentB]
          );
          expect(updated.rowCount).toBe(0);
        });
      });
    });

    it('company cannot UPDATE another company job', async () => {
      await withDb(async (client) => {
        await asAuthenticated(client, fx.companyB, async () => {
          const updated = await client.query(
            `UPDATE public.jobs SET title = 'stolen' WHERE id = $1 RETURNING id`,
            [fx.jobOpenId]
          );
          expect(updated.rowCount).toBe(0);
        });
      });
    });

    it('student can SELECT open jobs but not another company draft', async () => {
      await withDb(async (client) => {
        await asAuthenticated(client, fx.studentA, async () => {
          const open = await client.query(`SELECT id FROM public.jobs WHERE id = $1`, [
            fx.jobOpenId
          ]);
          expect(open.rowCount).toBe(1);

          const draft = await client.query(`SELECT id FROM public.jobs WHERE id = $1`, [
            fx.jobDraftId
          ]);
          expect(draft.rowCount).toBe(0);
        });
      });
    });

    it('non-participant cannot SELECT or INSERT conversation messages', async () => {
      await withDb(async (client) => {
        await asAuthenticated(client, fx.studentB, async () => {
          const messages = await client.query(
            `SELECT id FROM public.messages WHERE conversation_id = $1`,
            [fx.conversationId]
          );
          expect(messages.rowCount).toBe(0);

          await expect(
            client.query(
              `INSERT INTO public.messages (conversation_id, sender_id, content)
               VALUES ($1, $2, 'intruder')`,
              [fx.conversationId, fx.studentB]
            )
          ).rejects.toBeTruthy();
        });
      });
    });

    it('student cannot view another student resumes or analysis', async () => {
      await withDb(async (client) => {
        await asAuthenticated(client, fx.studentB, async () => {
          const resumes = await client.query(`SELECT id FROM public.resumes WHERE id = $1`, [
            fx.resumeId
          ]);
          expect(resumes.rowCount).toBe(0);

          const analysis = await client.query(
            `SELECT id FROM public.resume_analysis WHERE resume_id = $1`,
            [fx.resumeId]
          );
          expect(analysis.rowCount).toBe(0);
        });
      });
    });

    it('service-role / table owner can read and write across RLS boundaries', async () => {
      await withDb(async (client) => {
        const students = await client.query(`SELECT id FROM public.students WHERE id = ANY($1::uuid[])`, [
          [fx.studentA, fx.studentB]
        ]);
        expect(students.rowCount).toBe(2);

        const draft = await client.query(`SELECT id, status FROM public.jobs WHERE id = $1`, [
          fx.jobDraftId
        ]);
        expect(draft.rows[0].status).toBe('draft');

        await client.query(
          `UPDATE public.students SET bio = 'service write ok' WHERE id = $1`,
          [fx.studentB]
        );
        const bio = await client.query(`SELECT bio FROM public.students WHERE id = $1`, [
          fx.studentB
        ]);
        expect(bio.rows[0].bio).toBe('service write ok');
      });
    });
  });
});

describe('Milestone 11 - matrix availability', () => {
  it('documents DATABASE_URL requirement when live suite is skipped', () => {
    if (!hasDatabaseUrl) {
      console.warn(
        'Skipping live Phase 3 matrix: set DATABASE_URL in .env to run CRUD/cascade/RLS/EXPLAIN tests.'
      );
    }
    expect(typeof hasDatabaseUrl).toBe('boolean');
  });
});
