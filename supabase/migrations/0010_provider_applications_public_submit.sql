-- Align provider application submit flow with the production table shape.
-- provider_applications no longer stores user_id, so inserts are public pending applications.

alter table public.provider_applications enable row level security;

drop policy if exists "Anyone can insert provider applications" on public.provider_applications;
drop policy if exists "Anyone can apply as provider" on public.provider_applications;
drop policy if exists "Admins have full access to applications" on public.provider_applications;
drop policy if exists provider_applications_insert_public_pending on public.provider_applications;
drop policy if exists provider_applications_insert_authenticated_pending on public.provider_applications;
drop policy if exists provider_applications_select_own on public.provider_applications;
drop policy if exists provider_applications_select_admin_all on public.provider_applications;
drop policy if exists provider_applications_update_admin_status on public.provider_applications;

drop index if exists public.provider_applications_user_id_idx;

alter table public.provider_applications
  drop column if exists user_id;

create policy provider_applications_insert_public_pending
on public.provider_applications
for insert
to anon, authenticated
with check (status = 'pending');

comment on policy provider_applications_insert_public_pending on public.provider_applications is
  'Anyone can submit a pending provider application; ownership is tracked by phone/contact fields, not user_id.';

create policy provider_applications_select_admin_all
on public.provider_applications
for select
to authenticated
using (public.current_user_is_admin());

comment on policy provider_applications_select_admin_all on public.provider_applications is
  'Only admins can read provider applications for review.';

create policy provider_applications_update_admin_status
on public.provider_applications
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

comment on policy provider_applications_update_admin_status on public.provider_applications is
  'Admins can approve or reject provider applications from admin tooling.';
