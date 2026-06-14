-- Restore durable user ownership for provider applications.
-- Earlier migrations briefly allowed public phone-only submissions; production tracking
-- now requires user_id so submitted applications remain visible after logout/login.

alter table public.provider_applications
  add column if not exists user_id uuid references public.profiles(id) on delete set null;

create index if not exists provider_applications_user_id_idx
  on public.provider_applications (user_id);

update public.provider_applications as application
set user_id = profile.id
from public.profiles as profile
where application.user_id is null
  and profile.phone is not null
  and btrim(profile.phone) <> ''
  and profile.phone = application.phone;

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
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);
