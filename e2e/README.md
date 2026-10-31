# Real isolated Supabase acceptance

The complete runner owns a disposable Supabase project and Next server. It uses
PostgreSQL, Auth, PostgREST, private Storage, Realtime and Mailpit; no production
rows, project link metadata or payment credentials are copied.

Prerequisites: Node 24, healthy Docker, Supabase CLI 2.115.0 on PATH, npm dependencies,
and Chromium installed with `npx playwright install chromium` (Linux CI also uses
`--with-deps`). Set `SUPABASE_CLI_BIN` to the absolute CLI executable if it is not
on PATH.

```text
node scripts/run-local-supabase-e2e.mjs
```

This creates an independent workdir/project and free ports, applies the entire
migration chain and local seed, validates the loopback target, runs backend health,
then runs **all 39 tests with workers=1 and workers=2, retries=0**. Any failure,
flaky result, skip or missing report fails acceptance. Only its own stack is stopped
with `--no-backup` afterward. Existing developer projects are never reset or stopped.
Do not use `supabase db reset` on an existing developer or linked production project
as a shortcut.

Every fixture creates its own UUID identities and service-only sequence phone.
Required provider, application, appointment and verified synthetic phone fixtures
are created automatically. The old `E2E_PROVIDER_TEST_PHONE`, `E2E_TRUST_*` and
`E2E_COMMERCE_*` fixture IDs are no longer needed. Real checkout stays closed;
quote/hold/cancel are tested through the authenticated local SQL contract.

Auth logs in through the real UI, waits for the real `/auth/v1/otp` response, reads
Mailpit, verifies the one-use link and follows the actual PKCE callback. Cookie,
role and ownership assertions remain real. Notification acceptance also checks an
actual Realtime INSERT and the provider notification dialog. Storage uses synthetic
PDFs, real upload/download, SHA-256 receipts, owner/admin/foreign-user RLS and audits.

Reports:

- `artifacts/critical-backend-repair/local-supabase/result.json`
- `artifacts/critical-backend-repair/local-supabase/e2e-workers-1.json`
- `artifacts/critical-backend-repair/local-supabase/e2e-workers-2.json`
- `artifacts/critical-backend-repair/mobile/result.json` and 28 screenshots
- `artifacts/security-testing/e2e.json` and strict acceptance result files
- `playwright-report/` and failure-only screenshots in `test-results/`

Validated server credentials are inherited through the process environment; they
are deliberately absent from Playwright's serialized `webServer.env`. Trace/video
are off. Do not upload ignored diagnostic environment files or raw CLI status keys.

For debugging, `--keep-stack` retains only the runner's own synthetic stack and an
ignored `run-*/test-environment.json`. Stop the exact printed workdir after debugging:

```text
supabase stop --workdir <exact-owned-workdir> --no-backup
```

The production project `bjhyisomjadirdchruix` and protected keys are rejected before
write tests. Unclassified remote targets are rejected too. Never loosen this guard
or introduce a mock as a substitute for service acceptance.

Google OAuth with an external Google account, SMS delivery, malware scanning,
processor sandbox/live transactions and hosted rollout remain separate gates.
Current evidence and the approval/rollback plan are in
[the critical backend repair report](../docs/FUWU_CRITICAL_BACKEND_REPAIR_FINAL.md).
