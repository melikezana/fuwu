# E2E Test Setup

This suite is written to run against a local or dedicated Supabase test project.
Do not point it at production data.

## Local Supabase

1. Install and start Docker Desktop.
2. Install or use the Supabase CLI:

```powershell
npx supabase --version
npx supabase start
```

3. Copy the test env template and fill the local anon key printed by `supabase start`:

```powershell
Copy-Item .env.test.example .env.test
```

Required values:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local anon key from supabase start>
E2E_ALLOW_REMOTE_SUPABASE_TESTS=false
```

4. Apply migrations and seed data if your local project was not initialized by
`supabase start`:

```powershell
npx supabase db reset
```

5. Install Playwright browsers if needed:

```powershell
npx playwright install
```

6. Run the suite:

```powershell
npm run test:e2e
```

Use the interactive runner while developing:

```powershell
npm run test:e2e:ui
```

## Current Verification Notes

On this machine, `npx supabase start` could not start because Docker Desktop was
not available:

```text
open //./pipe/docker_engine: The system cannot find the file specified.
Docker Desktop is a prerequisite for local development.
```

With the current environment, the Supabase-backed tests correctly skip because
`.env.test` is not configured. The middleware redirect tests pass:

```text
4 passed, 6 skipped
```

Per-file status from the latest run:

| File | Status | Notes |
| --- | --- | --- |
| `auth.spec.ts` | SKIP | Needs local Supabase test env and OTP credentials. |
| `request-flow.spec.ts` | SKIP | Needs authenticated local Supabase session. |
| `duplicate-request.spec.ts` | SKIP | Needs authenticated local Supabase session. |
| `provider-application.spec.ts` | SKIP | Needs authenticated local Supabase session. |
| `admin-access.spec.ts` | SKIP | Needs local Supabase session and seeded/admin test identity. |
| `middleware-redirect.spec.ts` | PASS | `/admin`, `/provider-dashboard`, `/account`, and `/dashboard` redirect to encoded `next` URLs. |
