-- Provider work gallery images and public storage bucket.

create table if not exists public.provider_gallery_images (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null
    references public.providers(id)
    on delete cascade,
  storage_path text not null,
  public_url text not null,
  caption text,
  display_order smallint not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.provider_gallery_images is
  'Stores public work gallery images uploaded by Fuwu providers.';

create or replace function public.check_gallery_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    select count(*)
    from public.provider_gallery_images
    where provider_id = new.provider_id
  ) >= 12 then
    raise exception 'gallery_limit_exceeded'
      using hint = 'En fazla 12 is gorseli yukleyebilirsiniz.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_gallery_limit on public.provider_gallery_images;
create trigger trg_gallery_limit
  before insert on public.provider_gallery_images
  for each row execute function public.check_gallery_limit();

create index if not exists idx_provider_gallery_provider_order
  on public.provider_gallery_images(provider_id, display_order);

alter table public.provider_gallery_images
  enable row level security;

drop policy if exists gallery_public_read on public.provider_gallery_images;
create policy gallery_public_read
on public.provider_gallery_images
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.providers p
    where p.id = provider_id
      and p.is_active = true
      and p.is_approved = true
  )
);

drop policy if exists gallery_provider_read on public.provider_gallery_images;
create policy gallery_provider_read
on public.provider_gallery_images
for select
to authenticated
using (
  exists (
    select 1
    from public.providers p
    where p.id = provider_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists gallery_provider_insert on public.provider_gallery_images;
create policy gallery_provider_insert
on public.provider_gallery_images
for insert
to authenticated
with check (
  exists (
    select 1
    from public.providers p
    where p.id = provider_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists gallery_provider_delete on public.provider_gallery_images;
create policy gallery_provider_delete
on public.provider_gallery_images
for delete
to authenticated
using (
  exists (
    select 1
    from public.providers p
    where p.id = provider_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists gallery_admin_all on public.provider_gallery_images;
create policy gallery_admin_all
on public.provider_gallery_images
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'provider-gallery',
  'provider-gallery',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists gallery_storage_public_read on storage.objects;
create policy gallery_storage_public_read
on storage.objects
for select
to public
using (bucket_id = 'provider-gallery');

drop policy if exists gallery_storage_provider_upload on storage.objects;
create policy gallery_storage_provider_upload
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'provider-gallery'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists gallery_storage_provider_delete on storage.objects;
create policy gallery_storage_provider_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'provider-gallery'
  and auth.uid()::text = (storage.foldername(name))[1]
);
