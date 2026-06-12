-- Provider accept/reject workflow for assigned service requests.
-- Keeps RLS enabled and adds rejected as a first-class lifecycle state.

alter table public.service_requests enable row level security;

alter table public.service_requests
  drop constraint if exists service_requests_emergency_status_check;

alter table public.service_requests
  add constraint service_requests_emergency_status_check
  check (
    emergency_status is null
    or emergency_status in ('pending', 'accepted', 'rejected', 'on_the_way', 'completed', 'cancelled')
  );

alter table public.service_requests
  drop constraint if exists service_requests_status_check;

alter table public.service_requests
  add constraint service_requests_status_check
  check (
    status in (
      'yeni',
      'inceleniyor',
      'ustaya_yonlendirildi',
      'tamamlandi',
      'iptal',
      'pending',
      'accepted',
      'rejected',
      'on_the_way',
      'completed',
      'cancelled'
    )
  );

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
  and status in ('accepted', 'rejected', 'completed', 'cancelled', 'tamamlandi', 'iptal')
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
  'Approved providers can accept, reject, complete, or cancel standard requests assigned to them.';

drop policy if exists service_requests_update_provider_emergency_acceptance on public.service_requests;
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
  and exists (
    select 1
    from public.providers
    where providers.user_id = auth.uid()
      and providers.is_active = true
      and providers.is_approved = true
      and providers.id = service_requests.assigned_provider_id
      and providers.category_id = service_requests.category_id
      and (
        (
          providers.id = service_requests.accepted_provider_id
          and service_requests.status in ('accepted', 'on_the_way', 'completed', 'cancelled')
          and service_requests.emergency_status in ('accepted', 'on_the_way', 'completed', 'cancelled')
        )
        or (
          service_requests.status = 'rejected'
          and service_requests.emergency_status = 'rejected'
          and service_requests.accepted_provider_id is null
        )
      )
  )
);

comment on policy service_requests_update_provider_emergency_acceptance on public.service_requests is
  'Approved providers can accept, reject, and progress only emergency requests assigned to them.';
