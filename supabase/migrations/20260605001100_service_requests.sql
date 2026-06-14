 ============================================================
-- Migration: service_requests ve provider_applications tabloları
-- Dosya: supabase/migrations/20260605_service_requests.sql
-- ============================================================

-- ── service_requests ──────────────────────────────────────────
create table if not exists public.service_requests (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete cascade not null,
  category            text not null,
  district            text not null,
  description         text not null,
  budget              text,
  preferred_date      date,
  preferred_time      text,
  phone               text not null,
  contact_preference  text not null default 'both',
  status              text not null default 'pending'
                        check (status in ('pending', 'active', 'completed', 'cancelled')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- RLS
alter table public.service_requests enable row level security;

-- Kullanıcı kendi taleplerini okuyabilir
create policy "Users can read own requests"
  on public.service_requests for select
  using (auth.uid() = user_id);

-- Kullanıcı kendi taleplerini oluşturabilir
create policy "Users can insert own requests"
  on public.service_requests for insert
  with check (auth.uid() = user_id);

-- Kullanıcı kendi taleplerini güncelleyebilir (iptal vb.)
create policy "Users can update own requests"
  on public.service_requests for update
  using (auth.uid() = user_id);

-- ── provider_applications ─────────────────────────────────────
create table if not exists public.provider_applications (
  id                uuid primary key default gen_random_uuid(),
  full_name         text not null,
  category          text not null,
  districts         text[] not null default '{}',
  experience_years  text,
  availability      text,
  has_equipment     boolean default false,
  portfolio_url     text,
  description       text,
  phone             text not null,
  whatsapp          text,
  status            text not null default 'pending'
                      check (status in ('pending', 'approved', 'rejected')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- RLS — başvurular herkese açık insert; okuma sadece admin
alter table public.provider_applications enable row level security;

-- Anonim + giriş yapmış herkes başvurabilir
create policy "Anyone can apply as provider"
  on public.provider_applications for insert
  with check (true);

-- Okuma sadece service_role (admin) yapabilir; normal kullanıcı okuyamaz
-- (Eğer usta kendi başvurusunu görmek isterse phone eşleşmesiyle yapılabilir)

-- ── Trigger: updated_at otomatik güncelle ─────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger service_requests_updated_at
  before update on public.service_requests
  for each row execute function public.set_updated_at();

create trigger provider_applications_updated_at
  before update on public.provider_applications
  for each row execute function public.set_updated_at();
