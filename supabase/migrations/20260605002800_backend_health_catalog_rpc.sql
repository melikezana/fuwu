-- Service-role-only catalog snapshot for local/CI backend health checks.
-- The Node check uses Supabase RPC rather than brittle file-pattern checks.

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
  payments_fk as (
    select exists (
      select 1
      from pg_catalog.pg_constraint as constraint_info
      join pg_catalog.pg_class as source_table
        on source_table.oid = constraint_info.conrelid
      join pg_catalog.pg_namespace as source_namespace
        on source_namespace.oid = source_table.relnamespace
      join pg_catalog.pg_class as target_table
        on target_table.oid = constraint_info.confrelid
      join pg_catalog.pg_namespace as target_namespace
        on target_namespace.oid = target_table.relnamespace
      join unnest(constraint_info.conkey) with ordinality as source_key(attnum, ord)
        on true
      join unnest(constraint_info.confkey) with ordinality as target_key(attnum, ord)
        on target_key.ord = source_key.ord
      join pg_catalog.pg_attribute as source_column
        on source_column.attrelid = constraint_info.conrelid
       and source_column.attnum = source_key.attnum
      join pg_catalog.pg_attribute as target_column
        on target_column.attrelid = constraint_info.confrelid
       and target_column.attnum = target_key.attnum
      where constraint_info.contype = 'f'
        and source_namespace.nspname = 'public'
        and source_table.relname = 'payments'
        and source_column.attname = 'request_id'
        and target_namespace.nspname = 'public'
        and target_table.relname = 'service_requests'
        and target_column.attname = 'id'
    ) as fk_exists
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
    'paymentsServiceRequestsForeignKey', (select fk_exists from payments_fk)
  );
$$;

revoke all on function public.backend_health_catalog() from public;
revoke all on function public.backend_health_catalog() from anon;
revoke all on function public.backend_health_catalog() from authenticated;
grant execute on function public.backend_health_catalog() to service_role;

comment on function public.backend_health_catalog() is
  'Service-role-only metadata snapshot used by local and CI backend health checks.';
