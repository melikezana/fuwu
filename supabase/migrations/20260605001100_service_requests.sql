-- Legacy compatibility checkpoint.
--
-- The canonical service_requests and provider_applications tables, indexes,
-- updated_at triggers, and initial RLS policies are created by
-- 20260605000000_initial_schema.sql and refined by the surrounding migrations.
-- An earlier draft of this file attempted to recreate those objects with an
-- incompatible schema and introduced permissive policies that survived later
-- hardening. Keep the migration version for deployed-history compatibility,
-- but make a clean install deterministic and remove any legacy policies.

drop policy if exists "Users can read own requests" on public.service_requests;
drop policy if exists "Users can insert own requests" on public.service_requests;
drop policy if exists "Users can update own requests" on public.service_requests;
drop policy if exists "Anyone can apply as provider" on public.provider_applications;

drop trigger if exists service_requests_updated_at on public.service_requests;
drop trigger if exists provider_applications_updated_at on public.provider_applications;
