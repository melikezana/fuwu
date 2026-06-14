-- Fuwu Supabase database schema
-- This file defines the backend tables only. It does not run migrations,
-- seed data, configure keys, or connect the frontend to Supabase.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'customer')
  on conflict (id) do nothing;

  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'customer',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint profiles_role_check
    check (role in ('customer', 'provider', 'admin')),
  constraint profiles_full_name_not_blank_check
    check (full_name is null or btrim(full_name) <> ''),
  constraint profiles_phone_not_blank_check
    check (phone is null or btrim(phone) <> '')
);

comment on table public.profiles is
  'Stores public Fuwu user profile details linked to Supabase Auth users.';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint service_categories_name_unique unique (name),
  constraint service_categories_slug_unique unique (slug),
  constraint service_categories_name_not_blank_check
    check (btrim(name) <> ''),
  constraint service_categories_slug_not_blank_check
    check (btrim(slug) <> '')
);

comment on table public.service_categories is
  'Stores the service categories customers can request and providers can offer.';

create table if not exists public.districts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  city text not null default 'Istanbul',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint districts_city_name_unique unique (city, name),
  constraint districts_slug_unique unique (slug),
  constraint districts_name_not_blank_check
    check (btrim(name) <> ''),
  constraint districts_slug_not_blank_check
    check (btrim(slug) <> ''),
  constraint districts_city_not_blank_check
    check (btrim(city) <> '')
);

comment on table public.districts is
  'Stores supported Fuwu service districts for provider coverage and customer requests.';

create table if not exists public.providers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  category_id uuid not null references public.service_categories(id) on delete restrict,
  district_id uuid not null references public.districts(id) on delete restrict,
  phone text not null,
  whatsapp text,
  description text,
  experience_years integer not null default 0,
  average_price_min numeric(10, 2),
  average_price_max numeric(10, 2),
  rating numeric(2, 1) not null default 0,
  availability text not null default 'müsait',
  working_hours text not null default '09:00-18:00',
  is_verified boolean not null default false,
  phone_verified boolean not null default false,
  identity_verified boolean not null default false,
  last_active_at timestamptz,
  response_time_minutes integer,
  profile_completion_score integer,
  profile_image_url text,
  is_active boolean not null default true,
  is_approved boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint providers_experience_years_check
    check (experience_years >= 0),
  constraint providers_average_price_min_check
    check (average_price_min is null or average_price_min >= 0),
  constraint providers_average_price_max_check
    check (average_price_max is null or average_price_max >= 0),
  constraint providers_average_price_range_check
    check (
      average_price_min is null
      or average_price_max is null
      or average_price_max >= average_price_min
    ),
  constraint providers_rating_check
    check (rating >= 0 and rating <= 5),
  constraint providers_availability_check
    check (availability in ('müsait', 'yoğun', 'çevrimdışı')),
  constraint providers_working_hours_check
    check (working_hours in ('09:00-18:00', '09:00-22:00', '7/24')),
  constraint providers_response_time_minutes_check
    check (response_time_minutes is null or response_time_minutes between 1 and 1440),
  constraint providers_profile_completion_score_check
    check (profile_completion_score is null or profile_completion_score between 0 and 100),
  constraint providers_name_not_blank_check
    check (btrim(name) <> ''),
  constraint providers_phone_not_blank_check
    check (btrim(phone) <> '')
);

comment on table public.providers is
  'Stores approved and pending Fuwu service provider profiles shown to customers.';

create table if not exists public.provider_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  phone text not null,
  category_id uuid not null references public.service_categories(id) on delete restrict,
  district_id uuid not null references public.districts(id) on delete restrict,
  experience_years integer not null default 0,
  availability text,
  has_equipment boolean not null default false,
  introduction text,
  portfolio_url text,
  profile_image_path text,
  profile_image_url text,
  status text not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint provider_applications_experience_years_check
    check (experience_years >= 0),
  constraint provider_applications_status_check
    check (status in ('pending', 'approved', 'rejected')),
  constraint provider_applications_full_name_not_blank_check
    check (btrim(full_name) <> ''),
  constraint provider_applications_phone_not_blank_check
    check (btrim(phone) <> '')
);

comment on table public.provider_applications is
  'Stores provider signup applications before they become active provider records.';

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.service_categories(id) on delete restrict,
  district_id uuid not null references public.districts(id) on delete restrict,
  address text not null,
  urgency text not null default 'normal',
  urgency_type text not null default 'standard',
  budget text,
  budget_tag text,
  offered_price numeric(10, 2),
  payment_method text,
  payment_preference text,
  confirmation_code text,
  estimated_arrival_text text,
  approximate_location text,
  emergency_status text,
  preferred_date date,
  preferred_time time,
  description text,
  status text not null default 'pending',
  assigned_provider_id uuid references public.providers(id) on delete set null,
  accepted_provider_id uuid references public.providers(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint service_requests_urgency_check
    check (urgency in ('low', 'normal', 'high', 'urgent')),
  constraint service_requests_urgency_type_check
    check (urgency_type in ('standard', 'emergency')),
  constraint service_requests_budget_tag_check
    check (budget_tag is null or budget_tag in ('ekonomik', 'standart', 'premium', 'acil-hizmet')),
  constraint service_requests_offered_price_check
    check (offered_price is null or offered_price >= 0),
  constraint service_requests_payment_preference_check
    check (payment_preference is null or payment_preference in ('cash', 'iban', 'online_soon')),
  constraint service_requests_payment_method_check
    check (payment_method is null or payment_method in ('cash', 'iban', 'online_soon')),
  constraint service_requests_emergency_status_check
    check (
      emergency_status is null
      or emergency_status in ('pending', 'accepted', 'rejected', 'on_the_way', 'completed', 'cancelled')
    ),
  constraint service_requests_status_check
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
    ),
  constraint service_requests_address_not_blank_check
    check (btrim(address) <> '')
);

