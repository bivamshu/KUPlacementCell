import dotenv from 'dotenv';
import path from 'path';
import pg from 'pg';

dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

export const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

export function createDbClient(): pg.Client {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for Phase 3 matrix tests');
  }

  return new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });
}

export async function withDb<T>(fn: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = createDbClient();
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/** Create a minimal auth.users row so public.users FK succeeds. */
export async function insertAuthUser(
  client: pg.Client,
  input: { id: string; email: string }
): Promise<void> {
  await client.query(
    `
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      $1,
      'authenticated',
      'authenticated',
      $2,
      crypt('MatrixTest123!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"seeded":false,"matrix":true}'::jsonb,
      NOW(),
      NOW()
    )
    `,
    [input.id, input.email]
  );
}

export async function insertPublicUser(
  client: pg.Client,
  input: { id: string; email: string; role: 'STUDENT' | 'COMPANY' | 'ADMIN' }
): Promise<void> {
  await client.query(
    `
    INSERT INTO public.users (id, email, role, email_verified, status)
    VALUES ($1, $2, $3, TRUE, 'active')
    `,
    [input.id, input.email, input.role]
  );
}

export async function deleteAuthUser(client: pg.Client, id: string): Promise<void> {
  await client.query('DELETE FROM auth.users WHERE id = $1', [id]);
}

export async function asAuthenticated<T>(
  client: pg.Client,
  userId: string,
  fn: () => Promise<T>
): Promise<T> {
  await client.query('BEGIN');
  try {
    await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ sub: userId, role: 'authenticated' })
    ]);
    await client.query('SET LOCAL ROLE authenticated');
    const result = await fn();
    await client.query('ROLLBACK');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore rollback errors
    }
    throw error;
  }
}
