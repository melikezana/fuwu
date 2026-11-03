-- FUWU güvenlik sertleştirmesi (sızma testi bulguları). Tekrar çalıştırmak güvenlidir.
-- Mevcut tablo, veri ve iş akışlarını değiştirmez; yalnızca erişimi daraltır.
begin;

-- Bulgu 1: Usta telefon ve WhatsApp numaraları giriş yapmamış herkes tarafından API ile
-- toplanabiliyordu (numara kazıma, spam, rakiplerin ustaları toplaması, platform dışı anlaşma).
-- Herkese açık sayfalar bu alanları göstermiyor; giriş yapmış taraflar etkilenmez.
revoke select (phone, whatsapp) on public.providers from anon;

-- Bulgu 2: Herkese açık görsel klasörlerine (profil ve galeri) usta olmayan her hesap
-- doğrudan dosya yükleyebiliyordu (ücretsiz dosya barındırma, kötüye kullanım, depolama maliyeti).
-- Yükleme artık yalnızca usta kaydı olan hesaplara ve admine açık.
create or replace function public.current_user_has_provider()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    exists(select 1 from public.providers where user_id = auth.uid())
    or public.current_user_is_admin()
  );
$$;
revoke all on function public.current_user_has_provider() from public, anon, authenticated;
grant execute on function public.current_user_has_provider() to authenticated;

drop policy if exists provider_images_insert_own_path on storage.objects;
create policy provider_images_insert_own_path
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'provider-images'
  and auth.uid()::text = (storage.foldername(name))[1]
  and public.current_user_has_provider()
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
  and public.current_user_has_provider()
);

drop policy if exists gallery_storage_provider_upload on storage.objects;
create policy gallery_storage_provider_upload
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'provider-gallery'
  and auth.uid()::text = (storage.foldername(name))[1]
  and public.current_user_has_provider()
);

-- Bulgu 3 (SMS pompalama / toll fraud): SMS kodu isteği tarayıcıdan doğrudan Supabase'e gider;
-- sitedeki +90 5XX kontrolü atlatılabilir. Saldırganlar pahalı yurt dışı numaralara kod
-- isteterek SMS faturası şişirir. Bu kanca yeni hesabı yalnızca Türkiye cep numarasıyla açtırır.
-- Etkinleştirme: Supabase Dashboard > Authentication > Hooks > Before User Created.
create or replace function public.hook_fuwu_before_user_created(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  phone text := coalesce(event->'user'->>'phone', '');
begin
  if phone <> '' and phone !~ '^\+?905[0-9]{9}$' then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403,
      'message', 'SMS ile giriş yalnızca Türkiye cep telefonu numaralarıyla yapılabilir.'
    ));
  end if;
  return '{}'::jsonb;
end
$$;
revoke all on function public.hook_fuwu_before_user_created(jsonb) from public, anon, authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function public.hook_fuwu_before_user_created(jsonb) to supabase_auth_admin;
  end if;
end
$$;

commit;
