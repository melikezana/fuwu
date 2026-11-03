-- FUWU: hizmeti olmayan 7 kategoriye satılabilir hizmet tanımları.
-- Müşteri bu kategorilerde boş sayfa görüyordu; ustalar da fiyat girecek hizmet bulamıyordu.
-- Fiyat ve süre her zaman ustanın kendi teklifinde belirlenir; burada yalnızca kapsam ve paketler var.
-- Kategori slug'ı eşleşmezse veya hizmet zaten varsa hiçbir şey eklenmez. Tekrar çalıştırmak güvenlidir.
begin;

with defs(category_slug, slug, name, description, scope, exclusions, image_url, pricing_type) as (values
  ('temizlik', 'ev-temizligi', 'Ev temizliği', 'Eve döndüğünüzde her yer tertemiz.',
   'Seçilen ev tipine göre odaların, mutfağın ve banyonun genel temizliği: toz alma, süpürme, paspas, mutfak tezgâhı, lavabo, klozet ve duş alanı.',
   'Dış cam, halı ve koltuk yıkama, dolap içleri ve inşaat sonrası temizlik dahil değildir.',
   '/images/services/cleaning.webp', 'VARIANT_BASED'),
  ('temizlik', 'detayli-ev-temizligi', 'Detaylı ev temizliği', 'Taşınmadan önce ya da mevsim başında baştan sona.',
   'Genel temizliğe ek olarak dolap içleri, iç cam yüzeyleri, kapı ve pervazlar, mutfak dolabı kapakları ve fayans derzleri.',
   'Dış cam, halı ve koltuk yıkama ve inşaat sonrası kaba temizlik dahil değildir.',
   '/images/services/cleaning.webp', 'VARIANT_BASED'),
  ('boya-badana', 'oda-boyama', 'Oda boyama', 'Duvarlarınıza yeni bir hayat.',
   'Seçilen odaların duvarlarının iç cephe boyasıyla iki kat boyanması, zemin ve eşyaların örtülmesi, iş sonu kaba temizlik.',
   'Boya ve malzeme, tavan boyası, alçı ve macun tamiri ile dış cephe dahil değildir.',
   '/images/services/painting.webp', 'VARIANT_BASED'),
  ('boya-badana', 'boya-badana-kesfi', 'Boya badana keşfi', 'Boyadan önce net ölçü, net fiyat.',
   'Boyanacak alanların yerinde ölçülmesi, duvar ve tavan yüzeylerinin incelenmesi ve yapılacak işin yazılı fiyatlandırılması.',
   'Boya işi bu hizmete dahil değildir; ayrıca onayınızla başlar.',
   '/images/services/painting.webp', 'DIAGNOSTIC_SERVICE'),
  ('cilingir', 'kapi-acma', 'Kapı açma', 'Kapıda kalmayın.',
   'Kilitli kalan bir adet daire veya oda kapısının mümkün olan en az hasarla açılması. Güvenliğiniz için kapı açılmadan önce adreste oturduğunuz kimlik veya belgeyle doğrulanır.',
   'Kilit ve barel değişimi, kapı veya kasa onarımı ve çelik kasa açma dahil değildir.',
   '/images/services/locksmith.webp', 'FIXED_PRICE'),
  ('cilingir', 'kilit-degisimi', 'Kilit değişimi', 'Anahtar kaybolduysa kilit yenilensin.',
   'Bir adet standart kapı kilidi barelinin sökülmesi, yenisinin takılması ve anahtarlarla çalışma kontrolü.',
   'Barel ve kilit ücreti, çelik kapı mekanizması ve kapı onarımı dahil değildir.',
   '/images/services/locksmith.webp', 'FIXED_PRICE'),
  ('hali-yikama', 'hali-yikama', 'Halı yıkama', 'Kapınızdan alınır, tertemiz döner.',
   'Halıların adresten alınması, makinede yıkanıp kurutulması ve adrese teslim edilmesi.',
   'El dokuması ipek ve antika halılar ile kalıcı leke ve renk garantisi dahil değildir.',
   '/images/services/carpet.webp', 'VARIANT_BASED'),
  ('hali-yikama', 'koltuk-yikama', 'Koltuk yıkama', 'Koltuklarınız yerinde ferahlasın.',
   'Seçilen koltukların yerinde vakumlu makineyle yıkanması ve leke ön işlemi.',
   'Deri, süet ve kuru temizlik gerektiren kumaşlar dahil değildir.',
   '/images/services/carpet.webp', 'VARIANT_BASED'),
  ('havuz-bakimi', 'havuz-temizligi', 'Havuz temizliği ve bakımı', 'Yüzmeye hazır, berrak su.',
   'Yüzey ve tabanın süpürülmesi, duvar ve su hattının fırçalanması, filtre geri yıkama, pH ve klor ölçümü.',
   'Kimyasal ürünler, ekipman onarımı ve su değişimi dahil değildir.',
   '/images/services/pool.webp', 'VARIANT_BASED'),
  ('nakliye-yardimi', 'esya-tasima-yardimi', 'Eşya taşıma yardımı', 'Ağır işleri ekibe bırakın.',
   'Seçilen süre boyunca iki kişilik ekiple eşyaların taşınması, araca yüklenmesi ve indirilmesi.',
   'Araç, ambalaj malzemesi, mobilya söküm ve kurulumu ile şehirler arası taşıma dahil değildir.',
   '/images/services/moving.webp', 'VARIANT_BASED'),
  ('nakliye-yardimi', 'nakliyat-kesfi', 'Evden eve nakliyat keşfi', 'Taşınmadan önce net fiyat.',
   'Taşınacak eşyaların yerinde incelenmesi, araç ve ekip ihtiyacının belirlenmesi ve yazılı fiyat teklifi.',
   'Taşıma işi bu hizmete dahil değildir; ayrıca onayınızla başlar.',
   '/images/services/moving.webp', 'DIAGNOSTIC_SERVICE'),
  ('bahce-bakimi', 'cim-bicme', 'Çim biçme', 'Bahçeniz yeniden derli toplu.',
   'Çimin biçilmesi, kenarların düzeltilmesi ve biçilen otların toplanması.',
   'Atıkların adresten götürülmesi, ilaçlama, gübreleme ve sulama sistemi dahil değildir.',
   '/images/services/garden.webp', 'VARIANT_BASED'),
  ('bahce-bakimi', 'cit-budama', 'Çit ve çalı budama', 'Düzgün hatlar, ferah bir bahçe.',
   'Seçilen uzunluktaki çit ve çalıların şekil budaması ve budama atıklarının toplanması.',
   'Ağaç kesimi, yüksek ağaç budama ve atıkların adresten götürülmesi dahil değildir.',
   '/images/services/garden.webp', 'VARIANT_BASED')
)
insert into public.service_catalog (category_id, slug, name, description, scope, exclusions, image_url, pricing_type)
select c.id, d.slug, d.name, d.description, d.scope, d.exclusions, d.image_url, d.pricing_type
from defs d
join public.service_categories c on c.slug = d.category_slug
where not exists (select 1 from public.service_catalog s where s.slug = d.slug);

