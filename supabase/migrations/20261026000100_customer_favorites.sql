-- Additive: customer-owned saved providers. No service/order/payment changes.
begin;
create table public.customer_favorite_providers (
  customer_id uuid not null references public.profiles(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, provider_id)
);
create index customer_favorite_providers_provider_idx on public.customer_favorite_providers(provider_id);
alter table public.customer_favorite_providers enable row level security;
revoke all on public.customer_favorite_providers from anon, authenticated;
grant select, insert, delete on public.customer_favorite_providers to authenticated;
grant all on public.customer_favorite_providers to service_role;
create policy favorites_read_own on public.customer_favorite_providers
  for select to authenticated using (customer_id = (select auth.uid()));
create policy favorites_insert_own on public.customer_favorite_providers
  for insert to authenticated with check (
    customer_id = (select auth.uid()) and exists (
      select 1 from public.providers p where p.id = provider_id and p.is_active and p.is_approved
    )
  );
create policy favorites_delete_own on public.customer_favorite_providers
  for delete to authenticated using (customer_id = (select auth.uid()));
commit;
