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

The app is online-sync first:
- Online sync runs through Firebase Realtime Database when `EXPO_PUBLIC_FIREBASE_DATABASE_URL` is configured.
- Browser storage is used only as a same-device cache.
- If Firebase env vars are missing, the app shows `Online setup needed` instead of pretending local storage is synced.

Saved data is versioned with a revision and last-saved timestamp. Overdue memberships refresh automatically while the app is open and when a tab becomes active.

Important: cross-device deletes/updates require Firebase. Add authentication, backups, and role-based access before treating this as the only production record system for customer phone numbers.

## Firebase Cross-Device Sync

Create a Firebase project, then create a Realtime Database. Copy the database URL, which looks like this:

```text
https://your-project-default-rtdb.firebaseio.com
```

For a temporary no-login setup, use Realtime Database rules like this:

```json
{
  "rules": {
    "gym_workspaces": {
      "$workspaceId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

Security note: these rules are public. Before storing real customer data long-term, replace them with Firebase Authentication based rules.

Set these build/runtime environment variables in every host that builds the app:

```bash
eas env:create --environment production --name EXPO_PUBLIC_FIREBASE_DATABASE_URL --value "https://your-project-default-rtdb.firebaseio.com" --visibility plain
eas env:create --environment production --name EXPO_PUBLIC_SYNC_WORKSPACE_ID --value "k1-gym-main" --visibility plain
```

For GitHub Actions, add repository secrets with the same names:

```text
EXPO_PUBLIC_FIREBASE_DATABASE_URL
EXPO_PUBLIC_SYNC_WORKSPACE_ID
```

Redeploy after the variables are set:

```bash
npx expo export --platform web
eas deploy --prod
```

Security note: the rules above are a temporary no-login setup. Before storing real customer data long-term, replace them with authenticated-user rules.

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
   - `EXPO_PUBLIC_FIREBASE_DATABASE_URL`
   - `EXPO_PUBLIC_SYNC_WORKSPACE_ID=k1-gym-main`
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
   - `EXPO_PUBLIC_FIREBASE_DATABASE_URL`
   - `EXPO_PUBLIC_SYNC_WORKSPACE_ID=k1-gym-main`
5. Deploy.

`netlify.toml` already includes SPA fallback, immutable asset caching, app-shell no-cache behavior, and security headers.

## CI/CD

The GitHub Actions workflow builds the Expo web export on pushes and pull requests using Node 20. Configure these repository secrets if you want automated hosting deploys:

```text
EXPO_PUBLIC_FIREBASE_DATABASE_URL
EXPO_PUBLIC_SYNC_WORKSPACE_ID
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
NETLIFY_AUTH_TOKEN
NETLIFY_SITE_ID
```

## Pre-Launch Checklist

- Replace starter members/plans with real gym data.
- Confirm Firebase env vars are present in the active hosting provider before adding real member data.
- Add login before using the app across multiple staff devices with sensitive customer data.
- Configure a custom domain and HTTPS on the host.
- Test add member, edit member, renew membership, delete member, and restore starter data on the deployed URL.
- Export or back up data before wiping browser storage.
