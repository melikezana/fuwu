-- Backend hardening for canonical request states, audit logs, duplicates, and RLS.
-- RLS stays enabled; no public write policies are introduced.

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  );
$$;

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

create or replace function public.provider_owner_protected_fields_are_unchanged(
  provider_id uuid,
  next_user_id uuid,
  next_category_id uuid,
  next_district_id uuid,
  next_phone text,
  next_average_price_min numeric,
  next_average_price_max numeric,
  next_rating numeric,
  next_is_verified boolean,
  next_phone_verified boolean,
  next_identity_verified boolean,
  next_is_active boolean,
  next_is_approved boolean
)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.providers
    where providers.id = provider_id
      and providers.user_id = auth.uid()
      and providers.user_id is not distinct from next_user_id
      and providers.category_id is not distinct from next_category_id
      and providers.district_id is not distinct from next_district_id
      and providers.phone is not distinct from next_phone
      and providers.average_price_min is not distinct from next_average_price_min
      and providers.average_price_max is not distinct from next_average_price_max
      and providers.rating is not distinct from next_rating
      and providers.is_verified is not distinct from next_is_verified
      and providers.phone_verified is not distinct from next_phone_verified
      and providers.identity_verified is not distinct from next_identity_verified
      and providers.is_active is not distinct from next_is_active
      and providers.is_approved is not distinct from next_is_approved
  );
$$;

create or replace function public.service_request_assignment_fields_are_unchanged(
  request_id uuid,
  next_assigned_provider_id uuid,
  next_accepted_provider_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.service_requests
    where service_requests.id = request_id
      and service_requests.assigned_provider_id is not distinct from next_assigned_provider_id
      and service_requests.accepted_provider_id is not distinct from next_accepted_provider_id
  );
$$;

alter table public.profiles enable row level security;
alter table public.provider_applications enable row level security;
alter table public.providers enable row level security;
alter table public.service_requests enable row level security;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;
alter table public.audit_logs
  alter column actor_user_id drop not null,
  alter column metadata set default '{}'::jsonb;

alter table public.provider_applications
  drop constraint if exists provider_applications_status_check;

alter table public.provider_applications
  add constraint provider_applications_status_check
  check (status in ('pending', 'approved', 'rejected'));

alter table public.service_requests
  drop constraint if exists service_requests_status_check;

alter table public.service_requests
  add constraint service_requests_status_check
  check (
    status in (
      'pending',
      'assigned',
      'accepted',
      'rejected',
      'in_progress',
      'completed',
      'cancelled',
      'yeni',
      'inceleniyor',
      'ustaya_yonlendirildi',
      'tamamlandi',
      'iptal',
      'on_the_way',
      'matched',
      'open'
    )
  );

alter table public.service_requests
  drop constraint if exists service_requests_emergency_status_check;

alter table public.service_requests
  add constraint service_requests_emergency_status_check
  check (
    emergency_status is null
    or emergency_status in (
      'pending',
      'assigned',
      'accepted',
      'rejected',
      'on_the_way',
      'completed',
      'cancelled'
    )
  );

create unique index if not exists provider_applications_pending_user_unique_idx
  on public.provider_applications (user_id)
  where user_id is not null and status = 'pending';

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
  where phone is not null and btrim(phone) <> '' and status = 'pending';

create unique index if not exists providers_user_id_unique_idx
  on public.providers (user_id)
  where user_id is not null;

create unique index if not exists providers_phone_category_district_unique_idx
  on public.providers (phone, category_id, district_id)
  where btrim(phone) <> '';

create index if not exists service_requests_recent_duplicate_lookup_idx
  on public.service_requests (user_id, category_id, district_id, created_at desc)
  where status in ('pending', 'assigned', 'accepted', 'in_progress', 'yeni', 'inceleniyor', 'ustaya_yonlendirildi', 'on_the_way');

create index if not exists audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id, created_at desc);

create index if not exists audit_logs_actor_idx
  on public.audit_logs (actor_user_id, created_at desc);

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_select_admin_all on public.profiles;
drop policy if exists profiles_insert_own_customer on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_update_admin_roles on public.profiles;
drop policy if exists profiles_update_admin_all on public.profiles;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy profiles_select_admin_all
on public.profiles
for select
to authenticated
using (public.current_user_is_admin());

create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and public.profile_role_is_unchanged(id, role::text)
);

create policy profiles_update_admin_all
on public.profiles
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

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
drop policy if exists provider_applications_update_own_pending on public.provider_applications;

create policy provider_applications_insert_authenticated_pending
on public.provider_applications
for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'pending'
);

create policy provider_applications_select_own
on public.provider_applications
for select
to authenticated
using (user_id = auth.uid());

create policy provider_applications_select_admin_all
on public.provider_applications
for select
to authenticated
using (public.current_user_is_admin());

create policy provider_applications_update_own_pending
on public.provider_applications
for update
to authenticated
using (
  user_id = auth.uid()
  and status = 'pending'
)
with check (
  user_id = auth.uid()
  and status = 'pending'
);

create policy provider_applications_update_admin_status
on public.provider_applications
for update
to authenticated
using (public.current_user_is_admin())
with check (
  public.current_user_is_admin()
  and status in ('pending', 'approved', 'rejected')
);

drop policy if exists providers_select_public_active_approved on public.providers;
drop policy if exists providers_select_admin_all on public.providers;
drop policy if exists providers_select_own_profile on public.providers;
drop policy if exists providers_insert_admin on public.providers;
drop policy if exists providers_update_own_profile on public.providers;
drop policy if exists providers_update_admin_approval on public.providers;
drop policy if exists providers_update_admin_management on public.providers;

