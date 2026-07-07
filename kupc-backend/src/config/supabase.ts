import { createClient } from '@supabase/supabase-js';
import { env } from './env';

export const supabaseAnon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

export async function verifySupabaseConnection(): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });

  if (error) {
    throw new Error(`Supabase connection check failed: ${error.message}`);
  }
}
