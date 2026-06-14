# Final Backend User Journey

This document summarizes the exact flow and backend stabilization mapped out across Fuwu for customers, providers, and admins. It reflects the true production state of the platform.

## Customer Journey
1. **Homepage Loading**: Customer lands on `/`. The page dynamically fetches `providers` using `getProviders()` filtering strictly for `is_active=true` and `is_approved=true`.
2. **Filtering**: User selects categories and districts. The filter is entirely client-side optimized (via URL search params), resulting in no horizontal mobile overflow and large tap targets.
3. **Provider Details**: Customer clicks on an approved provider. Contacts them via WhatsApp.
4. **Service Request**: If no provider matches, the customer fills out `/request`. This triggers `createServiceRequest()` and strictly submits to the `service_requests` table, omitting missing mock columns.

## Provider Journey
1. **Application**: Prospective provider opens `/provider-application`.
2. **Submission**: They submit valid forms. The system safely maps data to `provider_applications` setting `status: 'pending'`. The system prevents any PostgreSQL failure by aggressively sanitizing inputs.
3. **Approval Status**: Provider waits for the application to be reviewed by admins.
4. **Profile Access**: Once logged in (via Email Magic Link) their dashboard dynamically reflects their assigned profile values safely abstracted behind `getCurrentUserProfile()`.

## Admin Journey
1. **Access Control**: Admin securely logs in via `/login`. `hasAdminRole()` strictly guards `/admin/*` routes checking `public.profiles`.
2. **Dashboard Overview**: Admin sees pending applications and pending requests.
3. **Application Approval**: Admin clicks "Approve". `approveProviderApplication()` executes, mapping the row into `providers` table securely without exposing duplicate violation errors.
4. **Request Processing**: Admin manually changes statuses from `yeni` -> `inceleniyor`. If necessary, they link an `assigned_provider_id` which updates the database natively.

## RLS Notes
Row Level Security natively prevents arbitrary API mutations:
- `supabase/migrations/20260605002200_backend_hardening_status_audit_rls.sql` locks `providers` reads to approved statuses.
- `provider_applications` and `service_requests` are locked down to authenticated interactions where necessary.

## Health Diagnostics
The `/api/health` equivalent locally (`checkBackendHealth()`) safely checks:
- Environment Variables.
- Supabase Connection.
- Passive read checks (`limit(1)`) on core tables without running destructive writes.

## Manual Test Checklist
- Login with Google/Email Magic Link successfully completes without 500 crashes.
- Submitting `/provider-application` results in a Turkish success toast.
- `/request` submits correctly.
- Admin dashboard safely queries tables without throwing missing column errors.
