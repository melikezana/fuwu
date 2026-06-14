-- Fuwu Supabase seed data
-- Mock provider phone numbers are intentionally non-personal test values.

begin;

-- Local development only: the seed database treats this fixed email as the
-- default admin account after normal Supabase Auth signup creates auth.users.
-- Production must not trust a hard-coded email; use an environment-driven
-- service-role promotion flow instead.
create or replace function public.assign_seed_admin_role_to_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  seed_admin_email constant text := 'admin@fuwu.test';
begin
  if exists (
    select 1
    from auth.users
    where users.id = new.id
      and users.email is not null
      and lower(users.email) = lower(seed_admin_email)
  ) then
    new.role := 'admin';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_seed_admin_role_before_insert on public.profiles;
create trigger profiles_seed_admin_role_before_insert
before insert on public.profiles
for each row execute function public.assign_seed_admin_role_to_profile();

update public.profiles as profile
set
  role = 'admin',
  updated_at = timezone('utc', now())
from auth.users as users
where users.id = profile.id
  and users.email is not null
  and lower(users.email) = lower('admin@fuwu.test')
  and profile.role is distinct from 'admin';

insert into public.service_categories (name, slug, description, is_active)
values
  ('Tesisat', 'tesisat', 'Su tesisati, kacak, batarya ve gider onarim hizmetleri.', true),
  ('Çilingir', 'cilingir', 'Kapı, kilit ve oto çilingir hizmetleri.', true),
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
  ('Adalar', 'adalar', 'Istanbul', true),
  ('Arnavutköy', 'arnavutkoy', 'Istanbul', true),
  ('Ataşehir', 'atasehir', 'Istanbul', true),
  ('Avcılar', 'avcilar', 'Istanbul', true),
  ('Bağcılar', 'bagcilar', 'Istanbul', true),
  ('Bahçelievler', 'bahcelievler', 'Istanbul', true),
  ('Bakırköy', 'bakirkoy', 'Istanbul', true),
  ('Başakşehir', 'basaksehir', 'Istanbul', true),
  ('Bayrampaşa', 'bayrampasa', 'Istanbul', true),
  ('Beşiktaş', 'besiktas', 'Istanbul', true),
  ('Beykoz', 'beykoz', 'Istanbul', true),
  ('Beylikdüzü', 'beylikduzu', 'Istanbul', true),
  ('Beyoğlu', 'beyoglu', 'Istanbul', true),
  ('Büyükçekmece', 'buyukcekmece', 'Istanbul', true),
  ('Çatalca', 'catalca', 'Istanbul', true),
  ('Çekmeköy', 'cekmekoy', 'Istanbul', true),
  ('Esenler', 'esenler', 'Istanbul', true),
  ('Esenyurt', 'esenyurt', 'Istanbul', true),
  ('Eyüpsultan', 'eyupsultan', 'Istanbul', true),
  ('Fatih', 'fatih', 'Istanbul', true),
  ('Gaziosmanpaşa', 'gaziosmanpasa', 'Istanbul', true),
  ('Güngören', 'gungoren', 'Istanbul', true),
  ('Kadıköy', 'kadikoy', 'Istanbul', true),
  ('Kağıthane', 'kagithane', 'Istanbul', true),
  ('Kartal', 'kartal', 'Istanbul', true),
  ('Küçükçekmece', 'kucukcekmece', 'Istanbul', true),
  ('Maltepe', 'maltepe', 'Istanbul', true),
  ('Pendik', 'pendik', 'Istanbul', true),
  ('Sancaktepe', 'sancaktepe', 'Istanbul', true),
  ('Sarıyer', 'sariyer', 'Istanbul', true),
  ('Silivri', 'silivri', 'Istanbul', true),
  ('Sultanbeyli', 'sultanbeyli', 'Istanbul', true),
  ('Sultangazi', 'sultangazi', 'Istanbul', true),
  ('Şile', 'sile', 'Istanbul', true),
  ('Şişli', 'sisli', 'Istanbul', true),
  ('Tuzla', 'tuzla', 'Istanbul', true),
  ('Ümraniye', 'umraniye', 'Istanbul', true),
  ('Üsküdar', 'uskudar', 'Istanbul', true),
  ('Zeytinburnu', 'zeytinburnu', 'Istanbul', true)
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
    ),
    (
      '00000000-0000-4000-8000-000000000013'::uuid,
      'Acil Cilingir Istanbul',
      'cilingir',
      'kadikoy',
      '+90 555 000 00 13',
      '+90 555 000 00 13',
      'Kilit degisimi, kapida kalma ve oto cilingir ihtiyaclari icin randevulu veya acil destek.',
      9,
      650.00,
      1750.00,
      4.8
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

with service_request_seed (
  id,
  category_slug,
  district_slug,
  address,
  urgency,
  urgency_type,
  budget,
  budget_tag,
  status,
  assigned_provider_id,
  accepted_provider_id,
  accepted_at,
  description,
  created_at
) as (
  values
    (
      '10000000-0000-4000-8000-000000000001'::uuid,
      'tesisat',
      'kadikoy',
      'Kadikoy demo adresi',
      'normal',
      'standard',
      '1000-2000 TL',
      'standart',
      'pending',
      null::uuid,
      null::uuid,
      null::timestamptz,
      'Demo pending talep: mutfak lavabosunda su kacagi.',
      timezone('utc', now()) - interval '2 hours'
    ),
    (
      '10000000-0000-4000-8000-000000000002'::uuid,
      'cilingir',
      'kadikoy',
      'Moda demo sokak',
      'urgent',
      'standard',
      '750-1500 TL',
      'acil-hizmet',
      'assigned',
      '00000000-0000-4000-8000-000000000013'::uuid,
      null::uuid,
      null::timestamptz,
      'Demo assigned talep: kapida kalma ve kilit degisimi.',
      timezone('utc', now()) - interval '1 hour'
    ),
    (
      '10000000-0000-4000-8000-000000000003'::uuid,
      'elektrik-hizmeti',
      'sisli',
      'Sisli demo apartmani',
      'normal',
      'standard',
      '700-1600 TL',
      'standart',
      'completed',
      '00000000-0000-4000-8000-000000000002'::uuid,
      '00000000-0000-4000-8000-000000000002'::uuid,
      timezone('utc', now()) - interval '20 minutes',
      'Demo completed talep: priz ve sigorta kontrolu tamamlandi.',
      timezone('utc', now()) - interval '1 day'
    )
)
insert into public.service_requests (
  id,
  user_id,
  category_id,
  district_id,
  address,
  urgency,
  urgency_type,
  budget,
  budget_tag,
  status,
  assigned_provider_id,
  accepted_provider_id,
  accepted_at,
  description,
  created_at,
  updated_at
)
select
  service_request_seed.id,
  null,
  service_categories.id,
  districts.id,
  service_request_seed.address,
  service_request_seed.urgency,
  service_request_seed.urgency_type,
  service_request_seed.budget,
  service_request_seed.budget_tag,
  service_request_seed.status,
  service_request_seed.assigned_provider_id,
  service_request_seed.accepted_provider_id,
  service_request_seed.accepted_at,
  service_request_seed.description,
  service_request_seed.created_at,
  timezone('utc', now())
from service_request_seed
join public.service_categories
  on service_categories.slug = service_request_seed.category_slug
join public.districts
  on districts.slug = service_request_seed.district_slug
on conflict (id) do update
set
  user_id = excluded.user_id,
  category_id = excluded.category_id,
  district_id = excluded.district_id,
  address = excluded.address,
  urgency = excluded.urgency,
  urgency_type = excluded.urgency_type,
  budget = excluded.budget,
  budget_tag = excluded.budget_tag,
  status = excluded.status,
  assigned_provider_id = excluded.assigned_provider_id,
  accepted_provider_id = excluded.accepted_provider_id,
  accepted_at = excluded.accepted_at,
  description = excluded.description,
  created_at = excluded.created_at,
  updated_at = timezone('utc', now());

commit;
