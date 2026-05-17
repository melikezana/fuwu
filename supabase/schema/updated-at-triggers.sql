-- Safe updated_at trigger setup for important Fuwu tables.
-- This script is additive and can be run after the base schema on existing databases.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

alter table public.profiles
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.providers
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.provider_applications
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.service_requests
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.reviews
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'profiles_set_updated_at'
      and tgrelid = 'public.profiles'::regclass
  ) then
    create trigger profiles_set_updated_at
      before update on public.profiles
      for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'providers_set_updated_at'
      and tgrelid = 'public.providers'::regclass
  ) then
    create trigger providers_set_updated_at
      before update on public.providers
      for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'provider_applications_set_updated_at'
      and tgrelid = 'public.provider_applications'::regclass
  ) then
    create trigger provider_applications_set_updated_at
      before update on public.provider_applications
      for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'service_requests_set_updated_at'
      and tgrelid = 'public.service_requests'::regclass
  ) then
    create trigger service_requests_set_updated_at
      before update on public.service_requests
      for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'reviews_set_updated_at'
      and tgrelid = 'public.reviews'::regclass
  ) then
    create trigger reviews_set_updated_at
      before update on public.reviews
      for each row execute function public.set_updated_at();
  end if;
end;
$$;
