-- Optional private identity/qualification documents for provider applications.

alter table public.provider_applications
  add column if not exists verification_document_path text,
  add column if not exists verification_document_url text;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'provider-verification-documents',
  'provider-verification-documents',
  false,
  5242880,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

drop policy if exists provider_verification_documents_select_owner_or_admin on storage.objects;
create policy provider_verification_documents_select_owner_or_admin
on storage.objects
for select
to authenticated
using (
  bucket_id = 'provider-verification-documents'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.current_user_is_admin()
  )
);

drop policy if exists provider_verification_documents_insert_own_path on storage.objects;
create policy provider_verification_documents_insert_own_path
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'provider-verification-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

comment on column public.provider_applications.verification_document_path is
  'Private Storage object path for an optional provider identity or qualification document.';

comment on column public.provider_applications.verification_document_url is
  'Reserved URL field for optional provider verification documents. Private documents are displayed with short-lived signed URLs.';
