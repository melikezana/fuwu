-- Bind legacy provider applications to the authenticated applicant.
-- Older rows can have user_id = null, so dashboard/account reads fall back by
-- phone and then call this function to persist durable ownership.

alter table public.provider_applications
  add column if not exists user_id uuid references public.profiles(id) on delete set null;

create index if not exists provider_applications_user_id_idx
  on public.provider_applications (user_id);

create or replace function public.bind_provider_applications_to_current_user(
  application_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  updated_count integer := 0;
begin
  if auth.uid() is null
    or application_ids is null
    or cardinality(application_ids) = 0
  then
    return 0;
  end if;

  update public.provider_applications as application
  set user_id = auth.uid()
  where application.user_id is null
    and application.id = any(application_ids)
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.phone is not null
        and btrim(profiles.phone) <> ''
        and profiles.phone = application.phone
    );

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke all on function public.bind_provider_applications_to_current_user(uuid[]) from public;
revoke all on function public.bind_provider_applications_to_current_user(uuid[]) from anon;
grant execute on function public.bind_provider_applications_to_current_user(uuid[]) to authenticated;

comment on function public.bind_provider_applications_to_current_user(uuid[]) is
  'Authenticated applicants can bind their own legacy provider applications when profile phone matches and user_id is null.';
