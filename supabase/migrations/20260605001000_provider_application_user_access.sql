-- Link provider applications to authenticated users and let approved applicants reach the provider dashboard.
-- Safe to run after the existing provider application repair migrations.

alter table public.provider_applications
  add column if not exists user_id uuid references public.profiles(id) on delete set null;

create index if not exists provider_applications_user_id_idx
  on public.provider_applications (user_id);

-- Admin policies below predate the comprehensive hardening migration that
-- redefines this helper. Define it here as well so a clean migration chain
-- never references a function that does not exist yet.
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

drop policy if exists "Anyone can insert provider applications" on public.provider_applications;
drop policy if exists "Admins have full access to applications" on public.provider_applications;
drop policy if exists provider_applications_insert_public_pending on public.provider_applications;
drop policy if exists provider_applications_select_own on public.provider_applications;
drop policy if exists provider_applications_select_admin_all on public.provider_applications;
drop policy if exists provider_applications_update_admin_status on public.provider_applications;

create policy provider_applications_insert_authenticated_pending
on public.provider_applications
for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'pending'
);

comment on policy provider_applications_insert_authenticated_pending on public.provider_applications is
  'Authenticated applicants can create only their own pending provider application.';

create policy provider_applications_select_own
on public.provider_applications
for select
to authenticated
using (user_id = auth.uid());

comment on policy provider_applications_select_own on public.provider_applications is
  'Applicants can read their own application status for onboarding and dashboard pending states.';

create policy provider_applications_select_admin_all
on public.provider_applications
for select
to authenticated
using (public.current_user_is_admin());

comment on policy provider_applications_select_admin_all on public.provider_applications is
  'Admins can read provider applications for review.';

create policy provider_applications_update_admin_status
on public.provider_applications
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

comment on policy provider_applications_update_admin_status on public.provider_applications is
  'Admins can approve or reject provider applications from admin tooling.';

drop policy if exists profiles_update_admin_roles on public.profiles;
create policy profiles_update_admin_roles
on public.profiles
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

comment on policy profiles_update_admin_roles on public.profiles is
  'Admins can grant provider access after approving a linked application.';
