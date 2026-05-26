-- Fuwu Supabase seed data
-- Mock provider phone numbers are intentionally non-personal test values.

begin;

insert into public.service_categories (name, slug, description, is_active)
values
  ('Tesisat', 'tesisat', 'Su tesisati, kacak, batarya ve gider onarim hizmetleri.', true),
  ('Elektrik Hizmeti', 'elektrik-hizmeti', 'Elektrik ariza, montaj, priz ve aydinlatma hizmetleri.', true),
  ('Temizlik', 'temizlik', 'Ev, ofis ve tasinma sonrasi temizlik hizmetleri.', true),
  ('Halı Yıkama', 'hali-yikama', 'Evden teslim halı, koltuk ve tekstil yıkama hizmetleri.', true),
  ('Klima & Beyaz Eşya', 'klima-beyaz-esya', 'Klima, kombi ve beyaz eşya bakım onarım hizmetleri.', true),
  ('Mobilya Montaj', 'mobilya-montaj', 'Mobilya kurulum, demontaj ve tamir hizmetleri.', true),
  ('Boya Badana', 'boya-badana', 'Ic cephe boya, badana ve tadilat destek hizmetleri.', true),
  ('Nakliye Yardımı', 'nakliye-yardimi', 'Kucuk nakliye, eşya taşıma ve taşınma yardımı hizmetleri.', true),
  ('Bahçe Bakımı', 'bahce-bakimi', 'Bahçe düzenleme, bakım ve temizlik hizmetleri.', true),
  ('Havuz Bakımı', 'havuz-bakimi', 'Havuz temizlik, bakım ve kontrol hizmetleri.', true)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  is_active = excluded.is_active,
  updated_at = timezone('utc', now());

insert into public.districts (name, slug, city, is_active)
values
  ('Kadıköy', 'kadikoy', 'Istanbul', true),
  ('Şişli', 'sisli', 'Istanbul', true),
  ('Üsküdar', 'uskudar', 'Istanbul', true),
  ('Beşiktaş', 'besiktas', 'Istanbul', true),
  ('Ataşehir', 'atasehir', 'Istanbul', true),
  ('Maltepe', 'maltepe', 'Istanbul', true),
  ('Bakırköy', 'bakirkoy', 'Istanbul', true),
  ('Fatih', 'fatih', 'Istanbul', true),
  ('Ümraniye', 'umraniye', 'Istanbul', true)
on conflict (slug) do update
set
  name = excluded.name,
  city = excluded.city,
  is_active = excluded.is_active,
  updated_at = timezone('utc', now());

