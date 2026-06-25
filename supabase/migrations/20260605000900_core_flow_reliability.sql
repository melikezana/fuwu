-- Core provider/request flow reliability hardening.
-- Safe to re-run after the base schema and RLS policies.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'customer')
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop policy if exists profiles_insert_own_customer on public.profiles;
create policy profiles_insert_own_customer
on public.profiles
for insert
to authenticated
with check (
  id = auth.uid()
  and role = 'customer'
);

comment on policy profiles_insert_own_customer on public.profiles is
  'Authenticated users can create only their own default customer profile when an auth trigger has not created it yet.';

-- Safely resolve duplicate pending provider applications before creating the unique index
update public.provider_applications
set status = 'rejected',
    updated_at = timezone('utc', now())
where status = 'pending'
  and id not in (
    select distinct on (phone) id
    from public.provider_applications
    where status = 'pending'
    order by phone, created_at desc, id desc
  );

create unique index if not exists provider_applications_pending_phone_unique_idx
  on public.provider_applications (phone)
  where status = 'pending';

drop policy if exists service_requests_update_provider_assigned_status on public.service_requests;
create policy service_requests_update_provider_assigned_status
on public.service_requests
for update
to authenticated
using (
  coalesce(urgency_type, 'standard') = 'standard'
  and exists (
    select 1
    from public.providers
    where providers.user_id = auth.uid()
      and providers.is_active = true
      and providers.is_approved = true
      and providers.id = service_requests.assigned_provider_id
  )
)
with check (
  coalesce(urgency_type, 'standard') = 'standard'
  and status in ('tamamlandi', 'iptal')
  and exists (
    select 1
    from public.providers
    where providers.user_id = auth.uid()
      and providers.is_active = true
      and providers.is_approved = true
      and providers.id = service_requests.assigned_provider_id
  )
);

comment on policy service_requests_update_provider_assigned_status on public.service_requests is
  'Approved providers can close or cancel standard requests assigned to their provider record.';

