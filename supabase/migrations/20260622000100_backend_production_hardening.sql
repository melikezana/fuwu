-- Production hardening for provider matching, notification fan-out, and
-- backend metadata checks.

-- Normalize legacy request states before restricting new writes to the
-- canonical application-level SERVICE_REQUEST_STATUSES values.
update public.service_requests
set status = case status
  when 'yeni' then 'pending'
  when 'open' then 'pending'
  when 'ustaya_yonlendirildi' then 'assigned'
  when 'matched' then 'assigned'
  when 'inceleniyor' then 'in_progress'
  when 'on_the_way' then 'in_progress'
  when 'tamamlandi' then 'completed'
  when 'iptal' then 'cancelled'
  else status
end
where status in (
  'yeni',
  'open',
  'ustaya_yonlendirildi',
  'matched',
  'inceleniyor',
  'on_the_way',
  'tamamlandi',
  'iptal'
);

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
      'cancelled'
    )
  );

-- Keep the critical relationship set intact even when this migration is
-- applied to a database that did not start from the current initial schema.
do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints as table_constraint
    join information_schema.key_column_usage as source_column
      on source_column.constraint_schema = table_constraint.constraint_schema
     and source_column.constraint_name = table_constraint.constraint_name
    join information_schema.constraint_column_usage as target_column
      on target_column.constraint_schema = table_constraint.constraint_schema
     and target_column.constraint_name = table_constraint.constraint_name
    join information_schema.referential_constraints as referential_constraint
      on referential_constraint.constraint_schema = table_constraint.constraint_schema
     and referential_constraint.constraint_name = table_constraint.constraint_name
    where table_constraint.constraint_type = 'FOREIGN KEY'
      and table_constraint.table_schema = 'public'
      and table_constraint.table_name = 'service_requests'
      and source_column.column_name = 'assigned_provider_id'
      and target_column.table_schema = 'public'
      and target_column.table_name = 'providers'
      and target_column.column_name = 'id'
      and referential_constraint.delete_rule = 'SET NULL'
  ) then
    alter table public.service_requests
      add constraint service_requests_assigned_provider_hardening_fkey
      foreign key (assigned_provider_id)
      references public.providers(id)
      on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints as table_constraint
    join information_schema.key_column_usage as source_column
      on source_column.constraint_schema = table_constraint.constraint_schema
     and source_column.constraint_name = table_constraint.constraint_name
    join information_schema.constraint_column_usage as target_column
      on target_column.constraint_schema = table_constraint.constraint_schema
     and target_column.constraint_name = table_constraint.constraint_name
    join information_schema.referential_constraints as referential_constraint
      on referential_constraint.constraint_schema = table_constraint.constraint_schema
     and referential_constraint.constraint_name = table_constraint.constraint_name
    where table_constraint.constraint_type = 'FOREIGN KEY'
      and table_constraint.table_schema = 'public'
      and table_constraint.table_name = 'service_requests'
      and source_column.column_name = 'category_id'
      and target_column.table_schema = 'public'
      and target_column.table_name = 'service_categories'
      and target_column.column_name = 'id'
      and referential_constraint.delete_rule = 'RESTRICT'
  ) then
    alter table public.service_requests
      add constraint service_requests_category_hardening_fkey
      foreign key (category_id)
      references public.service_categories(id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints as table_constraint
    join information_schema.key_column_usage as source_column
      on source_column.constraint_schema = table_constraint.constraint_schema
     and source_column.constraint_name = table_constraint.constraint_name
    join information_schema.constraint_column_usage as target_column
      on target_column.constraint_schema = table_constraint.constraint_schema
     and target_column.constraint_name = table_constraint.constraint_name
    join information_schema.referential_constraints as referential_constraint
      on referential_constraint.constraint_schema = table_constraint.constraint_schema
     and referential_constraint.constraint_name = table_constraint.constraint_name
    where table_constraint.constraint_type = 'FOREIGN KEY'
      and table_constraint.table_schema = 'public'
      and table_constraint.table_name = 'service_requests'
      and source_column.column_name = 'district_id'
      and target_column.table_schema = 'public'
      and target_column.table_name = 'districts'
      and target_column.column_name = 'id'
      and referential_constraint.delete_rule = 'RESTRICT'
  ) then
    alter table public.service_requests
      add constraint service_requests_district_hardening_fkey
      foreign key (district_id)
      references public.districts(id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints as table_constraint
    join information_schema.key_column_usage as source_column
      on source_column.constraint_schema = table_constraint.constraint_schema
     and source_column.constraint_name = table_constraint.constraint_name
    join information_schema.constraint_column_usage as target_column
      on target_column.constraint_schema = table_constraint.constraint_schema
     and target_column.constraint_name = table_constraint.constraint_name
    join information_schema.referential_constraints as referential_constraint
      on referential_constraint.constraint_schema = table_constraint.constraint_schema
     and referential_constraint.constraint_name = table_constraint.constraint_name
    where table_constraint.constraint_type = 'FOREIGN KEY'
      and table_constraint.table_schema = 'public'
      and table_constraint.table_name = 'notifications'
      and source_column.column_name = 'recipient_user_id'
      and target_column.table_schema = 'public'
      and target_column.table_name = 'profiles'
      and target_column.column_name = 'id'
      and referential_constraint.delete_rule = 'CASCADE'
  ) then
    alter table public.notifications
      add constraint notifications_recipient_user_hardening_fkey
      foreign key (recipient_user_id)
      references public.profiles(id)
      on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints as table_constraint
    join information_schema.key_column_usage as source_column
      on source_column.constraint_schema = table_constraint.constraint_schema
     and source_column.constraint_name = table_constraint.constraint_name
    join information_schema.constraint_column_usage as target_column
      on target_column.constraint_schema = table_constraint.constraint_schema
     and target_column.constraint_name = table_constraint.constraint_name
    join information_schema.referential_constraints as referential_constraint
      on referential_constraint.constraint_schema = table_constraint.constraint_schema
     and referential_constraint.constraint_name = table_constraint.constraint_name
    where table_constraint.constraint_type = 'FOREIGN KEY'
      and table_constraint.table_schema = 'public'
      and table_constraint.table_name = 'payments'
      and source_column.column_name = 'request_id'
      and target_column.table_schema = 'public'
      and target_column.table_name = 'service_requests'
      and target_column.column_name = 'id'
      and referential_constraint.delete_rule = 'CASCADE'
  ) then
    alter table public.payments
      add constraint payments_request_hardening_fkey
      foreign key (request_id)
      references public.service_requests(id)
      on delete cascade;
  end if;
