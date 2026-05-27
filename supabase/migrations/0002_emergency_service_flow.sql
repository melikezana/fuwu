-- Emergency service request flow fields.
-- Non-destructive: only adds nullable/defaulted columns, indexes, and expanded checks.

alter table public.service_requests
  add column if not exists urgency_type text not null default 'standard',
  add column if not exists budget_tag text,
  add column if not exists payment_preference text,
  add column if not exists confirmation_code text,
  add column if not exists estimated_arrival_text text,
  add column if not exists approximate_location text,
  add column if not exists accepted_at timestamptz;

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
      'on_the_way',
      'completed',
      'cancelled'
    )
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'service_requests_urgency_type_check'
      and conrelid = 'public.service_requests'::regclass
  ) then
    alter table public.service_requests
      add constraint service_requests_urgency_type_check
      check (urgency_type in ('standard', 'emergency'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'service_requests_budget_tag_check'
      and conrelid = 'public.service_requests'::regclass
  ) then
    alter table public.service_requests
      add constraint service_requests_budget_tag_check
      check (
        budget_tag is null
        or budget_tag in ('ekonomik', 'standart', 'premium', 'acil-hizmet')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'service_requests_payment_preference_check'
      and conrelid = 'public.service_requests'::regclass
  ) then
    alter table public.service_requests
      add constraint service_requests_payment_preference_check
      check (
        payment_preference is null
        or payment_preference in ('cash', 'iban', 'online_soon')
      );
  end if;
end;
$$;

create index if not exists service_requests_urgency_type_idx
  on public.service_requests (urgency_type);

create index if not exists service_requests_budget_tag_idx
  on public.service_requests (budget_tag);

create index if not exists service_requests_payment_preference_idx
  on public.service_requests (payment_preference);

create index if not exists service_requests_accepted_at_idx
  on public.service_requests (accepted_at desc);
