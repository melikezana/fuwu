# Auth and Admin Access

This document describes the production auth and authorization model used by Fuwu.

## Auth Helpers

- Browser auth helpers live in `src/services/auth/index.ts`.
- Server auth helpers live in `src/services/auth/server.ts`.
- Shared role constants and safe Turkish access messages live in `src/services/auth/constants.ts`.
- Use `getCurrentUser()` or `getServerAuthContext()` for authorization decisions because they rely on Supabase `auth.getUser()`.
- Use `getSession()` only for lightweight client session checks. Do not use it as the only admin/provider authorization gate.
- Do not put Supabase service role keys in frontend code, `NEXT_PUBLIC_*` variables, docs, or client bundles.

## Public Routes

These routes can be viewed without a Supabase session:

- `/`
- `/providers`
- `/providers/[id]`
- `/provider-application`
- `/login`
- `/auth/callback`
- `/waitlist`
- `/kvkk`
- `/gizlilik`
- `/kullanim-sartlari`
- `/cerez-politikasi`

Public provider browsing must only read providers where `is_active = true` and `is_approved = true`.

## Logged-In-Only Routes

- `/request`

The request page requires a real Supabase user before rendering the request form. Unauthenticated users see: `Giriş yapmalısın.`

Service request inserts must use the authenticated user's id and RLS must enforce `service_requests.user_id = auth.uid()`.

## Admin-Only Routes

- `/admin`
- `/admin/providers`
- `/admin/provider-applications`
- `/admin/service-requests`

Admin access is allowed only when the current Supabase user has a matching `profiles` row with `role = 'admin'`.

Unauthenticated users see: `Giriş yapmalısın.`

Authenticated non-admin users see: `Bu alana erişim yetkin yok.`

Admin surfaces also explain: `Admin paneline erişmek için yetkili hesap gerekir.`

The admin panel does not accept a demo code gate. Admin assignment must happen through a trusted backend, Supabase dashboard operation, migration, or another controlled out-of-band process.

## Provider-Only Future Routes

- `/provider-dashboard`
- `/provider-dashboard/profile`
- `/provider-dashboard/requests`

Provider dashboard access is prepared for users whose `profiles.role = 'provider'`. The dashboard must not show provider data when there is no authenticated provider session.

Provider-owned data should be read through RLS using `providers.user_id = auth.uid()`. Public visibility remains separate and still requires `providers.is_active = true` and `providers.is_approved = true`.

## Role Source

`profiles.role` is the app-level role source:

- `customer`: default user role.
- `provider`: future provider dashboard role.
- `admin`: admin panel and admin server actions.

Users can update their own profile details, but RLS must prevent self-promotion by blocking role changes from normal user sessions.

## RLS Alignment

Current code assumes the canonical Supabase migration chain enforces:

- Public users can read only active, approved providers plus public lookup tables.
- Authenticated users can create their own service requests.
- Admins can read and manage provider applications.
- Admins can read, create, approve, activate, deactivate, and unpublish providers.
- Admins can manage service request workflow status.
- Provider owners can read their own provider row for the future dashboard.
- Users can only access their own sensitive profile, request, and review records unless they are admins.

Policy references:

- `supabase/migrations/20260605002200_backend_hardening_status_audit_rls.sql`
- `supabase/migrations/20260605002600_consolidate_lookup_rls_notifications.sql`
- `docs/security/rls-checklist.md`
