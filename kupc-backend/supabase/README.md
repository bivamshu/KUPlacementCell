# Supabase migrations

## Apply migrations in order

1. `supabase/migrations/20260709000000_phase2_auth_schema.sql` — Phase 2 auth tables + RLS
2. `supabase/migrations/20260709000001_phase2_registration_rpcs.sql` — atomic registration RPCs
3. `supabase/migrations/20260710000000_phase3_schema.sql` — Phase 3 domain tables + profile extensions

### Option A: npm script (recommended)

From `kupc-backend/`:

```bash
npm run db:migrate
```

Requires `DATABASE_URL` in `.env` (Supabase Settings → Database → Connection string URI).

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

Row Level Security is enabled on all tables. Policies for Phase 3 tables are added in Milestone 8. The KUPC backend uses the **service-role** key for trusted server-side repository access.

## Production configuration checklist

After migrations:

1. Set `OTP_EMAIL_ENABLED=true` and configure SMTP variables for student OTP delivery.
2. Set `ADMIN_TOTP_SECRET` (base32) and keep `ADMIN_PASSWORD_LOGIN_ENABLED=false` in production.
3. Optionally set `REDIS_URL` for shared auth user cache across API instances.
