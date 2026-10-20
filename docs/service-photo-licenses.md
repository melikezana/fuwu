# FUWU hizmet fotoğrafları ve lisans kaydı

Doğrulama tarihi: **20 Ekim 2026**.

Tüm fotoğraflar Pexels üzerinden seçildi. [Pexels lisansı](https://www.pexels.com/license/) ve [ticari kullanım açıklaması](https://help.pexels.com/hc/en-us/articles/360042295174-What-is-the-license-of-the-photos-and-videos-on-Pexels), ticari web sitesi/uygulama kullanımına, indirmeye ve uyarlamaya izin veriyor. Atıf zorunlu değil; kaynaklar burada korunuyor. Lisansın kişi/marka desteği ima etmeme, görüntüleri olduğu gibi yeniden satmama ve stok platformu olarak yeniden dağıtmama koşulları geçerli.

Bunlar hizmet kategorilerini anlatan temsili stok fotoğraflarıdır; FUWU çalışanı, kayıtlı usta, müşteri, doğrulama rozeti veya kullanıcı değerlendirmesi olarak sunulmaz. Fotoğraflardaki kişilere isim, puan veya kurgu profil eklenmedi. Kullanıcının referans ekran görüntüleri lisanslı fotoğraf yerine kullanılmadı.

| Yerel dosya (public/images/services/) | Kullanım | Fotoğrafçı | Doğrulanan kaynak |
| --- | --- | --- | --- |
| cleaning.webp, hero-cleaning.webp | Ev temizliği; hero için ayrıca kırpılmış kompozisyon | Tima Miroshnichenko | [6195278 – Cleaners Cleaning the Tiled Floor](https://www.pexels.com/photo/cleaners-cleaning-the-tiled-floor-6195278/) |
| plumbing-work.webp | Tesisat bağlantısı üzerinde çalışan teknisyen | Bulat843 | [32588548 – Plumber Repairing Pipe with Wrench Indoors](https://www.pexels.com/photo/plumber-repairing-pipe-with-wrench-indoors-32588548/) |
| electrical.webp | Elektrik panosunda çalışan elektrikçi | Fatih Yurtman | [17842832 – Electrician by Fuse Box](https://www.pexels.com/photo/electrician-by-fuse-box-17842832/) |
| painting.webp | İç mekânda ruloyla çalışan boyacı | Antoni Shkraba | [5493655 – Man Painting a Wall](https://www.pexels.com/photo/man-painting-a-wall-5493655/) |
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
- Yeniden üretim aracı yalnızca bu on fotoğrafın images.pexels.com adreslerinden indirme yapar; hesap veya API anahtarı kullanmaz.
