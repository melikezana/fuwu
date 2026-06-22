-- Supabase CLI 2.75+ no longer auto-exposes newly created public objects.
-- Declare API privileges explicitly and leave row-level authorization to RLS.

grant usage on schema public to anon, authenticated, service_role;

revoke all privileges on all tables in schema public from anon, authenticated;

-- Remove the legacy permissive insert policy. It otherwise ORs with the
-- authenticated ownership policy and lets signed-in users spoof user_id,
-- status, and assignment fields.
drop policy if exists "Public can insert service requests"
  on public.service_requests;

grant select
on table
  public.service_categories,
  public.districts,
  public.providers,
  public.reviews
to anon;

alter table public.reviews enable row level security;

drop policy if exists reviews_select_public on public.reviews;
drop policy if exists reviews_insert_own on public.reviews;
drop policy if exists reviews_update_own on public.reviews;
drop policy if exists reviews_delete_own on public.reviews;

create policy reviews_select_public
on public.reviews
for select
to anon, authenticated
using (true);

create policy reviews_insert_own
on public.reviews
for insert
to authenticated
with check (user_id = auth.uid());

create policy reviews_update_own
on public.reviews
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy reviews_delete_own
on public.reviews
for delete
to authenticated
using (user_id = auth.uid());

grant select on all tables in schema public to authenticated;

grant insert, update
on table
  public.profiles,
  public.providers,
  public.provider_applications,
  public.service_requests,
  public.reviews,
  public.audit_logs,
  public.rate_limits,
  public.payments,
  public.notifications
to authenticated;

grant delete on table public.reviews to authenticated;

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

alter default privileges in schema public
  grant all privileges on tables to service_role;

alter default privileges in schema public
  grant all privileges on sequences to service_role;

-- Notification fan-out must not depend on giving a customer permission to
-- write arbitrary rows for other users. The RPC derives every field from the
-- persisted request/provider records and only accepts the request owner or an
-- admin as the actor.
create or replace function public.notify_eligible_providers_for_request(
  p_request_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_user_id uuid := auth.uid();
  v_inserted_count integer := 0;
begin
  if v_actor_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.service_requests request
    where request.id = p_request_id
      and (
        request.user_id = v_actor_user_id
        or public.current_user_is_admin()
      )
  ) then
    raise exception 'Request not found or access denied'
      using errcode = '42501';
  end if;

  insert into public.notifications (
    actor_user_id,
    body,
    entity_id,
    entity_type,
    event,
    is_read,
    message,
    metadata,
    provider_id,
    recipient_user_id,
    request_id,
    title,
    type,
    user_id
  )
  select
    v_actor_user_id,
    case
      when request.urgency_type = 'emergency'
        then 'Bölgenizde acil bir müşteri talebi oluşturuldu. Talep ayrıntılarını inceleyin.'
      else 'Kategori ve hizmet bölgenizle eşleşen yeni bir müşteri talebi var.'
    end,
    request.id,
    'service_request',
    'new_service_request_match',
    false,
    case
      when request.urgency_type = 'emergency'
        then 'Bölgenizde acil bir müşteri talebi oluşturuldu. Talep ayrıntılarını inceleyin.'
      else 'Kategori ve hizmet bölgenizle eşleşen yeni bir müşteri talebi var.'
    end,
    jsonb_build_object(
      'actorUserId', v_actor_user_id,
      'categoryId', request.category_id,
      'districtId', request.district_id,
      'providerId', provider.id,
      'providerUserId', provider.user_id,
      'requestId', request.id,
      'urgencyType', request.urgency_type
    ),
    provider.id,
    provider.user_id,
    request.id,
    case
      when request.urgency_type = 'emergency'
        then 'Yeni acil hizmet talebi'
      else 'Yeni hizmet talebi'
    end,
    'new_service_request_match',
    provider.user_id
  from public.service_requests request
  join public.providers provider
    on provider.category_id = request.category_id
   and provider.district_id = request.district_id
  where request.id = p_request_id
    and provider.is_active = true
    and provider.is_approved = true
    and provider.user_id is not null
  order by
    provider.is_verified desc,
    provider.identity_verified desc,
    provider.phone_verified desc,
    provider.profile_completion_score desc nulls last,
    provider.rating desc,
    provider.id
  limit 50
  on conflict (recipient_user_id, request_id, event) do nothing;

  get diagnostics v_inserted_count = row_count;
  return v_inserted_count;
end;
$$;

revoke all on function public.notify_eligible_providers_for_request(uuid)
  from public;
grant execute on function public.notify_eligible_providers_for_request(uuid)
  to authenticated, service_role;
