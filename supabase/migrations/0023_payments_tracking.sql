-- MVP payment tracking for completed service requests.
-- This does not process online payments; it stores manual confirmation state.

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  amount numeric(10, 2),
  payment_method text not null default 'cash',
  status text not null default 'pending_confirmation',
  confirmed_at timestamptz,
  confirmed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint payments_request_id_unique unique (request_id),
  constraint payments_amount_check check (amount is null or amount >= 0),
  constraint payments_payment_method_check
    check (payment_method in ('cash', 'iban', 'online_soon')),
  constraint payments_status_check
    check (status in ('pending_confirmation', 'confirmed'))
);

create index if not exists payments_request_id_idx
  on public.payments (request_id);

create index if not exists payments_status_idx
  on public.payments (status);

create index if not exists payments_confirmed_by_idx
  on public.payments (confirmed_by);

alter table public.payments enable row level security;

drop policy if exists payments_select_own_customer on public.payments;
create policy payments_select_own_customer
on public.payments
for select
to authenticated
using (
  exists (
    select 1
    from public.service_requests
    where service_requests.id = payments.request_id
      and service_requests.user_id = auth.uid()
  )
);

drop policy if exists payments_select_admin_all on public.payments;
create policy payments_select_admin_all
on public.payments
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists payments_insert_admin_or_assigned_provider on public.payments;
create policy payments_insert_admin_or_assigned_provider
on public.payments
for insert
to authenticated
with check (
  public.current_user_is_admin()
  or exists (
    select 1
    from public.service_requests
    join public.providers
      on providers.id = service_requests.assigned_provider_id
    where service_requests.id = payments.request_id
      and providers.user_id = auth.uid()
  )
);

drop policy if exists payments_update_admin_confirmation on public.payments;
create policy payments_update_admin_confirmation
on public.payments
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'payments_set_updated_at'
      and tgrelid = 'public.payments'::regclass
  ) then
    create trigger payments_set_updated_at
      before update on public.payments
      for each row
      execute function public.set_updated_at();
  end if;
end $$;
