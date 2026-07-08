# Supabase migrations (Phase 2)

## Apply migrations in order

1. `supabase/migrations/20260709000000_phase2_auth_schema.sql` — tables + RLS
2. `supabase/migrations/20260709000001_phase2_registration_rpcs.sql` — atomic registration RPCs

### Option A: Supabase SQL editor

1. Open your Supabase project.
2. Go to **SQL** → **New query**.
3. Paste each migration file and run **in order**.

### Option B: Supabase CLI

From `kupc-backend/`:

```bash
supabase db push
```

Requires the [Supabase CLI](https://supabase.com/docs/guides/cli) linked to your project.

## Tables created

- `users`
- `students`
- `companies`
- `sessions`
- `refresh_tokens`
- `student_otps`
- `company_requests`

## RPC functions created

- `register_student_profile` — inserts `users` + `students` in one transaction
- `register_company_profile` — inserts `users` + `companies` in one transaction

Row Level Security is enabled on all tables. The KUPC backend uses the **service-role** key for trusted server-side repository access.

## Production configuration checklist

After migrations:

1. Set `OTP_EMAIL_ENABLED=true` and configure SMTP variables for student OTP delivery.
2. Set `ADMIN_TOTP_SECRET` (base32) and keep `ADMIN_PASSWORD_LOGIN_ENABLED=false` in production.
3. Optionally set `REDIS_URL` for shared auth user cache across API instances.
