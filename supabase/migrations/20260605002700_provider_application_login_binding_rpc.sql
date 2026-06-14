-- Make legacy provider-application ownership binding callable after login.
-- The previous RPC required explicit application ids; auth callbacks do not have
-- that list, so this canonical version binds all matching unowned rows.

alter table public.provider_applications
  add column if not exists email text;

create index if not exists provider_applications_email_idx
  on public.provider_applications (lower(email))
  where email is not null and btrim(email) <> '';

drop function if exists public.bind_provider_applications_to_current_user(uuid[]);

create or replace function public.bind_provider_applications_to_current_user()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  updated_count integer := 0;
begin
  if auth.uid() is null then
    return 0;
  end if;

  update public.provider_applications as application
  set user_id = auth.uid()
  where application.user_id is null
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and (
          (
            profiles.phone is not null
            and btrim(profiles.phone) <> ''
            and profiles.phone = application.phone
          )
          or exists (
            select 1
            from auth.users
            where users.id = auth.uid()
              and users.email is not null
              and application.email is not null
              and lower(users.email) = lower(application.email)
          )
        )
    );

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke all on function public.bind_provider_applications_to_current_user() from public;
revoke all on function public.bind_provider_applications_to_current_user() from anon;
grant execute on function public.bind_provider_applications_to_current_user() to authenticated;

comment on function public.bind_provider_applications_to_current_user() is
  'Authenticated applicants can bind legacy provider applications when profile phone or auth email matches and user_id is null.';
