insert into public.service_categories (name, slug, description, is_active)
values
  ('Bahçe Bakımı', 'bahce-bakimi', 'Bahçe düzenleme, bakım ve temizlik hizmetleri.', true),
  ('Havuz Bakımı', 'havuz-bakimi', 'Havuz temizlik, bakım ve kontrol hizmetleri.', true)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  is_active = excluded.is_active,
  updated_at = now();
