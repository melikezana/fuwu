-- Provider trust layer and reputation fields.
-- Safe and additive: existing provider records keep publishing behavior unchanged.

alter table if exists public.providers
  add column if not exists working_hours text not null default '09:00-18:00',
  add column if not exists is_verified boolean not null default false,
  add column if not exists phone_verified boolean not null default false,
  add column if not exists identity_verified boolean not null default false,
  add column if not exists last_active_at timestamptz,
  add column if not exists response_time_minutes integer,
  add column if not exists profile_completion_score integer,
  add column if not exists profile_image_url text;

alter table if exists public.providers
  drop constraint if exists providers_working_hours_check;

alter table if exists public.providers
  add constraint providers_working_hours_check
    check (working_hours in ('09:00-18:00', '09:00-22:00', '7/24'));

alter table if exists public.providers
  drop constraint if exists providers_response_time_minutes_check;

alter table if exists public.providers
  add constraint providers_response_time_minutes_check
    check (response_time_minutes is null or response_time_minutes between 1 and 1440);

alter table if exists public.providers
  drop constraint if exists providers_profile_completion_score_check;

alter table if exists public.providers
  add constraint providers_profile_completion_score_check
    check (profile_completion_score is null or profile_completion_score between 0 and 100);

create index if not exists providers_trust_flags_idx
  on public.providers (is_verified, phone_verified, identity_verified);

create index if not exists providers_last_active_at_idx
  on public.providers (last_active_at desc);

create index if not exists providers_response_time_minutes_idx
  on public.providers (response_time_minutes);

comment on column public.providers.working_hours is
  'Provider working-hours window used to derive public availability messaging.';

comment on column public.providers.is_verified is
  'Whether the provider has been verified by Fuwu for the public trust badge.';

comment on column public.providers.phone_verified is
  'Whether the provider phone number has been verified.';

comment on column public.providers.identity_verified is
  'Whether identity verification has been completed for the provider.';

comment on column public.providers.last_active_at is
  'Most recent provider activity timestamp used for the Son 24 Saatte Aktif badge.';

comment on column public.providers.response_time_minutes is
  'Average provider response time in minutes, shown only when available.';

comment on column public.providers.profile_completion_score is
  'Optional stored profile completion score; frontend recomputes when profile fields change.';

comment on column public.providers.profile_image_url is
  'Public profile image URL for provider reputation and profile completion.';
