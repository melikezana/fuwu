-- Fuwu Supabase Row Level Security policies
-- Run this after supabase/schema/schema.sql has created the planned tables.
--
-- This file is SQL only and does not add real frontend auth, API keys, seed data,
-- or application wiring. It uses Supabase Auth helpers such as auth.uid() so the
-- future frontend can rely on normal Supabase sessions when auth is implemented.

-- Future admin/provider auth model:
-- - Admin access is represented by public.profiles.role = 'admin'.
-- - Provider ownership is represented by public.providers.user_id = auth.uid().
-- - Initial admin assignment should be done later through a trusted backend,
--   Supabase dashboard, service role migration, or another out-of-band admin flow.
-- - These helper functions only support RLS checks; they are not a complete auth
--   implementation and do not expose secrets or keys.

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  );
$$;

comment on function public.current_user_is_admin() is
  'RLS helper for future admin-only policies. Admins are planned to be users whose profile role is admin.';

create or replace function public.profile_role_is_unchanged(
  profile_id uuid,
  next_role text
)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = profile_id
      and profiles.id = auth.uid()
      and profiles.role::text = next_role
  );
$$;

comment on function public.profile_role_is_unchanged(uuid, text) is
  'RLS helper that lets users edit their own profile without self-assigning provider or admin roles.';

create or replace function public.provider_publication_flags_are_unchanged(
  provider_id uuid,
  next_is_active boolean,
  next_is_approved boolean
)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.providers
    where providers.id = provider_id
      and providers.user_id = auth.uid()
      and providers.is_active = next_is_active
      and providers.is_approved = next_is_approved
  );
$$;

comment on function public.provider_publication_flags_are_unchanged(uuid, boolean, boolean) is
  'RLS helper that lets provider owners edit profile details without approving or activating themselves.';

create or replace function public.review_provider_is_unchanged(
  review_id uuid,
  next_provider_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.reviews
    where reviews.id = review_id
      and reviews.user_id = auth.uid()
      and reviews.provider_id = next_provider_id
  );
$$;

comment on function public.review_provider_is_unchanged(uuid, uuid) is
  'RLS helper that lets users edit review content without moving a review to another provider.';

alter table public.profiles enable row level security;
alter table public.providers enable row level security;
alter table public.provider_applications enable row level security;
alter table public.service_requests enable row level security;
alter table public.reviews enable row level security;

-- Profiles
-- Profiles contain private account data such as phone and role. There is no
-- public SELECT policy for profiles; public provider browsing uses the providers
-- table instead. If public profile snippets are needed later, expose a limited
-- view or RPC rather than opening the full profiles table.

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid());

comment on policy profiles_select_own on public.profiles is
  'Users can read only their own profile so private profile fields are not publicly browsable.';

drop policy if exists profiles_select_admin_all on public.profiles;
create policy profiles_select_admin_all
on public.profiles
for select
to authenticated
using (public.current_user_is_admin());

comment on policy profiles_select_admin_all on public.profiles is
  'Admins can read profile contact details needed for service request operations.';

drop policy if exists profiles_insert_own_customer on public.profiles;
create policy profiles_insert_own_customer
on public.profiles
for insert
to authenticated
with check (
  auth.uid() is not null
  and id = auth.uid()
  and role::text = 'customer'
);

comment on policy profiles_insert_own_customer on public.profiles is
  'Authenticated users can create only their own default customer profile when an auth trigger has not created it yet.';

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using (
  auth.uid() is not null
  and id = auth.uid()
)
with check (
  auth.uid() is not null
  and id = auth.uid()
  and public.profile_role_is_unchanged(id, role::text)
);

comment on policy profiles_update_own on public.profiles is
  'Users can update their own profile details, but cannot self-promote by changing their role.';

drop policy if exists profiles_update_admin_roles on public.profiles;
create policy profiles_update_admin_roles
on public.profiles
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

comment on policy profiles_update_admin_roles on public.profiles is
  'Admins can grant provider access after approving a linked provider application.';

-- Providers
-- Public provider browsing is allowed because approved, active providers are the
-- marketplace inventory customers need to discover. Pending, inactive, or
-- unapproved providers remain hidden from anonymous and normal authenticated users.

drop policy if exists providers_select_public_active_approved on public.providers;
create policy providers_select_public_active_approved
on public.providers
for select
to anon, authenticated
using (
  is_active = true
  and is_approved = true
);

