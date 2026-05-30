# Provider and Request Flow Production Audit

Last updated: 2026-05-30

## Provider Flow

- `Usta Ağına Katıl` uses `ProviderApplicationForm` and `submitProviderApplication`.
- The form validates name, phone, WhatsApp, category, district/service area, experience, availability, equipment and description before any write.
- A successful live submission inserts into `provider_applications` with `status = pending`.
- Success UI is shown only after the Supabase insert returns without error.
- Duplicate active applications are handled in two layers:
  - application-level pending phone check when RLS allows the row to be visible;
  - database-level partial unique index: `provider_applications_pending_phone_unique_idx`.
- Admin visibility uses `/admin/provider-applications`, `getAdminProviderApplications`, and admin-only RLS.
- Approval changes the application to `approved` and creates or reuses an active, approved provider row.

## Request Flow

- `/request` requires a Supabase session before the form is shown.
- `createServiceRequest` verifies the current browser session matches the server-provided user id.
- The service ensures a `profiles` row exists before inserting because `service_requests.user_id` references `profiles.id`.
- Inserts save:
  - `category_id`
  - `district_id`
  - `address`
  - `urgency`
  - `budget_tag`
  - `offered_price` when supplied
  - `payment_preference` when supplied
  - `preferred_date`
  - `preferred_time`
  - `description`
  - `status`
- Lookup failures now stop the write and show a friendly Turkish message instead of being treated as missing data.

## Emergency Flow

- Emergency requests are stored in `service_requests`, not a separate `emergency_requests` table.
- Emergency rows use `urgency_type = emergency`, `status = pending`, and `emergency_status = pending`.
- Emergency inserts save offer amount, payment preference, confirmation code, approximate location and estimated arrival text.
- Open emergency requests can be visible to matching active and approved providers through RLS.
- Assigned emergency requests can be accepted and progressed by the assigned provider.

## Admin Flow

- Admin access depends on `profiles.role = admin`.
- `/admin/service-requests` reads real `service_requests` records and explicitly embeds the assigned provider through `service_requests_assigned_provider_id_fkey`.
- Admin can assign a matching active and approved provider.
- Assignment updates `assigned_provider_id` and sets request status to `ustaya_yonlendirildi`.
- Provider dashboards read assigned jobs through `getProviderAssignedRequests`.
- Provider-side standard request closing/canceling requires the RLS policy `service_requests_update_provider_assigned_status`.

## Known Limitations

- There is no physical `emergency_requests` table in the current architecture. Emergency requests are modeled as tagged `service_requests`.
- Provider applications are public and not tied to an auth user yet. Approved provider records may need `providers.user_id` linked manually before a provider can log into the provider dashboard.
- Existing duplicate pending applications must be cleaned before applying the pending-phone unique index if the live database already contains duplicates.
- Storage upload failure does not block provider applications; the application is submitted without the profile image and the user sees a friendly note.

## Observability

- Development logs use the shared logger and are sanitized before reaching `console`.
- Production console logging is disabled by the shared logger.
- Logs must not include emails, phones, auth tokens, Supabase keys, full request descriptions or raw form payloads.
- Current insert logs contain only safe operational flags such as status, urgency type and whether optional values were present.

## Required Supabase Settings

- Apply `supabase/schema/schema.sql` or the latest migrations through `supabase/migrations/0007_core_flow_reliability.sql`.
- Required tables:
  - `profiles`
  - `providers`
  - `provider_applications`
  - `service_requests`
  - `service_categories`
  - `districts`
  - `audit_logs`
- Required auth/profile setup:
  - `public.handle_new_user()` trigger on `auth.users`
  - `profiles_insert_own_customer` RLS policy
  - admin users must have `profiles.role = admin`
  - provider users must have `profiles.role = provider` and a matching `providers.user_id`
- Required request policies:
  - authenticated users can insert their own standard and emergency requests;
  - admins can read and update service requests;
  - providers can read assigned jobs and matching open emergency jobs;
  - providers can update assigned standard jobs to `tamamlandi` or `iptal`.
- Required provider application policy:
  - anonymous/authenticated users can insert `pending` provider applications;
  - admins can read and update applications.
