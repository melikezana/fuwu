-- Safe integrity hardening for existing Fuwu Supabase databases.
-- Uses additive checks and semantic status mapping; it does not delete rows.

begin;

alter table public.provider_applications
  drop constraint if exists provider_applications_status_check;

alter table public.provider_applications
  add constraint provider_applications_status_check
  check (status in ('pending', 'approved', 'rejected'))
  not valid;

alter table public.service_requests
  drop constraint if exists service_requests_status_check;

update public.service_requests
set status = case status
  when 'open' then 'yeni'
  when 'in_progress' then 'inceleniyor'
  when 'matched' then 'ustaya_yonlendirildi'
  when 'completed' then 'tamamlandi'
  when 'cancelled' then 'iptal'
  else status
end
where status in ('open', 'in_progress', 'matched', 'completed', 'cancelled');

alter table public.service_requests
  alter column status set default 'yeni';

alter table public.service_requests
  add constraint service_requests_status_check
  check (status in ('yeni', 'inceleniyor', 'ustaya_yonlendirildi', 'tamamlandi', 'iptal'))
  not valid;

alter table public.reviews
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.reviews
  drop constraint if exists reviews_rating_check;

alter table public.reviews
  add constraint reviews_rating_check
  check (rating between 1 and 5)
  not valid;

alter table public.profiles
  alter column created_at set default timezone('utc', now()),
  alter column updated_at set default timezone('utc', now());

alter table public.providers
  alter column created_at set default timezone('utc', now()),
  alter column updated_at set default timezone('utc', now()),
  alter column is_active set default true,
  alter column is_approved set default false;

alter table public.provider_applications
  alter column created_at set default timezone('utc', now()),
  alter column updated_at set default timezone('utc', now()),
  alter column status set default 'pending';

alter table public.service_requests
  alter column created_at set default timezone('utc', now()),
  alter column updated_at set default timezone('utc', now());

alter table public.reviews
  alter column created_at set default timezone('utc', now()),
  alter column updated_at set default timezone('utc', now());

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'providers_name_not_blank_check'
      and conrelid = 'public.providers'::regclass
  ) then
    alter table public.providers
      add constraint providers_name_not_blank_check
      check (btrim(name) <> '')
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'providers_phone_not_blank_check'
      and conrelid = 'public.providers'::regclass
  ) then
    alter table public.providers
      add constraint providers_phone_not_blank_check
      check (btrim(phone) <> '')
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'provider_applications_category_required_check'
      and conrelid = 'public.provider_applications'::regclass
  ) then
    alter table public.provider_applications
      add constraint provider_applications_category_required_check
      check (category_id is not null)
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'provider_applications_district_required_check'
      and conrelid = 'public.provider_applications'::regclass
  ) then
    alter table public.provider_applications
      add constraint provider_applications_district_required_check
      check (district_id is not null)
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'provider_applications_full_name_not_blank_check'
      and conrelid = 'public.provider_applications'::regclass
  ) then
    alter table public.provider_applications
      add constraint provider_applications_full_name_not_blank_check
      check (btrim(full_name) <> '')
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'provider_applications_phone_not_blank_check'
      and conrelid = 'public.provider_applications'::regclass
  ) then
    alter table public.provider_applications
      add constraint provider_applications_phone_not_blank_check
      check (btrim(phone) <> '')
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'service_requests_address_not_blank_check'
      and conrelid = 'public.service_requests'::regclass
  ) then
    alter table public.service_requests
      add constraint service_requests_address_not_blank_check
      check (btrim(address) <> '')
      not valid;
  end if;
end;
$$;

commit;
