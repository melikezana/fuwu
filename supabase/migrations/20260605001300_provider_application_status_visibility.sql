-- Let authenticated applicants see their own latest provider application status.
-- Works with deployments that either kept provider_applications.user_id or removed it.

alter table public.provider_applications enable row level security;

drop policy if exists provider_applications_select_own_user_id on public.provider_applications;
drop policy if exists provider_applications_select_own_profile_phone on public.provider_applications;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'provider_applications'
      and column_name = 'user_id'
  ) then
    execute $policy$
      create policy provider_applications_select_own_user_id
      on public.provider_applications
      for select
      to authenticated
      using (user_id = auth.uid())
    $policy$;
  end if;
end $$;

create policy provider_applications_select_own_profile_phone
on public.provider_applications
for select
to authenticated
using (
  phone is not null
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.phone = provider_applications.phone
  )
);

comment on policy provider_applications_select_own_profile_phone on public.provider_applications is
  'Applicants can read their own provider application status when the application phone matches their profile phone.';
