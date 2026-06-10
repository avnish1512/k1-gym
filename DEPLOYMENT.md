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

## Supabase Backend

The app uses Supabase Auth, Postgres, RLS, and realtime database changes:
- Owner login uses Supabase email/password auth.
- Member, plan, transaction, and gym settings data live in Supabase.
- Theme preference remains local to the device/browser.
- Web and mobile clients share the same database and refresh from Supabase realtime events.

Run `supabase/schema.sql` in the Supabase SQL Editor before deploying the app. The schema starts with default gym settings only; members, plans, and transactions are empty.

Owner setup:
1. Create the owner user in Supabase Authentication.
2. Copy the owner user's `auth.users.id`.
3. Insert the owner into `public.app_admins`:

```sql
insert into public.app_admins (user_id, email, role)
values ('OWNER_USER_ID_HERE', 'owner@example.com', 'owner');
```

4. Disable public signups in Supabase Auth settings for the owner-only v1.

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
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
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
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
5. Deploy.

`netlify.toml` already includes SPA fallback, immutable asset caching, app-shell no-cache behavior, and security headers.

## Mobile Builds

For EAS builds, add the same public Supabase variables to the EAS environment or project secrets before building:

```bash
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value https://your-project-ref.supabase.co --environment production --visibility plaintext
eas env:create --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value your_publishable_key --environment production --visibility plaintext
```

## CI/CD

The GitHub Actions workflow builds the Expo web export on pushes and pull requests using Node 20. Configure these repository secrets if you want automated hosting deploys:

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
NETLIFY_AUTH_TOKEN
NETLIFY_SITE_ID
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

## Pre-Launch Checklist

- Run `supabase/schema.sql` in the Supabase SQL Editor.
- Create the owner Auth user and insert it into `public.app_admins`.
- Disable public signups for owner-only access.
- Add Supabase environment variables to Vercel, Netlify if used, GitHub Actions if needed, and EAS.
- Keep a backup/export plan before using the app as the main customer record.
- Configure a custom domain and HTTPS on the host.
- Test owner login, add plan, add member, edit member, renew membership, delete member, save settings, and clear cloud workspace on the deployed URL.
- Test one web session and one mobile session to confirm Supabase realtime refresh.

## Local Android Builds (via WSL on Windows)

Since `eas build --local` is not natively supported on Windows, you can use the Windows Subsystem for Linux (WSL) to run the build.

### Prerequisite Setup in WSL (e.g. Ubuntu)

1. **Install Node.js & npm**:
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
   # Restart terminal, then:
   nvm install 20
   ```

2. **Install EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```

3. **Install Java JDK 17**:
   ```bash
   sudo apt update
   sudo apt install openjdk-17-jdk -y
   ```

4. **Install Android Command Line Tools**:
   Create a directory for the Android SDK (e.g., `~/Android/Sdk`) and download/install the Android Command Line tools.

5. **Set Environment Variables**:
   Add the following to your WSL `~/.bashrc` or `~/.zshrc`:
   ```bash
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
   export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
   ```
   Apply them:
   ```bash
   source ~/.bashrc
   ```

### Running the Build

1. Navigate to the project directory in WSL:
   ```bash
   cd "/mnt/f/APP/k1 Gym fitness center"
   ```
2. Log in to Expo:
   ```bash
   eas login
   ```
3. Run the local Android build:
   ```bash
   eas build --local --platform android --profile preview
   ```