comment on policy providers_select_public_active_approved on public.providers is
  'Anyone can browse providers only after they are approved and active.';

drop policy if exists providers_select_admin_all on public.providers;
create policy providers_select_admin_all
on public.providers
for select
to authenticated
using (public.current_user_is_admin());

comment on policy providers_select_admin_all on public.providers is
  'Admins can read all provider records, including inactive or pending rows, from admin tooling.';

drop policy if exists providers_select_own_profile on public.providers;
create policy providers_select_own_profile
on public.providers
for select
to authenticated
using (user_id = auth.uid());

comment on policy providers_select_own_profile on public.providers is
  'Provider owners can read their own provider profile for the provider dashboard, including non-public review states.';

drop policy if exists providers_insert_admin on public.providers;
create policy providers_insert_admin
on public.providers
for insert
to authenticated
with check (public.current_user_is_admin());

comment on policy providers_insert_admin on public.providers is
  'Admins can create provider records from approved provider applications.';

drop policy if exists providers_update_own_profile on public.providers;
create policy providers_update_own_profile
on public.providers
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and public.provider_publication_flags_are_unchanged(id, is_active, is_approved)
);

comment on policy providers_update_own_profile on public.providers is
  'Provider owners can later edit their own provider profile without changing approval or active-publication flags.';

drop policy if exists providers_update_admin_approval on public.providers;
create policy providers_update_admin_approval
on public.providers
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

comment on policy providers_update_admin_approval on public.providers is
  'Admins can later approve, activate, or correct provider records through authenticated admin tooling.';

-- Provider applications
-- Provider applications are linked to authenticated applicants. Applicants can
-- create and read only their own application status, while admins can review the
-- full queue.

drop policy if exists "Anyone can insert provider applications" on public.provider_applications;
drop policy if exists provider_applications_insert_public_pending on public.provider_applications;
drop policy if exists provider_applications_insert_authenticated_pending on public.provider_applications;
create policy provider_applications_insert_authenticated_pending
on public.provider_applications
for insert
to authenticated
with check (
  auth.uid() is not null
  and user_id = auth.uid()
  and status = 'pending'
);

comment on policy provider_applications_insert_authenticated_pending on public.provider_applications is
  'Authenticated applicants can create only their own pending provider application.';

drop policy if exists provider_applications_select_own on public.provider_applications;
create policy provider_applications_select_own
on public.provider_applications
for select
to authenticated
using (user_id = auth.uid());

comment on policy provider_applications_select_own on public.provider_applications is
  'Applicants can read their own application status for onboarding and dashboard pending states.';

drop policy if exists provider_applications_select_admin_all on public.provider_applications;
create policy provider_applications_select_admin_all
on public.provider_applications
for select
to authenticated
using (public.current_user_is_admin());

comment on policy provider_applications_select_admin_all on public.provider_applications is
  'Only future admins can read provider applications; applicants cannot browse the submissions table.';

drop policy if exists provider_applications_update_admin_status on public.provider_applications;
create policy provider_applications_update_admin_status
on public.provider_applications
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

comment on policy provider_applications_update_admin_status on public.provider_applications is
  'Admins can approve or reject provider applications from admin tooling.';

-- Service requests
-- Service requests include customer contact, address, schedule, and description
-- details, so normal users only see their own rows. Admins can read all rows later
-- for matching, support, and operations.

drop policy if exists service_requests_insert_authenticated_own on public.service_requests;
create policy service_requests_insert_authenticated_own
on public.service_requests
for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'pending'
  and assigned_provider_id is null
  and accepted_provider_id is null
  and (
    coalesce(urgency_type, 'standard') <> 'emergency'
    or emergency_status = 'pending'
  )
);

comment on policy service_requests_insert_authenticated_own on public.service_requests is
  'Authenticated customers can create only their own pending requests.';

drop policy if exists service_requests_select_own on public.service_requests;
create policy service_requests_select_own
on public.service_requests
for select
to authenticated
using (user_id = auth.uid());

comment on policy service_requests_select_own on public.service_requests is
  'Users can read their own service requests and cannot read other customers private request details.';

drop policy if exists service_requests_select_admin_all on public.service_requests;
create policy service_requests_select_admin_all
on public.service_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

comment on policy service_requests_select_admin_all on public.service_requests is
  'Admins can later read all service requests for matching, support, and operational workflows.';

drop policy if exists service_requests_update_admin_status on public.service_requests;
drop policy if exists service_requests_update_admin_assignment on public.service_requests;
create policy service_requests_update_admin_assignment
on public.service_requests
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

