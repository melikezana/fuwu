-- Keep provider application profile persistence compatible with profiles RLS.
-- Applicants may only create or update their own profile row, and provider
-- applications may only be linked to the authenticated applicant.

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

alter table public.profiles enable row level security;

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

drop policy if exists "Users can update their own profile." on public.profiles;
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

alter table public.provider_applications
  add column if not exists user_id uuid references public.profiles(id) on delete set null;

create index if not exists provider_applications_user_id_idx
  on public.provider_applications (user_id);

alter table public.provider_applications enable row level security;

drop policy if exists "Anyone can insert provider applications" on public.provider_applications;
drop policy if exists "Anyone can apply as provider" on public.provider_applications;
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
