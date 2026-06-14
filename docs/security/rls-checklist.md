# RLS Checklist

This checklist captures the production RLS expectations for Fuwu Supabase tables.

## Public Read

- Public users can read only approved and active provider rows: `providers.is_active = true` and `providers.is_approved = true`.
- Public users can read `service_categories` and `districts` for filters and form options.
- Public users must not read `profiles`, `provider_applications`, `service_requests`, or `audit_logs`.

## User-Owned Writes

- Authenticated users can insert their own `service_requests` only with `user_id = auth.uid()` and initial status `yeni`.
- Provider applicants can insert `provider_applications` only in `pending` status.
- Provider owners can read their own `providers` row for `/provider-dashboard`; public visibility still requires approved and active status.
- Authenticated users can update their own profile details, but cannot self-promote by changing `role`.
- Review writes should stay tied to `user_id = auth.uid()` and approved active providers.

## Admin Management

- Admin access is represented by `profiles.role = 'admin'`.
- Admins can read and manage providers, provider applications, and service requests.
- Admins can create provider rows from approved provider applications.
- Admins can update service request workflow status.
- Admins can append and inspect `audit_logs`.

## Deny By Default

- No public update or delete policies on sensitive tables.
- No public reads for service request contact/address details.
- No public reads for provider application phone, WhatsApp, portfolio, or review queue details.
- No public writes to provider approval fields such as `is_active`, `is_approved`, or application `status`.
- No frontend service role key usage. Browser code must use only the anon key and RLS.

## Policy Source

- Base schema and triggers: [20260605000000_initial_schema.sql](../../supabase/migrations/20260605000000_initial_schema.sql)
- Core RLS, audit logs, status constraints, and admin policies: [20260605002200_backend_hardening_status_audit_rls.sql](../../supabase/migrations/20260605002200_backend_hardening_status_audit_rls.sql)
- Public lookup RLS and notifications: [20260605002600_consolidate_lookup_rls_notifications.sql](../../supabase/migrations/20260605002600_consolidate_lookup_rls_notifications.sql)
