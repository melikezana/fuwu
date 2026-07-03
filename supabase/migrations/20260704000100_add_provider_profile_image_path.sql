-- Store the owned storage path for provider profile images.
-- Public rendering keeps using profile_image_url; the path enables future cleanup.

alter table if exists public.providers
  add column if not exists profile_image_path text;

comment on column public.providers.profile_image_path is
  'Storage object path for the provider profile image in the provider-images bucket.';
