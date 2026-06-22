-- Allow a customer to confirm only the payment attached to their own
-- completed service request.

alter table public.payments enable row level security;

drop policy if exists payments_update_customer_confirmation
  on public.payments;

create policy payments_update_customer_confirmation
on public.payments
for update
to authenticated
using (
  status = 'pending_confirmation'
  and exists (
    select 1
    from public.service_requests request
    where request.id = payments.request_id
      and request.user_id = auth.uid()
      and request.status = 'completed'
  )
)
with check (
  status = 'confirmed'
  and confirmed_by = auth.uid()
  and confirmed_at is not null
  and exists (
    select 1
    from public.service_requests request
    where request.id = payments.request_id
      and request.user_id = auth.uid()
      and request.status = 'completed'
  )
);

revoke update on table public.payments from authenticated;
grant update (
  confirmed_at,
  confirmed_by,
  status,
  updated_at
)
on table public.payments
to authenticated;

comment on policy payments_update_customer_confirmation on public.payments is
  'Customers may confirm only pending payments for their own completed requests.';