comment on policy service_requests_update_admin_assignment on public.service_requests is
  'Admins can update service request assignment and status from server-side admin actions while RLS remains enabled.';

drop policy if exists service_requests_update_provider_assigned_status on public.service_requests;
create policy service_requests_update_provider_assigned_status
on public.service_requests
for update
to authenticated
using (
  coalesce(urgency_type, 'standard') = 'standard'
  and exists (
    select 1
    from public.providers
    where providers.user_id = auth.uid()
      and providers.is_active = true
      and providers.is_approved = true
      and providers.id = service_requests.assigned_provider_id
  )
)
with check (
  coalesce(urgency_type, 'standard') = 'standard'
  and status in ('accepted', 'rejected', 'completed', 'cancelled', 'tamamlandi', 'iptal')
  and exists (
    select 1
    from public.providers
    where providers.user_id = auth.uid()
      and providers.is_active = true
      and providers.is_approved = true
      and providers.id = service_requests.assigned_provider_id
  )
);

comment on policy service_requests_update_provider_assigned_status on public.service_requests is
  'Approved providers can accept, complete, or cancel standard requests assigned to their provider record.';

drop policy if exists service_requests_select_provider_relevant on public.service_requests;
create policy service_requests_select_provider_relevant
on public.service_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.providers
    where providers.user_id = auth.uid()
      and providers.is_active = true
      and providers.is_approved = true
      and (
        providers.id = service_requests.assigned_provider_id
        or providers.id = service_requests.accepted_provider_id
      )
  )
);

comment on policy service_requests_select_provider_relevant on public.service_requests is
  'Approved providers can read only requests assigned or accepted by their provider record.';

drop policy if exists service_requests_update_provider_emergency_acceptance on public.service_requests;
create policy service_requests_update_provider_emergency_acceptance
on public.service_requests
for update
to authenticated
using (
  urgency_type = 'emergency'
  and exists (
    select 1
    from public.providers
    where providers.user_id = auth.uid()
      and providers.is_active = true
      and providers.is_approved = true
      and providers.category_id = service_requests.category_id
      and providers.id = service_requests.assigned_provider_id
  )
)
with check (
  urgency_type = 'emergency'
  and exists (
    select 1
    from public.providers
    where providers.user_id = auth.uid()
      and providers.is_active = true
      and providers.is_approved = true
      and providers.id = service_requests.assigned_provider_id
      and providers.category_id = service_requests.category_id
      and (
        (
          providers.id = service_requests.accepted_provider_id
          and service_requests.status in ('accepted', 'on_the_way', 'completed', 'cancelled')
          and service_requests.emergency_status in ('accepted', 'on_the_way', 'completed', 'cancelled')
        )
        or (
          service_requests.status = 'rejected'
          and service_requests.emergency_status = 'rejected'
          and service_requests.accepted_provider_id is null
        )
      )
  )
);

comment on policy service_requests_update_provider_emergency_acceptance on public.service_requests is
  'Approved providers can accept and progress only emergency requests assigned to them.';

-- Reviews
-- Reviews are public marketplace trust content, so anonymous and authenticated
-- visitors can read them. Writes remain tied to authenticated profile ownership.

drop policy if exists reviews_select_public on public.reviews;
create policy reviews_select_public
on public.reviews
for select
to anon, authenticated
using (true);

comment on policy reviews_select_public on public.reviews is
  'Anyone can read provider reviews because reviews are public trust signals for provider browsing.';

drop policy if exists reviews_insert_authenticated_own on public.reviews;
create policy reviews_insert_authenticated_own
on public.reviews
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.providers
    where providers.id = provider_id
      and providers.is_active = true
      and providers.is_approved = true
  )
);

comment on policy reviews_insert_authenticated_own on public.reviews is
  'Authenticated users can later create reviews as themselves for providers that are public and active.';

drop policy if exists reviews_update_own on public.reviews;
create policy reviews_update_own
on public.reviews
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and public.review_provider_is_unchanged(id, provider_id)
);

comment on policy reviews_update_own on public.reviews is
  'Users can update only their own reviews and cannot move an existing review to another provider.';

drop policy if exists reviews_delete_own on public.reviews;
create policy reviews_delete_own
on public.reviews
for delete
to authenticated
using (user_id = auth.uid());

comment on policy reviews_delete_own on public.reviews is
  'Users can delete only their own reviews.';