end $$;

-- A provider that received an explicit match notification may read that
-- request even before a single provider has been assigned. This keeps the
-- provider request list and the Realtime bell event consistent.
drop policy if exists service_requests_select_provider_relevant
  on public.service_requests;

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
  or exists (
    select 1
    from public.notifications
    where notifications.request_id = service_requests.id
      and notifications.recipient_user_id = auth.uid()
      and notifications.event = 'new_service_request_match'
  )
);

comment on policy service_requests_select_provider_relevant
  on public.service_requests is
  'Approved assigned providers and explicitly notified match recipients can read relevant requests.';

-- A single PostgREST upsert can now target the exact idempotency key. Existing
-- duplicates are reduced deterministically before the stronger index is added.
with duplicate_notifications as (
  select
    id,
    row_number() over (
      partition by recipient_user_id, request_id, event
      order by created_at asc, id asc
    ) as duplicate_rank
  from public.notifications
  where request_id is not null
)
delete from public.notifications as notification
using duplicate_notifications
where notification.id = duplicate_notifications.id
  and duplicate_notifications.duplicate_rank > 1;

drop index if exists public.notifications_unique_provider_request_match_idx;

create unique index if not exists notifications_recipient_request_event_unique_idx
  on public.notifications (recipient_user_id, request_id, event);

