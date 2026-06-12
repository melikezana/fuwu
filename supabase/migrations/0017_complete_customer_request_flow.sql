-- Complete customer request flow alignment.
-- New customer requests start in pending, preserve explicit budget/payment
-- fields, and keep providers scoped to requests assigned to them.

alter table public.service_requests
  add column if not exists budget text,
  add column if not exists payment_method text;

alter table public.service_requests
  alter column status set default 'pending';

alter table public.service_requests
  drop constraint if exists service_requests_payment_method_check;

alter table public.service_requests
  add constraint service_requests_payment_method_check
  check (
    payment_method is null
    or payment_method in ('cash', 'iban', 'online_soon')
  );

update public.service_requests
set
  budget = coalesce(budget, budget_tag, offered_price::text),
  payment_method = coalesce(payment_method, payment_preference)
where budget is null
   or payment_method is null;

create index if not exists service_requests_budget_idx
  on public.service_requests (budget);

create index if not exists service_requests_payment_method_idx
  on public.service_requests (payment_method);

drop policy if exists service_requests_insert_authenticated_own on public.service_requests;
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

comment on policy service_requests_insert_authenticated_own on public.service_requests is
  'Authenticated customers can create only their own pending requests.';

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
      )
  )
);

comment on policy service_requests_select_provider_relevant on public.service_requests is
  'Approved providers can read only requests assigned or accepted by their provider record.';

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
  and status in ('accepted', 'completed', 'cancelled', 'tamamlandi', 'iptal')
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
  'Approved providers can accept, complete, or cancel standard requests assigned to them.';

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
      and providers.id = service_requests.accepted_provider_id
      and providers.category_id = service_requests.category_id
      and providers.district_id = service_requests.district_id
      and service_requests.status in ('accepted', 'on_the_way', 'completed', 'cancelled')
      and service_requests.emergency_status in ('accepted', 'on_the_way', 'completed', 'cancelled')
  )
);

comment on policy service_requests_update_provider_emergency_acceptance on public.service_requests is
  'Approved providers can accept and progress only emergency requests assigned to them.';
