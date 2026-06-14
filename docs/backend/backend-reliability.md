# Backend Reliability

This document summarizes the production reliability guardrails added around Fuwu backend workflows.

## Status Workflow

Service requests use these canonical statuses:

- `yeni`
- `inceleniyor`
- `ustaya_yonlendirildi`
- `tamamlandi`
- `iptal`

Provider applications use:

- `pending`
- `approved`
- `rejected`

TypeScript constants live in [src/lib/constants/statuses.ts](../../src/lib/constants/statuses.ts). Existing legacy request statuses are mapped in code and in the canonical backend hardening migration: [20260605002200_backend_hardening_status_audit_rls.sql](../../supabase/migrations/20260605002200_backend_hardening_status_audit_rls.sql).

## Audit Log Design

[20260605002200_backend_hardening_status_audit_rls.sql](../../supabase/migrations/20260605002200_backend_hardening_status_audit_rls.sql) creates `public.audit_logs` with:

- `id`
- `actor_user_id`
- `action`
- `entity_type`
- `entity_id`
- `metadata`
- `created_at`

Admin server actions append audit records for provider application approval/rejection, provider approval/status changes, and service request status changes. Audit write failures are logged but do not block the user-facing admin action.

## Updated At Triggers

[20260605000000_initial_schema.sql](../../supabase/migrations/20260605000000_initial_schema.sql) defines `public.set_updated_at()` and installs triggers for:

- `profiles`
- `providers`
- `provider_applications`
- `service_requests`
- `reviews`

The base schema now includes `reviews.updated_at` as well.

## Service Response Pattern

Supabase-facing service code uses a `{ data, error }` response helper in [src/services/serviceResponse.ts](../../src/services/serviceResponse.ts). Public route contracts remain stable, while internal reads and writes avoid exposing raw Supabase errors to UI components. User-facing messages stay friendly and Turkish.

## Admin Action Safety

Admin write actions validate:

- Supabase is configured.
- The current session belongs to a `profiles.role = 'admin'` user.
- The target provider application or service request exists.
- Provider applications are still `pending` before approval or rejection.
- Service request status is one of the canonical workflow values.
- Provider creation does not duplicate an existing provider with the same phone, category, and district.

No service role key is used in frontend or server action code; admin actions rely on the normal Supabase session plus RLS.

## Schema Integrity

The migration chain now documents required provider/application/request fields, rating range checks, status checks, and timestamp defaults. Existing database hardening lives in [20260605002200_backend_hardening_status_audit_rls.sql](../../supabase/migrations/20260605002200_backend_hardening_status_audit_rls.sql).
