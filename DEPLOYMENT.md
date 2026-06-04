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

The app is local-sync only:
- Member, plan, transaction, settings, and theme data are saved in browser/device storage.
- Open browser tabs on the same device sync through `BroadcastChannel` and storage events.
- No Firebase, Supabase, or other online backend is used.

Saved data is versioned with a revision and last-saved timestamp. Overdue memberships refresh automatically while the app is open and when a tab becomes active.

Important: data is not shared across different phones, computers, browsers, or cleared browser profiles. Export or back up important records before wiping browser storage.

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
- Keep a backup/export plan before using the app as the main customer record.
- Configure a custom domain and HTTPS on the host.
- Test add member, edit member, renew membership, delete member, and restore starter data on the deployed URL.
- Export or back up data before wiping browser storage.
