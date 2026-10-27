# FUWU — fotoğraf ve marka varlıkları

Phase 1 kontrol tarihi: **26 Ekim 2026**.

## Lisans ve kullanım

Fotoğrafların kaynağı Pexels’tir. [Pexels lisans sayfası](https://www.pexels.com/license/) ve [ticari kullanım açıklaması](https://help.pexels.com/hc/en-us/articles/360042295174-What-is-the-license-of-the-photos-and-videos-on-Pexels) bu çalışmada yeniden okundu. Lisans, ticari web sitesi/uygulama kullanımına ve uyarlamaya izin verir; atıf zorunlu değildir. Kişi veya markaların FUWU’yu desteklediği ima edilmez; fotoğraflar bağımsız stok ürünü olarak yeniden dağıtılmaz veya değiştirilmemiş baskı olarak satılmaz.

Bu fotoğraflar hizmeti anlatır. Fotoğraftaki kişilere uydurma usta kimliği, puan, yorum veya doğrulama rozeti eklenmedi. Gerçek usta profil/portföy fotoğrafları, hizmet fotoğraflarından ayrı olarak mevcut kullanıcı verisinden gelir. Yapay fotoğraf üretilmedi.

Önceki kaynak kaydı: [service-photo-licenses.md](service-photo-licenses.md). Önceden indirilen dosyaların önceki doğrulama tarihleri o belgede korunur. Bu oturumda bütün kaynak sayfalarının yeniden açıldığı iddia edilmez.

## Dosyalar

Tüm dosyalar `public/images/services/` altındadır.

| Dosya | Fotoğrafçı ve kaynak | Kullanım / Phase 1 durumu | Boyut ve dosya büyüklüğü |
| --- | --- | --- | --- |
| `hero-plumbing.webp` | Bulat843, [Pexels 32588548](https://www.pexels.com/photo/plumber-repairing-pipe-with-wrench-indoors-32588548/) | **Bu çalışmada yeniden indirildi**, hero için kadrajlandı. Kaynak sayfasındaki fotoğrafçı ve ücretsiz lisans bağlantısı yeniden görüldü. | 960×1080; 123.242 bayt |
| `plumbing-work.webp` | Aynı Pexels 32588548 | Mevcut dosya; kategori, katalog ve hizmet kapsamı. | 900×1600; 139.908 bayt |
| `electrical.webp` | Fatih Yurtman, [Pexels 17842832](https://www.pexels.com/photo/electrician-by-fuse-box-17842832/) | Mevcut dosya; hero, kategori ve katalog. Kaynak sayfası yeniden açıldı. | 900×600; 47.986 bayt |
| `painting.webp` | Antoni Shkraba, [Pexels 5493655](https://www.pexels.com/photo/man-painting-a-wall-5493655/) | Mevcut dosya; masaüstü hero. Kaynak sayfası yeniden açıldı. | 900×1350; 31.434 bayt |
| `provider-painting.webp` | Aynı Pexels 5493655 | Mevcut Usta Ol görseli korundu. | 1100×950; 30.528 bayt |
| `cleaning.webp` | Tima Miroshnichenko, [Pexels 6195278](https://www.pexels.com/photo/cleaners-cleaning-the-tiled-floor-6195278/) | Mevcut dosya; hero ve kategori. Kaynak sayfası bu oturumda web aracıyla alınamadı; önceki kaynak kaydı ve uygun gerçek fotoğraf korundu. | 1000×1500; 42.886 bayt |
| `hero-cleaning.webp` | Aynı Pexels 6195278 | Mevcut, önceden kadrajlanmış varyant korundu; yeni hero bunu yüklemez. | 1200×772; 56.602 bayt |
| `climate.webp` | José Andrés Pacheco Cortes, [Pexels 5463575](https://www.pexels.com/photo/man-checking-an-air-conditioner-5463575/) | Mevcut kategori / katalog fotoğrafı. Önceki kaynak kaydı korundu. | 900×640; 106.756 bayt |
| `furniture.webp` | Sóc Năng Động, [Pexels 31755424](https://www.pexels.com/photo/close-up-of-hands-assembling-wooden-furniture-31755424/) | Mevcut montaj kategorisi ve güven bölümü. Önceki kaynak kaydı korundu. | 900×601; 22.010 bayt |
| `locksmith.webp` | cottonbro studio, [Pexels 7220892](https://www.pexels.com/photo/a-person-holding-brown-doorknob-7220892/) | Mevcut dosya; yalnızca katalogda aktif olduğunda kategori kartında kullanılır. | 900×1350; 16.480 bayt |
| `moving.webp` | RDNE Stock project, [Pexels 7464687](https://www.pexels.com/photo/two-men-carrying-boxes-7464687/) | Mevcut dosya; yalnızca aktif kategori için. | 900×600; 26.578 bayt |
| `garden.webp` | Anibal Pabon, [Pexels 13834298](https://www.pexels.com/photo/gardener-working-with-flowerbed-13834298/) | Mevcut dosya; yalnızca aktif kategori için. | 900×600; 84.578 bayt |
| `renovation.webp` | Mikael Blomkvist, [Pexels 8961401](https://www.pexels.com/photo/man-in-black-shirt-holding-black-power-tool-8961401/) | Mevcut dosya; tadilat ve genel hizmet görseli yedeği. | 900×600; 47.068 bayt |

## Yeni indirme ve optimizasyon

`node scripts/prepare-phase1-hero.mjs` yalnızca doğrulanmış Pexels 32588548 kaynağından indirir. Kaynak: `https://images.pexels.com/photos/32588548/pexels-photo-32588548.jpeg?auto=compress&cs=tinysrgb&w=1600`.

Sharp, yönü düzelterek 960×1080 kadraj üretir ve WebP kalite 80 ile kaydeder. Kaynakta olmayan bir kişi veya hizmet eklenmez. Eski `prepare-service-photos.mjs` ve `prepare-provider-hero.mjs` araçları korunur.

Arayüzde `next/image`, duyarlı `sizes`, sabit görsel alanları ve ekran altındaki fotoğraflarda gecikmeli yükleme kullanılır. Yalnızca hero’nun ilk fotoğrafı önceden yüklenir. Çalışma zamanında Pexels’e istek yapılmaz; görseller projede saklanır ve Next.js’in yerel görsel endpoint’i üzerinden sunulur.

## Marka, ikon ve referans

- Mevcut `src/components/brand/FuwuLogo.tsx` logosu ve `#FF6500` turuncusu korundu. PWA ikonları mevcut `public/icons/` dosyalarıdır.
- Mevcut yerel Inter fontları ve `src/fonts/INTER-LICENSE.txt` korunur; Google Fonts isteği eklenmedi.
- Ortak etkileşim ikonları Lucide; kategori ikonları mevcut `ServiceIcon` SVG sistemidir. Yeni ikon veya stok kişi kimliği üretilmedi.
- `public/reference/fuwu-target-design.jpg` eski 3D ev tasarım referansıdır; lisanslı fotoğraf veya Instagram paylaşımı olarak kullanılmadı. İstenen önceki Instagram görseli bu çalışma alanında tespit edilemedi.
- Eski Meshy/cartoon varlıklar ve referans dosyası arşiv niteliğinde korundu. Yeni müşteri ana sayfasında yüklenmezler.
