-- Harden provider application review policies without disabling RLS.
-- Applicants can create/read only their own applications; admins can review all
-- rows and update status through authenticated admin tooling.

alter table public.provider_applications enable row level security;

drop policy if exists "Anyone can insert provider applications" on public.provider_applications;
drop policy if exists "Anyone can apply as provider" on public.provider_applications;
drop policy if exists "Admins have full access to applications" on public.provider_applications;
drop policy if exists provider_applications_insert_public_pending on public.provider_applications;
drop policy if exists provider_applications_insert_authenticated_pending on public.provider_applications;
drop policy if exists provider_applications_select_own on public.provider_applications;
drop policy if exists provider_applications_select_own_user_id on public.provider_applications;
drop policy if exists provider_applications_select_own_profile_phone on public.provider_applications;
drop policy if exists provider_applications_select_admin_all on public.provider_applications;
drop policy if exists provider_applications_update_admin_status on public.provider_applications;

create policy provider_applications_insert_authenticated_pending
on public.provider_applications
for insert
to authenticated
with check (
  auth.uid() is not null
  and user_id = auth.uid()
  and status = 'pending'
);

create policy provider_applications_select_own
on public.provider_applications
for select
to authenticated
using (user_id = auth.uid());

create policy provider_applications_select_own_profile_phone
on public.provider_applications
for select
to authenticated
using (
  user_id is null
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.phone is not null
      and btrim(profiles.phone) <> ''
      and profiles.phone = provider_applications.phone
  )
);

create policy provider_applications_select_admin_all
on public.provider_applications
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

create policy provider_applications_update_admin_status
on public.provider_applications
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
  status in ('pending', 'approved', 'rejected')
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

comment on policy provider_applications_insert_authenticated_pending on public.provider_applications is
  'Authenticated applicants can create only their own pending provider application.';

comment on policy provider_applications_select_own on public.provider_applications is
  'Applicants can read their own application status.';

comment on policy provider_applications_select_own_profile_phone on public.provider_applications is
  'Legacy unbound applications remain readable only by the matching authenticated profile phone.';

comment on policy provider_applications_select_admin_all on public.provider_applications is
  'Admins can read all provider applications for review.';

comment on policy provider_applications_update_admin_status on public.provider_applications is
  'Admins can update provider application review status while RLS remains enabled.';
