-- RLS hardening for TAG-style emergency matching.
-- Preserves the schema while allowing authenticated customers to create
-- pending emergency requests and matched providers to accept their own jobs.

drop policy if exists service_requests_insert_authenticated_own on public.service_requests;
create policy service_requests_insert_authenticated_own
on public.service_requests
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    status = 'yeni'
    or (
      urgency_type = 'emergency'
      and status = 'pending'
      and emergency_status = 'pending'
      and assigned_provider_id is null
      and accepted_provider_id is null
    )
  )
);

comment on policy service_requests_insert_authenticated_own on public.service_requests is
  'Authenticated users can create standard requests in yeni or emergency requests in pending state for themselves.';

drop policy if exists service_requests_select_provider_relevant on public.service_requests;
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
        or (
          service_requests.urgency_type = 'emergency'
          and service_requests.status = 'pending'
          and service_requests.assigned_provider_id is null
          and providers.category_id = service_requests.category_id
          and providers.district_id = service_requests.district_id
        )
      )
  )
);

comment on policy service_requests_select_provider_relevant on public.service_requests is
  'Approved providers can read assigned requests and nearby open emergency requests matching their category and district.';

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
      and (
        providers.id = service_requests.assigned_provider_id
        or (
          service_requests.status = 'pending'
          and service_requests.assigned_provider_id is null
          and providers.district_id = service_requests.district_id
        )
      )
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
      and providers.id = service_requests.accepted_provider_id
      and providers.category_id = service_requests.category_id
      and providers.district_id = service_requests.district_id
      and service_requests.status in ('accepted', 'on_the_way', 'completed', 'cancelled')
      and service_requests.emergency_status in ('accepted', 'on_the_way', 'completed', 'cancelled')
  )
);

comment on policy service_requests_update_provider_emergency_acceptance on public.service_requests is
  'Approved providers can accept and progress only emergency requests that match their profile or are already assigned to them.';