comment on index public.notifications_recipient_request_event_unique_idx is
  'Idempotency key for request-scoped notifications; null request IDs remain independently insertable.';

-- The equality prefix serves the match lookup, while the remaining keys serve
-- deterministic trust/rating ordering before LIMIT 50.
create index if not exists providers_match_eligibility_idx
  on public.providers (
    category_id,
    district_id,
    is_active,
    is_approved,
    is_verified desc,
    identity_verified desc,
    phone_verified desc,
    profile_completion_score desc nulls last,
    rating desc,
    id
  );

comment on index public.providers_match_eligibility_idx is
  'Supports bounded category/district provider fan-out ordered by trust signals and rating.';

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_publication
    where pubname = 'supabase_realtime'
  ) then
    execute 'create publication supabase_realtime';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    execute 'alter publication supabase_realtime add table public.notifications';
  end if;
end $$;

-- Extend the service-role catalog with the exact production-hardening checks
-- consumed by scripts/check-backend-db.mjs.
create or replace function public.backend_health_catalog()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  with expected_tables(table_name) as (
    values
      ('profiles'),
      ('providers'),
      ('provider_applications'),
      ('service_requests'),
      ('service_categories'),
      ('districts'),
      ('audit_logs'),
      ('rate_limits'),
      ('payments'),
      ('notifications')
  ),
  table_status as (
    select
      expected_tables.table_name,
      (table_class.oid is not null) as table_exists,
      coalesce(table_class.relrowsecurity, false) as rls_enabled,
      coalesce(
        (
          select jsonb_agg(policies.policyname order by policies.policyname)
          from pg_catalog.pg_policies as policies
          where policies.schemaname = 'public'
            and policies.tablename = expected_tables.table_name
        ),
        '[]'::jsonb
      ) as policies
    from expected_tables
    left join pg_catalog.pg_class as table_class
      on table_class.oid = to_regclass(format('public.%I', expected_tables.table_name))
  ),
  expected_functions(function_name) as (
    values
      ('current_user_is_admin'),
      ('handle_new_user'),
      ('bind_provider_applications_to_current_user')
  ),
  function_status as (
    select
      expected_functions.function_name,
      exists (
        select 1
        from pg_catalog.pg_proc as proc
        join pg_catalog.pg_namespace as namespace
          on namespace.oid = proc.pronamespace
        where namespace.nspname = 'public'
          and proc.proname = expected_functions.function_name
      ) as function_exists
    from expected_functions
  ),
  expected_foreign_keys(
    check_name,
    source_table,
    source_column,
    target_table,
    target_column,
    expected_delete_rule
  ) as (
    values
      (
        'serviceRequestsAssignedProvider',
        'service_requests',
        'assigned_provider_id',
        'providers',
        'id',
        'SET NULL'
      ),
      (
        'serviceRequestsCategory',
        'service_requests',
        'category_id',
        'service_categories',
        'id',
        'RESTRICT'
      ),
      (
        'serviceRequestsDistrict',
        'service_requests',
        'district_id',
        'districts',
        'id',
        'RESTRICT'
      ),
      (
        'notificationsRecipientUser',
        'notifications',
        'recipient_user_id',
        'profiles',
        'id',
        'CASCADE'
      ),
      (
        'paymentsServiceRequest',
        'payments',
        'request_id',
        'service_requests',
        'id',
        'CASCADE'
      )
  ),
  foreign_key_status as (
    select
      expected_foreign_keys.check_name,
      exists (
        select 1
        from information_schema.table_constraints as table_constraint
        join information_schema.key_column_usage as source_column
          on source_column.constraint_schema = table_constraint.constraint_schema
         and source_column.constraint_name = table_constraint.constraint_name
        join information_schema.constraint_column_usage as target_column
          on target_column.constraint_schema = table_constraint.constraint_schema
         and target_column.constraint_name = table_constraint.constraint_name
        where table_constraint.constraint_type = 'FOREIGN KEY'
          and table_constraint.table_schema = 'public'
          and table_constraint.table_name = expected_foreign_keys.source_table
          and source_column.column_name = expected_foreign_keys.source_column
          and target_column.table_schema = 'public'
          and target_column.table_name = expected_foreign_keys.target_table
          and target_column.column_name = expected_foreign_keys.target_column
      ) as foreign_key_exists,
      exists (
        select 1
        from information_schema.table_constraints as table_constraint
        join information_schema.key_column_usage as source_column
          on source_column.constraint_schema = table_constraint.constraint_schema
         and source_column.constraint_name = table_constraint.constraint_name
        join information_schema.constraint_column_usage as target_column
          on target_column.constraint_schema = table_constraint.constraint_schema
         and target_column.constraint_name = table_constraint.constraint_name
        join information_schema.referential_constraints as referential_constraint
          on referential_constraint.constraint_schema = table_constraint.constraint_schema
         and referential_constraint.constraint_name = table_constraint.constraint_name
        where table_constraint.constraint_type = 'FOREIGN KEY'
          and table_constraint.table_schema = 'public'
          and table_constraint.table_name = expected_foreign_keys.source_table
          and source_column.column_name = expected_foreign_keys.source_column
          and target_column.table_schema = 'public'
          and target_column.table_name = expected_foreign_keys.target_table
          and target_column.column_name = expected_foreign_keys.target_column
          and referential_constraint.delete_rule =
            expected_foreign_keys.expected_delete_rule
      ) as delete_action_matches,
      coalesce(
        (
          select max(referential_constraint.delete_rule)
          from information_schema.table_constraints as table_constraint
          join information_schema.key_column_usage as source_column
            on source_column.constraint_schema = table_constraint.constraint_schema
           and source_column.constraint_name = table_constraint.constraint_name
          join information_schema.constraint_column_usage as target_column
            on target_column.constraint_schema = table_constraint.constraint_schema
           and target_column.constraint_name = table_constraint.constraint_name
          join information_schema.referential_constraints as referential_constraint
            on referential_constraint.constraint_schema = table_constraint.constraint_schema
           and referential_constraint.constraint_name = table_constraint.constraint_name
          where table_constraint.constraint_type = 'FOREIGN KEY'
            and table_constraint.table_schema = 'public'
            and table_constraint.table_name = expected_foreign_keys.source_table
            and source_column.column_name = expected_foreign_keys.source_column
            and target_column.table_schema = 'public'
            and target_column.table_name = expected_foreign_keys.target_table
            and target_column.column_name = expected_foreign_keys.target_column
        ),
        ''
      ) as actual_delete_rule
    from expected_foreign_keys
  ),
  provider_index_columns as (
    select
      index_class.relname as index_name,
      array_agg(attribute.attname order by index_key.ordinality)
        filter (where index_key.ordinality <= index_info.indnkeyatts) as key_columns
    from pg_catalog.pg_index as index_info
    join pg_catalog.pg_class as table_class
      on table_class.oid = index_info.indrelid
    join pg_catalog.pg_namespace as table_namespace
      on table_namespace.oid = table_class.relnamespace
    join pg_catalog.pg_class as index_class
      on index_class.oid = index_info.indexrelid
    cross join lateral unnest(index_info.indkey::smallint[])
      with ordinality as index_key(attribute_number, ordinality)
    join pg_catalog.pg_attribute as attribute
      on attribute.attrelid = table_class.oid
     and attribute.attnum = index_key.attribute_number
    where table_namespace.nspname = 'public'
      and table_class.relname = 'providers'
    group by index_class.relname, index_info.indnkeyatts
  ),
  provider_match_index as (
    select
      exists (
        select 1
        from provider_index_columns
        where key_columns[1:4] = array[
          'category_id',
          'district_id',
          'is_active',
          'is_approved'
        ]::name[]
      ) as index_exists,
      coalesce(
        (
          select index_name
          from provider_index_columns
          where key_columns[1:4] = array[
            'category_id',
            'district_id',
            'is_active',
            'is_approved'
          ]::name[]
          order by index_name
          limit 1
        ),
        ''
      ) as index_name
  ),
  realtime_publication as (
    select exists (
      select 1
      from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notifications'
    ) as publication_enabled
  ),
  status_constraint as (
    select
      exists (
        select 1
        from pg_catalog.pg_constraint as constraint_info
        where constraint_info.conrelid = 'public.service_requests'::regclass
          and constraint_info.conname = 'service_requests_status_check'
          and constraint_info.contype = 'c'
          and constraint_info.convalidated
          and pg_catalog.pg_get_constraintdef(constraint_info.oid)
            like '%pending%'
          and pg_catalog.pg_get_constraintdef(constraint_info.oid)
            like '%assigned%'
          and pg_catalog.pg_get_constraintdef(constraint_info.oid)
            like '%accepted%'
          and pg_catalog.pg_get_constraintdef(constraint_info.oid)
            like '%rejected%'
          and pg_catalog.pg_get_constraintdef(constraint_info.oid)
            like '%in_progress%'
          and pg_catalog.pg_get_constraintdef(constraint_info.oid)
            like '%completed%'
          and pg_catalog.pg_get_constraintdef(constraint_info.oid)
            like '%cancelled%'
          and pg_catalog.pg_get_constraintdef(constraint_info.oid)
            not like '%yeni%'
          and pg_catalog.pg_get_constraintdef(constraint_info.oid)
            not like '%inceleniyor%'
          and pg_catalog.pg_get_constraintdef(constraint_info.oid)
            not like '%ustaya_yonlendirildi%'
          and pg_catalog.pg_get_constraintdef(constraint_info.oid)
            not like '%tamamlandi%'
          and pg_catalog.pg_get_constraintdef(constraint_info.oid)
            not like '%iptal%'
          and pg_catalog.pg_get_constraintdef(constraint_info.oid)
            not like '%matched%'
          and pg_catalog.pg_get_constraintdef(constraint_info.oid)
            not like '%open%'
          and pg_catalog.pg_get_constraintdef(constraint_info.oid)
            not like '%on_the_way%'
      ) as constraint_exists
  )
  select jsonb_build_object(
    'tables',
    (
      select jsonb_object_agg(
        table_status.table_name,
        jsonb_build_object(
          'exists', table_status.table_exists,
          'rlsEnabled', table_status.rls_enabled,
          'policies', table_status.policies
        )
        order by table_status.table_name
      )
      from table_status
    ),
    'functions',
    (
      select jsonb_object_agg(
        function_status.function_name,
        jsonb_build_object('exists', function_status.function_exists)
        order by function_status.function_name
      )
      from function_status
    ),
    'foreignKeys',
    (
      select jsonb_object_agg(
        foreign_key_status.check_name,
        jsonb_build_object(
          'exists', foreign_key_status.foreign_key_exists,
          'deleteActionMatches', foreign_key_status.delete_action_matches,
          'deleteRule', foreign_key_status.actual_delete_rule
        )
        order by foreign_key_status.check_name
      )
      from foreign_key_status
    ),
    'paymentsServiceRequestsForeignKey',
      (
        select foreign_key_exists
        from foreign_key_status
        where check_name = 'paymentsServiceRequest'
      ),
    'providerMatchIndex',
      jsonb_build_object(
        'exists', (select index_exists from provider_match_index),
        'name', (select index_name from provider_match_index)
      ),
    'notificationsRealtimePublication',
      (select publication_enabled from realtime_publication),
    'serviceRequestStatusConstraint',
      (select constraint_exists from status_constraint)
  );
$$;

revoke all on function public.backend_health_catalog() from public;
revoke all on function public.backend_health_catalog() from anon;
revoke all on function public.backend_health_catalog() from authenticated;
grant execute on function public.backend_health_catalog() to service_role;

comment on function public.backend_health_catalog() is
  'Service-role-only metadata snapshot used by local and CI backend health checks.';
