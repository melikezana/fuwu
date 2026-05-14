# Supabase Storage Setup

Provider applications can optionally upload one profile image to Supabase Storage.

## Bucket

- Bucket name: `provider-images`
- Maximum file size: `3 MB`
- Allowed formats: `jpg`, `jpeg`, `png`, `webp`
- Recommended visibility: public, because approved provider profile images are intended to be shown on the public site later.

Create the bucket in the Supabase dashboard under Storage, or run:

```sql
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
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
```

## Application Table Columns

The app stores successful upload metadata on `provider_applications`.

```sql
alter table public.provider_applications
  add column if not exists profile_image_path text,
  add column if not exists profile_image_url text;
```

`profile_image_path` is the object path inside `provider-images`. `profile_image_url` is the public URL returned by Supabase for public buckets.

## Storage Policies

The provider application form uses the public anon client. Do not use or expose a service role key in the browser.

Allow public inserts only into this bucket and path prefix:

```sql
drop policy if exists provider_images_insert_public on storage.objects;
create policy provider_images_insert_public
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'provider-images'
  and name like 'provider-applications/%'
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);
```

If the bucket is private, add an authenticated/admin read path and use signed URLs instead of `profile_image_url`. With the recommended public bucket, Supabase can serve the stored public URL directly.

## Runtime Behavior

- The form validates image type and size in Turkish before submit.
- If the image upload succeeds, `profile_image_path` and `profile_image_url` are inserted with the provider application.
- If Supabase Storage or the bucket is not configured, the form continues and submits the application without an image.
- If the database columns are not deployed yet, the app retries the application insert without image metadata so the application is not lost.
