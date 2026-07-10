# Supabase migrations

## Apply migrations in order

1. `supabase/migrations/20260709000000_phase2_auth_schema.sql` — Phase 2 auth tables + RLS
2. `supabase/migrations/20260709000001_phase2_registration_rpcs.sql` — atomic registration RPCs
3. `supabase/migrations/20260710000000_phase3_schema.sql` — Phase 3 domain tables + profile extensions
4. `supabase/migrations/20260710000001_phase3_indexes.sql` — Phase 3 hot-path indexes
5. `supabase/migrations/20260710000002_phase3_rls_policies.sql` — Phase 3 RLS policies

### Option A: npm script (recommended)

From `kupc-backend/`:

```bash
npm run db:migrate
```

Requires `DATABASE_URL` in `.env` (Supabase Settings → Database → Connection string URI).

### Seed demo data (Milestone 9)

After migrations, load local/staging demo data (**never production**):

```bash
npm run db:seed
```

Requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Creates 100 students, 50 companies, 200 jobs, ~40 skills, ~500 swipes, and derived matches/conversations. All seed emails use the `seed.` prefix; password is `SeedPass123!`. Re-running clears prior `seed.*` users first.

### Option B: Supabase SQL editor

1. Open your Supabase project.
2. Go to **SQL** → **New query**.
3. Paste each migration file and run **in order**.

### Option C: Supabase CLI

```bash
supabase db push
```

Requires the [Supabase CLI](https://supabase.com/docs/guides/cli) linked to your project.

## Phase 2 tables

- `users`
- `students` (extended in Phase 3)
- `companies` (extended in Phase 3)
- `sessions`
- `refresh_tokens`
- `student_otps`
- `company_verification_requests` (renamed from `company_requests` in Phase 3)

## Phase 3 tables

- `skills`
- `resumes`
- `resume_analysis`
- `student_skills`
- `jobs`
- `swipes`
- `matches`
- `saved_jobs`
- `conversations`
- `messages`
- `notifications`
- `reports`
- `analytics_events`

## RPC functions

- `register_student_profile` — inserts `users` + `students` in one transaction
- `register_company_profile` — inserts `users` + `companies` in one transaction

## Triggers

- `set_updated_at()` on `students`, `companies`, and `jobs`

## Phase 3 indexes (Milestone 7)

Hot-path indexes live in `20260710000001_phase3_indexes.sql`:

| Index | Table |
| --- | --- |
| `idx_students_ku_id` | students |
| `idx_companies_verification_status` | companies |
| `idx_jobs_company_id` | jobs |
| `idx_jobs_status` | jobs |
| `idx_jobs_open_company_id` | jobs (partial: `WHERE status = 'open'`) |
| `idx_swipes_student_id` | swipes |
| `idx_swipes_company_id` | swipes |
| `idx_matches_student_id` | matches |
| `idx_matches_company_id` | matches |
| `idx_messages_conversation_id` | messages |
| `idx_notifications_user_id` | notifications |
| `idx_resumes_student_id` | resumes |

Verify:

```sql
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

Row Level Security is enabled on all tables. Phase 3 policies live in `20260710000002_phase3_rls_policies.sql` (Milestone 8). The KUPC backend uses the **service-role** key for trusted server-side repository access.

## Seed data (Milestone 9)

| Dataset | Count |
| --- | --- |
| Skills | 40 |
| Students | 100 (`seed.student.NNN@ku.edu.np`) |
| Companies | 50 (`seed.company.NNN@example.com`) |
| Jobs | 200 |
| Swipes | ~500 |
| Matches / conversations | ~25 (derived) |

```bash
npm run db:seed
```

Demo password for all seed accounts: `SeedPass123!`

## Testing (Milestone 11)

```bash
npm run test:phase3
```

Runs static Phase 3 suites plus the live matrix (CRUD, cascades, uniqueness, RLS, `EXPLAIN ANALYZE`). Live tests need `DATABASE_URL`.

## Production configuration checklist

After migrations:

1. Set `OTP_EMAIL_ENABLED=true` and configure SMTP variables for student OTP delivery.
2. Set `ADMIN_TOTP_SECRET` (base32) and keep `ADMIN_PASSWORD_LOGIN_ENABLED=false` in production.
3. Optionally set `REDIS_URL` for shared auth user cache across API instances.
