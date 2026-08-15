-- Audit trail for emergency SLA reassignment decisions and escalations.

create table if not exists public.request_reassignment_log (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null
    references public.service_requests(id)
    on delete cascade,
  previous_provider_id uuid
    references public.providers(id)
    on delete set null,
  new_provider_id uuid
    references public.providers(id)
    on delete set null,
  reason text not null,
  is_dry_run boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint request_reassignment_log_reason_check
    check (
      reason in (
        'sla_breach_dry_run',
        'no_eligible_provider_dry_run',
        'sla_breach_reassigned',
        'no_eligible_provider',
        'max_reassignment_limit_reached'
      )
    )
);

alter table public.request_reassignment_log
  add column if not exists is_dry_run boolean not null default false;

update public.request_reassignment_log
set is_dry_run = true
where reason in ('sla_breach_dry_run', 'no_eligible_provider_dry_run');

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