-- Paketler müşteriye bu sırayla gösterilir; usta her pakete kendi fiyatını ve süresini girer.
with variant_defs(service_slug, name, position) as (values
  ('ev-temizligi', '1+1 ev', 1), ('ev-temizligi', '2+1 ev', 2), ('ev-temizligi', '3+1 ev', 3), ('ev-temizligi', '4+1 ve üzeri ev', 4),
  ('detayli-ev-temizligi', '1+1 ev', 1), ('detayli-ev-temizligi', '2+1 ev', 2), ('detayli-ev-temizligi', '3+1 ev', 3), ('detayli-ev-temizligi', '4+1 ve üzeri ev', 4),
  ('oda-boyama', '1 oda', 1), ('oda-boyama', '2 oda', 2), ('oda-boyama', '3 oda', 3), ('oda-boyama', 'Tüm ev (3+1''e kadar)', 4),
  ('hali-yikama', '10 m²''ye kadar', 1), ('hali-yikama', '20 m²''ye kadar', 2), ('hali-yikama', '30 m²''ye kadar', 3),
  ('koltuk-yikama', 'Tekli koltuk', 1), ('koltuk-yikama', 'Üçlü koltuk', 2), ('koltuk-yikama', 'Koltuk takımı (3+3+1)', 3),
  ('havuz-temizligi', '30 m²''ye kadar havuz', 1), ('havuz-temizligi', '60 m²''ye kadar havuz', 2), ('havuz-temizligi', '60 m²''den büyük havuz', 3),
  ('esya-tasima-yardimi', '2 saat · 2 kişi', 1), ('esya-tasima-yardimi', '4 saat · 2 kişi', 2), ('esya-tasima-yardimi', '8 saat · 2 kişi', 3),
  ('cim-bicme', '100 m²''ye kadar', 1), ('cim-bicme', '250 m²''ye kadar', 2), ('cim-bicme', '500 m²''ye kadar', 3),
  ('cit-budama', '10 metreye kadar', 1), ('cit-budama', '25 metreye kadar', 2)
)
insert into public.service_variants (service_id, name)
select s.id, v.name
from variant_defs v
join public.service_catalog s on s.slug = v.service_slug and s.pricing_type = 'VARIANT_BASED'
where not exists (
  select 1 from public.service_variants x
  where x.service_id = s.id and x.provider_id is null and x.name = v.name
)
order by s.slug, v.position;

commit;
