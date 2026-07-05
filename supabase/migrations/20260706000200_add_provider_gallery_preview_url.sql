-- Cached provider gallery preview URL for featured marketplace cards.

alter table if exists public.providers
  add column if not exists gallery_preview_url text;

comment on column public.providers.gallery_preview_url is
  'Public URL of the first provider gallery image, used as a marketplace card fallback when no profile image exists.';

update public.providers provider
set gallery_preview_url = first_gallery.public_url
from (
  select distinct on (provider_id)
    provider_id,
    public_url
  from public.provider_gallery_images
  order by provider_id, display_order asc, created_at asc
) as first_gallery
where provider.id = first_gallery.provider_id
  and provider.gallery_preview_url is null;
