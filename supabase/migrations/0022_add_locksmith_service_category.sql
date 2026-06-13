insert into public.service_categories (name, slug, description, is_active)
values
  ('Çilingir', 'cilingir', 'Kapı, kilit ve oto çilingir hizmetleri.', true)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  is_active = excluded.is_active,
  updated_at = timezone('utc', now());