with provider_seed (
  id,
  name,
  category_slug,
  district_slug,
  phone,
  whatsapp,
  description,
  experience_years,
  average_price_min,
  average_price_max,
  rating
) as (
  values
    (
      '00000000-0000-4000-8000-000000000001'::uuid,
      'Mehmet Kaya Tesisat',
      'tesisat',
      'kadikoy',
      '+90 555 000 00 01',
      '+90 555 000 00 01',
      'Kadikoy ve cevresinde su kacagi, batarya degisimi, gider acma ve tesisat bakimi yapan deneyimli ekip.',
      12,
      850.00,
      1800.00,
      4.8
    ),
    (
      '00000000-0000-4000-8000-000000000002'::uuid,
      'Ayhan Usta Elektrik',
      'elektrik-hizmeti',
      'sisli',
      '+90 555 000 00 02',
      '+90 555 000 00 02',
      'Ariza tespiti, priz ve sigorta degisimi, avize montaji ve kucuk olcekli elektrik yenileme isleri.',
      15,
      700.00,
      1600.00,
      4.7
    ),
    (
      '00000000-0000-4000-8000-000000000003'::uuid,
      'Piril Temizlik Ekibi',
      'temizlik',
      'uskudar',
      '+90 555 000 00 03',
      '+90 555 000 00 03',
      'Ev, ofis ve tasinma sonrasi detayli temizlik icin planli calisan guvenilir temizlik ekibi.',
      8,
      1200.00,
      3200.00,
      4.9
    ),
    (
      '00000000-0000-4000-8000-000000000004'::uuid,
      'Mavi Hali Yikama',
      'hali-yikama',
      'besiktas',
      '+90 555 000 00 04',
      '+90 555 000 00 04',
      'Adresinizden teslim alinan hali ve koltuk yikama islerinde hijyen odakli servis.',
      10,
      450.00,
      1400.00,
      4.6
    ),
    (
      '00000000-0000-4000-8000-000000000005'::uuid,
      'Serin Teknik Servis',
      'klima-beyaz-esya',
      'atasehir',
      '+90 555 000 00 05',
      '+90 555 000 00 05',
      'Klima bakimi, beyaz esya ariza tespiti ve periyodik teknik servis ihtiyaclari icin hizli destek.',
      11,
      900.00,
      2500.00,
      4.8
    ),
    (
      '00000000-0000-4000-8000-000000000006'::uuid,
      'Efe Mobilya Montaj',
      'mobilya-montaj',
      'maltepe',
      '+90 555 000 00 06',
      '+90 555 000 00 06',
      'Dolap, masa, yatak ve modul mobilya kurulumlarinda temiz iscilik ve randevulu servis.',
      7,
      650.00,
      1800.00,
      4.5
    ),
    (
      '00000000-0000-4000-8000-000000000007'::uuid,
      'Renkli Duvarlar Boya',
      'boya-badana',
      'bakirkoy',
      '+90 555 000 00 07',
      '+90 555 000 00 07',
      'Daire, oda ve ofis ic cephe boya badana islerinde malzemeli veya malzemesiz fiyatlandirma.',
      14,
      2500.00,
      8500.00,
      4.7
    ),
    (
      '00000000-0000-4000-8000-000000000008'::uuid,
      'Kolay Nakliye Yardimi',
      'nakliye-yardimi',
      'fatih',
      '+90 555 000 00 08',
      '+90 555 000 00 08',
      'Parca esya tasima, ofis ici yer degisikligi ve tasinma gunu destek ekip hizmetleri.',
      9,
      1500.00,
      5000.00,
      4.6
    ),
    (
      '00000000-0000-4000-8000-000000000009'::uuid,
      'Anadolu Tesisat Cozumleri',
      'tesisat',
      'umraniye',
      '+90 555 000 00 09',
      '+90 555 000 00 09',
      'Umraniye hattinda acil tesisat arizalari, rezervuar tamiri ve lavabo gider problemleri icin destek.',
      6,
      750.00,
      1700.00,
      4.4
    ),
    (
      '00000000-0000-4000-8000-000000000010'::uuid,
      'Nil Temizlik Hizmetleri',
      'temizlik',
      'kadikoy',
      '+90 555 000 00 10',
      '+90 555 000 00 10',
      'Haftalik ev temizligi, bos ev temizligi ve kisa sureli ofis temizligi icin esnek ekip planlamasi.',
      5,
      1000.00,
      2800.00,
      4.5
    ),
    (
      '00000000-0000-4000-8000-000000000011'::uuid,
      'Levent Elektrik Atolyesi',
      'elektrik-hizmeti',
      'besiktas',
      '+90 555 000 00 11',
      '+90 555 000 00 11',
      'Aydinlatma kurulumu, pano kontrolu ve kucuk elektrik tadilati icin randevulu servis.',
      13,
      800.00,
      2200.00,
      4.8
    ),
    (
      '00000000-0000-4000-8000-000000000012'::uuid,
      'Atlas Teknik Beyaz Esya',
      'klima-beyaz-esya',
      'sisli',
      '+90 555 000 00 12',
      '+90 555 000 00 12',
      'Buzdolabi, camasir makinesi, bulasik makinesi ve klima bakiminda yerinde teknik servis.',
      16,
      950.00,
      3000.00,
      4.9
    )
)
insert into public.providers (
  id,
  name,
  category_id,
  district_id,
  phone,
  whatsapp,
  description,
  experience_years,
  average_price_min,
  average_price_max,
  rating,
  is_active,
  is_approved
)
select
  provider_seed.id,
  provider_seed.name,
  service_categories.id,
  districts.id,
  provider_seed.phone,
  provider_seed.whatsapp,
  provider_seed.description,
  provider_seed.experience_years,
  provider_seed.average_price_min,
  provider_seed.average_price_max,
  provider_seed.rating,
  true,
  true
from provider_seed
join public.service_categories
  on service_categories.slug = provider_seed.category_slug
join public.districts
  on districts.slug = provider_seed.district_slug
on conflict (id) do update
set
  name = excluded.name,
  category_id = excluded.category_id,
  district_id = excluded.district_id,
  phone = excluded.phone,
  whatsapp = excluded.whatsapp,
  description = excluded.description,
  experience_years = excluded.experience_years,
  average_price_min = excluded.average_price_min,
  average_price_max = excluded.average_price_max,
  rating = excluded.rating,
  is_active = excluded.is_active,
  is_approved = excluded.is_approved,
  updated_at = timezone('utc', now());

commit;
