-- Admin yönetim katmanı: yorum moderasyonu (silme) ve hizmet kataloğu yönetimi.
-- Geriye dönük uyumlu ve idempotent: tekrar çalıştırmak güvenlidir.

-- ------------------------------------------------------------------
-- TABLO YETKİLERİ (GRANT): authenticated rolüne yazma yetkisi.
-- Bu proje yetkileri açıkça veriyor; katalog tablolarına yazma eksikti.
-- Hangi satırın yazılabileceğini yine aşağıdaki RLS politikaları belirler.
-- ------------------------------------------------------------------
grant insert, update, delete
  on table public.service_categories, public.districts
  to authenticated;

-- ------------------------------------------------------------------
-- REVIEWS: admin silme (moderasyon)
-- ------------------------------------------------------------------
drop policy if exists reviews_delete_admin on public.reviews;
create policy reviews_delete_admin
  on public.reviews
  for delete
  to authenticated
  using (public.current_user_is_admin());

-- ------------------------------------------------------------------
-- SERVICE_CATEGORIES: admin tüm kayıtları görsün + yönetsin
-- ------------------------------------------------------------------
drop policy if exists service_categories_select_admin_all on public.service_categories;
create policy service_categories_select_admin_all
  on public.service_categories
  for select
  to authenticated
  using (public.current_user_is_admin());

drop policy if exists service_categories_admin_write on public.service_categories;
create policy service_categories_admin_write
  on public.service_categories
  for all
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

-- ------------------------------------------------------------------
-- DISTRICTS: admin tüm kayıtları görsün + yönetsin
-- ------------------------------------------------------------------
drop policy if exists districts_select_admin_all on public.districts;
create policy districts_select_admin_all
  on public.districts
  for select
  to authenticated
  using (public.current_user_is_admin());

drop policy if exists districts_admin_write on public.districts;
create policy districts_admin_write
  on public.districts
  for all
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());
