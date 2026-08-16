-- Repair production schemas that received the reassignment log table before
-- the dry-run and metadata columns were added.

alter table public.request_reassignment_log
  add column if not exists is_dry_run boolean not null default false;

alter table public.request_reassignment_log
  add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.request_reassignment_log
set is_dry_run = true
where reason in ('sla_breach_dry_run', 'no_eligible_provider_dry_run')
  and is_dry_run = false;

alter table public.request_reassignment_log
  drop constraint if exists request_reassignment_log_reason_check;

alter table public.request_reassignment_log
  add constraint request_reassignment_log_reason_check
  check (
    reason in (
      'sla_breach_dry_run',
      'no_eligible_provider_dry_run',
      'sla_breach_reassigned',
      'no_eligible_provider',
      'max_reassignment_limit_reached'
    )
  );

create index if not exists request_reassignment_log_request_created_idx
  on public.request_reassignment_log (request_id, created_at desc);

create index if not exists request_reassignment_log_created_idx
  on public.request_reassignment_log (created_at desc);

create index if not exists request_reassignment_log_new_provider_idx
  on public.request_reassignment_log (new_provider_id)
  where new_provider_id is not null;

alter table public.request_reassignment_log enable row level security;

drop policy if exists request_reassignment_log_select_admin
  on public.request_reassignment_log;

create policy request_reassignment_log_select_admin
on public.request_reassignment_log
for select
to authenticated
using (public.current_user_is_admin());

grant select on table public.request_reassignment_log to authenticated;
grant all privileges on table public.request_reassignment_log to service_role;

comment on table public.request_reassignment_log is
  'Dry-run and live automatic reassignment decisions for emergency SLA breaches.';

comment on column public.request_reassignment_log.previous_provider_id is
  'Provider assigned when the SLA breach was detected.';

comment on column public.request_reassignment_log.new_provider_id is
  'Provider selected for reassignment; null when no eligible provider exists or manual escalation is required.';

comment on column public.request_reassignment_log.is_dry_run is
  'Marks recommendations written during dry-run mode so live reassignment counts can ignore them.';
