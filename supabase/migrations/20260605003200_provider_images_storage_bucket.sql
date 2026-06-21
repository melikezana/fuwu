-- Public provider profile images with owner-scoped write access.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'provider-images',
  'provider-images',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists provider_images_public_read on storage.objects;
create policy provider_images_public_read
on storage.objects
for select
to public
using (bucket_id = 'provider-images');

drop policy if exists provider_images_insert_own_path on storage.objects;
create policy provider_images_insert_own_path
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'provider-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists provider_images_update_own_path on storage.objects;
create policy provider_images_update_own_path
on storage.objects
for update
to authenticated
using (
  bucket_id = 'provider-images'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'provider-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists provider_images_delete_own_path on storage.objects;
create policy provider_images_delete_own_path
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'provider-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);
