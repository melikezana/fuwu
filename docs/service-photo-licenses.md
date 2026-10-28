# FUWU hizmet fotoğrafları ve lisans kaydı

## 29 Ekim 2026 · Mobil deneyim düzeltmesi

[Pexels lisansı](https://www.pexels.com/license/) 29 Ekim 2026'da yeniden okundu. Ücretsiz ticari kullanım, indirme ve uyarlama izni doğrulandı. Kişi veya marka desteği ima edilmez; fotoğraflar gerçek FUWU ustası, müşteri, portföy veya tamamlanmış sipariş olarak sunulmaz.

| Yeni yerel WebP | Fotoğrafçı | Kaynak ve lisans | Optimize dosya |
| --- | --- | --- | --- |
| `appliance.webp` | Bulat843 | [34734504 – Technician Repairing Home Appliance Indoors](https://www.pexels.com/photo/technician-repairing-home-appliance-indoors-34734504/), Pexels / Free to use | 100.006 bayt, en fazla 900 px genişlik |
| `pool.webp` | Ana Lourenco | [21327976 – Man Cleaning Swimming Pool](https://www.pexels.com/photo/man-cleaning-swimming-pool-21327976/), Pexels / Free to use | 135.318 bayt, en fazla 900 px genişlik |
| `carpet.webp` | Khunkorn Laowisit | [5233260 – Brushing a Carpet with Soap](https://www.pexels.com/photo/brushing-a-carpet-with-soap-5233260/), Pexels / Free to use | 114.978 bayt, en fazla 900 px genişlik |

Üç fotoğraf indirme sonrasında birlikte görsel olarak incelendi: beyaz eşya onarımı, havuz temizliği ve deterjan/fırça ile halı temizliği ayrı eşlenir. Yeniden üretim: `node scripts/prepare-service-photos.mjs --missing`. Araç yalnızca listelenen Pexels görüntü adreslerinden indirir; API anahtarı veya oturum kullanmaz. Kaynak JPG yerine optimize WebP saklanır. Next Image kullanım alanına göre responsive `srcset` üretir.

### Gerçek katalogda okunan 11 aktif kategori

| Kategori slug | Dosya |
| --- | --- |
| `bahce-bakimi` | `garden.webp` |
| `boya-badana` | `painting.webp` |
| `cilingir` | `locksmith.webp` |
| `elektrik-hizmeti` | `electrical.webp` |
| `hali-yikama` | `carpet.webp` |
| `havuz-bakimi` | `pool.webp` |
| `klima-beyaz-esya` | `appliance.webp` |
| `mobilya-montaj` | `furniture.webp` |
| `nakliye-yardimi` | `moving.webp` |
| `temizlik` | `cleaning.webp` |
| `tesisat` | `plumbing-work.webp` |

`klima-bakimi` alt hizmeti `climate.webp` ile eşlenir. `ev-tadilati` ve `tamirat` için mevcut lisanslı `renovation.webp` saklanır. Hizmet slug'ı kategori kimliğinden önce aranır. Bilinmeyen meslek tadilat fotoğrafı almaz; tanımlı fotoğraf da yüklenemiyorsa nötr, metin etiketli ikon gösterilir. Bu, aşağıdaki eski tarihli genel yedek davranışını geçersiz kılar.

Kullanılmayan 21 `Meshy_AI_` dosyası (22.757.816 bayt) ve erişilmeyen varlık bileşenleri kaldırıldı. Orijinal FUWU logosu ile `public/reference/fuwu-target-design.jpg` korundu. Kaynak taramasında kullanılmayan `@react-three/drei`, `@react-three/fiber`, `three` ve `gsap` bağımlılıkları kaldırıldı. Önceki lisans kayıtları aşağıda kaynak geçmişi olarak korunur.

Doğrulama tarihi: **20 Ekim 2026**.

22 Ekim 2026 Fusion kontrolünde mevcut WebP fotoğraflar ve kaynak kayıtları korundu; Pexels lisans sayfası yeniden okundu. Yeni stok fotoğraf eklenmedi. Ana sayfada fotoğrafların hizmet tanıtımı için kullanılan stok görüntüler olduğu görünür biçimde belirtilir.

Tüm fotoğraflar Pexels üzerinden seçildi. [Pexels lisansı](https://www.pexels.com/license/) ve [ticari kullanım açıklaması](https://help.pexels.com/hc/en-us/articles/360042295174-What-is-the-license-of-the-photos-and-videos-on-Pexels), ticari web sitesi/uygulama kullanımına, indirmeye ve uyarlamaya izin veriyor. Atıf zorunlu değil; kaynaklar burada korunuyor. Lisansın kişi/marka desteği ima etmeme, görüntüleri olduğu gibi yeniden satmama ve stok platformu olarak yeniden dağıtmama koşulları geçerli.

Bunlar hizmet kategorilerini anlatan temsili stok fotoğraflarıdır; FUWU çalışanı, kayıtlı usta, müşteri, doğrulama rozeti veya kullanıcı değerlendirmesi olarak sunulmaz. Fotoğraflardaki kişilere isim, puan veya kurgu profil eklenmedi. Kullanıcının referans ekran görüntüleri lisanslı fotoğraf yerine kullanılmadı.

| Yerel dosya (public/images/services/) | Kullanım | Fotoğrafçı | Doğrulanan kaynak |
| --- | --- | --- | --- |
| cleaning.webp, hero-cleaning.webp | Ev temizliği; hero için ayrıca kırpılmış kompozisyon | Tima Miroshnichenko | [6195278 – Cleaners Cleaning the Tiled Floor](https://www.pexels.com/photo/cleaners-cleaning-the-tiled-floor-6195278/) |
| plumbing-work.webp | Tesisat bağlantısı üzerinde çalışan teknisyen | Bulat843 | [32588548 – Plumber Repairing Pipe with Wrench Indoors](https://www.pexels.com/photo/plumber-repairing-pipe-with-wrench-indoors-32588548/) |
| electrical.webp | Elektrik panosunda çalışan elektrikçi | Fatih Yurtman | [17842832 – Electrician by Fuse Box](https://www.pexels.com/photo/electrician-by-fuse-box-17842832/) |
| painting.webp | İç mekânda ruloyla çalışan boyacı | Antoni Shkraba | [5493655 – Man Painting a Wall](https://www.pexels.com/photo/man-painting-a-wall-5493655/) |
| provider-painting.webp | Usta Ol ana görseli; 1100×950, 30.528 bayt WebP | Antoni Shkraba | [5493655 – Man Painting a Wall](https://www.pexels.com/photo/man-painting-a-wall-5493655/) |
| climate.webp | Klima kontrolü yapan teknik servis çalışanı | José Andrés Pacheco Cortes | [5463575 – Man Checking an Air Conditioner](https://www.pexels.com/photo/man-checking-an-air-conditioner-5463575/) |
| locksmith.webp | Kapı kolu/kilit mekanizmasını ayarlayan eller | cottonbro studio | [7220892 – A Person Holding Brown Doorknob](https://www.pexels.com/photo/a-person-holding-brown-doorknob-7220892/) |
| furniture.webp | Ahşap mobilya montajı | Sóc Năng Động | [31755424 – Close-up of Hands Assembling Wooden Furniture](https://www.pexels.com/photo/close-up-of-hands-assembling-wooden-furniture-31755424/) |
| moving.webp | Evde koli taşıyan nakliye çalışanları | RDNE Stock project | [7464687 – Two Men Carrying Boxes](https://www.pexels.com/photo/two-men-carrying-boxes-7464687/) |
| garden.webp | Bitki bakımı yapan bahçıvan | Anibal Pabon | [13834298 – Gardener Working with Flowerbed](https://www.pexels.com/photo/gardener-working-with-flowerbed-13834298/) |
| renovation.webp | Matkapla ev yenileme işi yapan usta | Mikael Blomkvist | [8961401 – Man in Black Shirt Holding Black Power Tool](https://www.pexels.com/photo/man-in-black-shirt-holding-black-power-tool-8961401/) |

Her kaynağın Pexels fotoğraf sayfasındaki ücretsiz lisans bilgisi kontrol edildi. 7220892 numaralı fotoğrafın otomatik açıklaması tesisattan bahsetse de görselde kapı kolu bulunduğu için çilingir kategorisinde kullanıldı. Diğer görüntüler de indirme sonrasında görsel olarak kontrol edildi.

## Optimizasyon

- Yerel WebP dosyaları; çalışma zamanında harici stok fotoğraf isteği yok.
- Kategori görselleri en fazla 1.000/900 piksel genişlikte; hero temizliği 1.200 piksel.
- next/image, doğru sizes, sabit en-boy oranı ve gecikmeli yükleme kullanılır; yalnızca ana hero fotoğrafı önceliklidir.
- Kaynaklar ve yeniden üretim: node scripts/prepare-service-photos.mjs.
- Usta Ol görseli bu çalışmada aynı lisanslı kaynaktan yeniden indirildi; `node scripts/prepare-provider-hero.mjs` ile ayrı bir WebP olarak optimize edildi. Kaynak ve Pexels lisansı 20 Ekim 2026’da yeniden kontrol edildi.
- Yeniden üretim aracı yalnızca bu on fotoğrafın images.pexels.com adreslerinden indirme yapar; hesap veya API anahtarı kullanmaz.

## 28 Ekim 2026 · FUWU 3.0

Yeni stok fotoğraf indirilmedi. Mevcut kaynaklar ve orijinal FUWU logosu korundu. Pexels lisans sayfası yeniden okundu; web/uygulama kullanımı ve görsel uyarlama izinleri ile kişi/marka desteği ima etmeme şartı kontrol edildi. `hero-plumbing.webp`, aynı 32588548 numaralı tesisat fotoğrafının mevcut kırpılmış türevidir. Fotoğraf eşlemesi olmayan kullanıcı kategorileri için başka mesleğe ait fotoğraf yerine kategori ikonu gösterilir. Fotoğraflar kayıtlı FUWU ustası veya değerlendirmesi olarak sunulmaz.