create policy providers_select_public_active_approved
on public.providers
for select
to anon, authenticated
using (is_active = true and is_approved = true);

create policy providers_select_own_profile
on public.providers
for select
to authenticated
using (user_id = auth.uid());

create policy providers_select_admin_all
on public.providers
for select
to authenticated
using (public.current_user_is_admin());

create policy providers_insert_admin
on public.providers
for insert
to authenticated
with check (public.current_user_is_admin());

create policy providers_update_own_profile
on public.providers
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and public.provider_owner_protected_fields_are_unchanged(
    id,
    user_id,
    category_id,
    district_id,
    phone,
    average_price_min,
    average_price_max,
    rating,
    is_verified,
    phone_verified,
    identity_verified,
    is_active,
    is_approved
  )
);

create policy providers_update_admin_management
on public.providers
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists service_requests_insert_authenticated_own on public.service_requests;
drop policy if exists service_requests_select_own on public.service_requests;
drop policy if exists service_requests_select_admin_all on public.service_requests;
drop policy if exists service_requests_select_provider_relevant on public.service_requests;
drop policy if exists service_requests_update_customer_cancel on public.service_requests;
drop policy if exists service_requests_update_admin_status on public.service_requests;
drop policy if exists service_requests_update_admin_assignment on public.service_requests;
drop policy if exists service_requests_update_provider_assigned_status on public.service_requests;
drop policy if exists service_requests_update_provider_emergency_acceptance on public.service_requests;

create policy service_requests_insert_authenticated_own
on public.service_requests
for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'pending'
  and assigned_provider_id is null
  and accepted_provider_id is null
  and (
    coalesce(urgency_type, 'standard') <> 'emergency'
    or emergency_status = 'pending'
  )
);

create policy service_requests_select_own
on public.service_requests
for select
to authenticated
using (user_id = auth.uid());

create policy service_requests_select_provider_relevant
on public.service_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.providers
    where providers.user_id = auth.uid()
      and providers.is_active = true
      and providers.is_approved = true
      and (
        providers.id = service_requests.assigned_provider_id
        or providers.id = service_requests.accepted_provider_id
      )
  )
);

create policy service_requests_select_admin_all
on public.service_requests
for select
to authenticated
using (public.current_user_is_admin());

create policy service_requests_update_customer_cancel
on public.service_requests
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and status = 'cancelled'
  and (
    coalesce(urgency_type, 'standard') <> 'emergency'
    or emergency_status = 'cancelled'
  )
  and public.service_request_assignment_fields_are_unchanged(
    id,
    assigned_provider_id,
    accepted_provider_id
  )
);

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
  and status in ('accepted', 'rejected', 'in_progress', 'completed', 'cancelled')
  and exists (
    select 1
    from public.providers
    where providers.user_id = auth.uid()
      and providers.is_active = true
      and providers.is_approved = true
      and providers.id = service_requests.assigned_provider_id
      and (
        service_requests.accepted_provider_id is null
        or service_requests.accepted_provider_id = providers.id
      )
  )
);

create policy service_requests_update_provider_emergency_acceptance
on public.service_requests
for update
to authenticated
using (
  urgency_type = 'emergency'
  and exists (
    select 1
    from public.providers
    where providers.user_id = auth.uid()
      and providers.is_active = true
      and providers.is_approved = true
      and providers.category_id = service_requests.category_id
      and providers.id = service_requests.assigned_provider_id
  )
)
with check (
  urgency_type = 'emergency'
  and status in ('accepted', 'rejected', 'in_progress', 'completed', 'cancelled')
  and emergency_status in ('accepted', 'rejected', 'on_the_way', 'completed', 'cancelled')
  and exists (
    select 1
    from public.providers
    where providers.user_id = auth.uid()
      and providers.is_active = true
      and providers.is_approved = true
      and providers.id = service_requests.assigned_provider_id
      and providers.category_id = service_requests.category_id
      and (
        service_requests.accepted_provider_id is null
        or service_requests.accepted_provider_id = providers.id
      )
  )
);

create policy service_requests_update_admin_assignment
on public.service_requests
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists audit_logs_select_admin_only on public.audit_logs;
drop policy if exists audit_logs_insert_authenticated_actor on public.audit_logs;
drop policy if exists audit_logs_insert_admin on public.audit_logs;

create policy audit_logs_select_admin_only
on public.audit_logs
for select
to authenticated
using (public.current_user_is_admin());

create policy audit_logs_insert_authenticated_actor
on public.audit_logs
for insert
to authenticated
with check (
  actor_user_id = auth.uid()
  or public.current_user_is_admin()
);

do $$
begin
  if to_regclass('public.notifications') is not null
    and exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'notifications'
        and column_name = 'user_id'
    )
  then
    execute 'alter table public.notifications enable row level security';
    execute 'drop policy if exists notifications_select_own on public.notifications';
    execute 'drop policy if exists notifications_insert_admin_or_actor on public.notifications';
    execute 'create policy notifications_select_own on public.notifications for select to authenticated using (user_id = auth.uid() or public.current_user_is_admin())';
    execute 'create policy notifications_insert_admin_or_actor on public.notifications for insert to authenticated with check (user_id = auth.uid() or public.current_user_is_admin())';
  end if;
end $$;
