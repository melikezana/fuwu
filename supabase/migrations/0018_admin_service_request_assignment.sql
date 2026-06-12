-- Admin service request assignment policy.
-- Keeps RLS enabled while allowing authenticated admins to assign providers.

alter table public.service_requests enable row level security;

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
  'Admins can read all service requests from admin tooling while RLS remains enabled.';

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
