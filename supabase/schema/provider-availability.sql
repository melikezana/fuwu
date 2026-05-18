-- Adds operational availability to provider profiles.
-- Safe to run more than once; it does not require service-role keys in the frontend.

alter table if exists public.providers
  add column if not exists availability text not null default 'müsait';

alter table if exists public.providers
  drop constraint if exists providers_availability_check;

alter table if exists public.providers
  add constraint providers_availability_check
    check (availability in ('müsait', 'yoğun', 'çevrimdışı'));

create index if not exists providers_availability_idx
  on public.providers (availability);

comment on column public.providers.availability is
  'Operational provider availability shown publicly and managed by provider/admin flows.';
