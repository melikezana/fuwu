# E2E Test Setup

This suite is written to run against a local or dedicated Supabase test project.
Do not point it at production data.

## Final prelaunch acceptance (31 October 2026)

Run `npm run test:e2e:prelaunch` for actual Auth, provider control, provider
application, service confirmation and private document transport acceptance.
The runner rejects production URLs/keys, checks the real Auth health endpoint,
and returns **BLOCKED** when setup or required fixtures are unavailable. No mock
server is substituted. Missing/skipped tests cannot pass the release gate.

`storage-documents.spec.ts` creates synthetic provider/application records only
on the validated test target. It checks the real upload, persisted SHA-256,
unreviewed status, signed owner/admin downloads, foreign-user denial and access
audit. Its result remains **BLOCKED** until executed against real Supabase.

Required preparation, beyond local Auth/Mailpit and migrated schema:

- `E2E_PROVIDER_TEST_PHONE`: a dedicated synthetic phone confirmed through the
  isolated Auth admin API. This does not test real SMS delivery.
- `E2E_TRUST_ORDER_ID`, `E2E_TRUST_CUSTOMER_EMAIL`, `E2E_TRUST_PROVIDER_EMAIL`:
  dedicated synthetic `CONFIRMED` appointment and separate `@fuwu.test` users.
  Never substitute an existing production appointment. Live payment stays off.
- For the separate commerce suite: `E2E_COMMERCE_OFFERING_ID` and
  `E2E_COMMERCE_DISTRICT_ID`, and explicitly authorized sandbox-only checkout
  configuration on the isolated test app. No live iyzico host is accepted.

GitHub Actions now preserves JSON evidence and rejects skipped/missing
prelaunch suites. The workflow is **not verified green** by this local change;
fixtures must be prepared in its disposable test project before acceptance.
Real Google OAuth redirect/session persistence and SMS delivery remain separate
manual staging gates. Current blockers are recorded in
[`FUWU_PRELAUNCH_FINAL_READINESS.md`](../docs/FUWU_PRELAUNCH_FINAL_READINESS.md).

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

## Historical Verification Notes (not current release evidence)

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
