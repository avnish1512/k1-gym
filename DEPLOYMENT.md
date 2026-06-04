# K1 Gym & Fitness Center - Deployment Guide

## Production Readiness Status

Verified on June 4, 2026:

```bash
npm run deploy:check
npx expo-doctor
npm audit --omit=dev
```

Current result:
- `npm run deploy:check` exports the web app into `dist/`.
- `npx expo-doctor` passes all checks.
- `npm audit --omit=dev` reports zero vulnerabilities.
- Local preview is running at `http://127.0.0.1:3000`.

## Real-Time Mode

The app now supports two sync modes:
- Cloud sync through Supabase when `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are configured.
- Local-only sync across open tabs/windows when cloud sync is not configured.

Saved data is versioned with a revision and last-saved timestamp. Overdue memberships refresh automatically while the app is open and when a tab becomes active.

Important: cross-device deletes/updates require Supabase. Add authentication, backups, and role-based access before treating this as the only production record system for customer phone numbers.

## Supabase Cross-Device Sync

Create this table in Supabase SQL Editor:

```sql
create table if not exists public.gym_workspaces (
  id text primary key,
  state jsonb not null,
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.gym_workspaces enable row level security;

create policy "temporary gym workspace read"
on public.gym_workspaces
for select
to anon
using (true);

create policy "temporary gym workspace write"
on public.gym_workspaces
for insert
to anon
with check (true);

create policy "temporary gym workspace update"
on public.gym_workspaces
for update
to anon
using (true)
with check (true);
```

Enable realtime for `public.gym_workspaces` in Supabase Dashboard > Database > Replication.

Set these EAS environment variables:

```bash
eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-project.supabase.co" --visibility plain
eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your_supabase_anon_key_here" --visibility plain
eas env:create --environment production --name EXPO_PUBLIC_SYNC_WORKSPACE_ID --value "k1-gym-main" --visibility plain
```

Redeploy after the variables are set:

```bash
npx expo export --platform web
eas deploy --prod
```

Security note: the policies above are a temporary no-login setup. Before storing real customer data long-term, replace them with authenticated-user policies.

## Build Locally

```bash
npm install
npm run deploy:check
```

The deployable files are written to:

```text
dist/
```

## Preview The Production Build

```bash
npx serve dist -l 3000
```

Open:

```text
http://127.0.0.1:3000
```

## Deploy To Vercel

1. Push the project to GitHub.
2. Import the repository in Vercel.
3. Use these settings:
   - Build command: `npm run build:web`
   - Output directory: `dist`
   - Node.js: 20.x
4. Add environment variables:
   - `NODE_ENV=production`
   - `EXPO_PUBLIC_APP_ENV=production`
5. Deploy.

`vercel.json` already includes SPA rewrites, immutable asset caching, app-shell no-cache behavior, and security headers.

## Deploy To Netlify

1. Push the project to GitHub.
2. Create a Netlify site from the repository.
3. Use these settings:
   - Build command: `npm run build:web`
   - Publish directory: `dist`
   - Node.js: 20.x
4. Add environment variables:
   - `NODE_ENV=production`
   - `EXPO_PUBLIC_APP_ENV=production`
5. Deploy.

`netlify.toml` already includes SPA fallback, immutable asset caching, app-shell no-cache behavior, and security headers.

## CI/CD

The GitHub Actions workflow builds the Expo web export on pushes and pull requests using Node 20. Configure these repository secrets if you want automated hosting deploys:

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
NETLIFY_AUTH_TOKEN
NETLIFY_SITE_ID
```

## Pre-Launch Checklist

- Replace starter members/plans with real gym data.
- Confirm the gym owner understands that browser storage is local to each device.
- Add a cloud backend and login before using the app across multiple staff devices.
- Configure a custom domain and HTTPS on the host.
- Test add member, edit member, renew membership, delete member, and restore starter data on the deployed URL.
- Export or back up data before wiping browser storage.
