-- True TAG-style emergency request fields.
-- Non-destructive: only adds nullable/defaulted columns, checks, and indexes.

alter table public.service_requests
  add column if not exists offered_price numeric(10, 2),
  add column if not exists accepted_provider_id uuid references public.providers(id) on delete set null,
  add column if not exists emergency_status text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'service_requests_offered_price_check'
      and conrelid = 'public.service_requests'::regclass
  ) then
    alter table public.service_requests
      add constraint service_requests_offered_price_check
      check (offered_price is null or offered_price >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'service_requests_emergency_status_check'
      and conrelid = 'public.service_requests'::regclass
  ) then
    alter table public.service_requests
      add constraint service_requests_emergency_status_check
      check (
        emergency_status is null
        or emergency_status in ('pending', 'accepted', 'on_the_way', 'completed', 'cancelled')
      );
  end if;
end;
$$;

create index if not exists service_requests_offered_price_idx
  on public.service_requests (offered_price);

create index if not exists service_requests_emergency_status_idx
  on public.service_requests (emergency_status);

create index if not exists service_requests_accepted_provider_id_idx
  on public.service_requests (accepted_provider_id);
