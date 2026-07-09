# Supabase project setup (first-time)

Follow these steps to create a Supabase project and connect KUPC Phase 2.

## 1. Create the project

1. Go to [https://supabase.com](https://supabase.com) and sign in (GitHub is fine).
2. Click **New project**.
3. Choose your organization (or create one).
4. Set:
   - **Name:** `kupc` (or any name)
   - **Database password:** generate a strong password and **save it** — you need it for `DATABASE_URL`
   - **Region:** pick closest to you (e.g. Singapore for Nepal)
5. Click **Create new project** and wait ~2 minutes for provisioning.

## 2. Copy API keys into `.env`

1. In the Supabase dashboard, open **Project Settings** (gear icon) → **API**.
2. Copy into `kupc-backend/.env`:

| `.env` variable | Where in Supabase |
| --- | --- |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key (keep secret) |

## 3. Copy database connection string

1. **Project Settings** → **Database** → **Connection string**.
2. Tab: **URI**.
3. Mode: **Session** or **Direct** (either works for migrations).
4. Replace `[YOUR-PASSWORD]` with the database password from step 1.
5. Paste the full URI as `DATABASE_URL` in `.env`.

Example shape:

```env
DATABASE_URL=postgresql://postgres.xxxxx:YOUR_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

## 4. Run migrations

From `kupc-backend/`:

```bash
npm run db:migrate
```

You should see all 7 tables and 2 RPC functions listed.

## 5. Enable email auth (recommended)

1. **Authentication** → **Providers** → **Email** → ensure enabled.
2. For local dev, you can disable “Confirm email” under email settings so company signup is easier to test.

## 6. Start the backend

```bash
npm run dev
```

- Health: [http://localhost:5000/health](http://localhost:5000/health)
- API docs: [http://localhost:5000/api/docs](http://localhost:5000/api/docs)

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `DATABASE_URL is missing` | Fill step 3 in `.env` |
| `password authentication failed` | Re-copy URI with correct DB password |
| `relation already exists` | Migrations already applied — safe to ignore or use a fresh project |
| OTP email not received | Check Ethereal inbox at [https://ethereal.email](https://ethereal.email) with the `SMTP_USER` from `.env` |
