-- Allow authenticated admins to manage provider records while RLS remains enabled.
-- Admin identity is checked through public.profiles.role = 'admin'.

alter table public.providers enable row level security;

drop policy if exists providers_select_admin_all on public.providers;
create policy providers_select_admin_all
on public.providers
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

drop policy if exists providers_update_admin_approval on public.providers;
drop policy if exists providers_update_admin_management on public.providers;
create policy providers_update_admin_management
on public.providers
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

comment on policy providers_select_admin_all on public.providers is
  'Admins can read all provider records from admin tooling while RLS remains enabled.';

comment on policy providers_update_admin_management on public.providers is
  'Admins can update provider management fields from server actions while RLS remains enabled.';