comment on table public.service_requests is
  'Stores customer service requests submitted through Fuwu.';

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null,
  comment text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint reviews_rating_check
    check (rating between 1 and 5),
  constraint reviews_provider_user_unique
    unique (provider_id, user_id)
);

comment on table public.reviews is
  'Stores customer ratings and comments for Fuwu providers.';

create index if not exists profiles_role_idx
  on public.profiles (role);

create index if not exists profiles_phone_idx
  on public.profiles (phone);

create index if not exists service_categories_is_active_idx
  on public.service_categories (is_active);

create index if not exists districts_city_name_idx
  on public.districts (city, name);

create index if not exists districts_is_active_idx
  on public.districts (is_active);

create unique index if not exists providers_user_id_unique_idx
  on public.providers (user_id)
  where user_id is not null;

create index if not exists providers_category_id_idx
  on public.providers (category_id);

create index if not exists providers_district_id_idx
  on public.providers (district_id);

create index if not exists providers_category_district_idx
  on public.providers (category_id, district_id);

create index if not exists providers_active_approved_idx
  on public.providers (is_active, is_approved);

create index if not exists providers_rating_idx
  on public.providers (rating desc);

create index if not exists providers_availability_idx
  on public.providers (availability);

create index if not exists providers_trust_flags_idx
  on public.providers (is_verified, phone_verified, identity_verified);

create index if not exists providers_last_active_at_idx
  on public.providers (last_active_at desc);

create index if not exists providers_response_time_minutes_idx
  on public.providers (response_time_minutes);

create index if not exists provider_applications_status_idx
  on public.provider_applications (status);

create index if not exists provider_applications_phone_idx
  on public.provider_applications (phone);

create index if not exists provider_applications_user_id_idx
  on public.provider_applications (user_id);

create unique index if not exists provider_applications_pending_phone_unique_idx
  on public.provider_applications (phone)
  where status = 'pending';

create index if not exists provider_applications_category_id_idx
  on public.provider_applications (category_id);

create index if not exists provider_applications_district_id_idx
  on public.provider_applications (district_id);

create index if not exists provider_applications_created_at_idx
  on public.provider_applications (created_at desc);

create index if not exists service_requests_user_id_idx
  on public.service_requests (user_id);

create index if not exists service_requests_category_id_idx
  on public.service_requests (category_id);

create index if not exists service_requests_district_id_idx
  on public.service_requests (district_id);

create index if not exists service_requests_status_idx
  on public.service_requests (status);

create index if not exists service_requests_urgency_idx
  on public.service_requests (urgency);

create index if not exists service_requests_urgency_type_idx
  on public.service_requests (urgency_type);

create index if not exists service_requests_budget_tag_idx
  on public.service_requests (budget_tag);

create index if not exists service_requests_budget_idx
  on public.service_requests (budget);

create index if not exists service_requests_offered_price_idx
  on public.service_requests (offered_price);

create index if not exists service_requests_payment_preference_idx
  on public.service_requests (payment_preference);

create index if not exists service_requests_payment_method_idx
  on public.service_requests (payment_method);

create index if not exists service_requests_emergency_status_idx
  on public.service_requests (emergency_status);

create index if not exists service_requests_assigned_provider_id_idx
  on public.service_requests (assigned_provider_id);

create index if not exists service_requests_accepted_provider_id_idx
  on public.service_requests (accepted_provider_id);

create index if not exists service_requests_category_district_status_idx
  on public.service_requests (category_id, district_id, status);

create index if not exists service_requests_created_at_idx
  on public.service_requests (created_at desc);

create index if not exists service_requests_accepted_at_idx
  on public.service_requests (accepted_at desc);

create index if not exists reviews_provider_id_idx
  on public.reviews (provider_id);

create index if not exists reviews_user_id_idx
  on public.reviews (user_id);

create index if not exists reviews_provider_created_at_idx
  on public.reviews (provider_id, created_at desc);

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
    where tgname = 'service_categories_set_updated_at'
      and tgrelid = 'public.service_categories'::regclass
  ) then
    create trigger service_categories_set_updated_at
      before update on public.service_categories
      for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'districts_set_updated_at'
      and tgrelid = 'public.districts'::regclass
  ) then
    create trigger districts_set_updated_at
      before update on public.districts
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
