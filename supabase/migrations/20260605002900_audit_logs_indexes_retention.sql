-- Audit log query support and retention helper.
-- Critical security actions are retained indefinitely; routine events older than
-- 90 days can be removed by calling public.cleanup_old_audit_logs().

create index if not exists audit_logs_created_at_desc_idx
  on public.audit_logs (created_at desc);

create index if not exists audit_logs_entity_type_entity_id_idx
  on public.audit_logs (entity_type, entity_id);

create index if not exists audit_logs_action_idx
  on public.audit_logs (action);

create or replace function public.cleanup_old_audit_logs()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer := 0;
begin
  delete from public.audit_logs
  where created_at < timezone('utc', now()) - interval '90 days'
    and action not like 'security.%';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.cleanup_old_audit_logs() from public;
revoke all on function public.cleanup_old_audit_logs() from anon;
revoke all on function public.cleanup_old_audit_logs() from authenticated;
grant execute on function public.cleanup_old_audit_logs() to service_role;

comment on function public.cleanup_old_audit_logs() is
  'Deletes non-security audit logs older than 90 days. security.* actions are retained indefinitely.';
