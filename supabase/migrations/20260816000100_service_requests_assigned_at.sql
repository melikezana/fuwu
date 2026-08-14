-- Track when a provider assignment starts so emergency response SLA can be monitored.

alter table public.service_requests
  add column if not exists assigned_at timestamptz;

update public.service_requests
set assigned_at = coalesce(updated_at, created_at)
where assigned_at is null
  and assigned_provider_id is not null;

create index if not exists service_requests_assigned_at_idx
  on public.service_requests (assigned_at desc);

create index if not exists service_requests_emergency_assigned_sla_idx
  on public.service_requests (assigned_at)
  where urgency_type = 'emergency'
    and status = 'assigned'
    and assigned_at is not null;

comment on column public.service_requests.assigned_at is
  'Timestamp when a provider assignment began; used for emergency response SLA visibility.';
