# FUWU — şirketleşme öncesi pazaryeri ve güven denetimi

Tarih: **30 Ekim 2026, Europe/Istanbul**. Depo: `melikezana/fuwu`.

Yerel başlangıç commit'i ve salt okunur GitHub `HEAD/main` sorgusu aynı: `0d491dfca77ecfae6de8ae02c6d3f8fcad947514`. Başlangıç çalışma ağacı temizdi. Değişiklikler yerel çalışma alanında uygulandı. **Commit, push, deployment, production/staging migration, canlı ödeme açılışı ve uzak veri silme yapılmadı.** Yerel test PostgreSQL kümeleri gerçek Supabase staging ortamı değildir.

## 1. Duyuru bandı

`announcement_banner` okunurken ve bileşende, Türkçe büyük/küçük harf farkları dahil eski “GELİŞTİRİYORUZ” mesajı bastırılır. Boş mesaj hiç render edilmez. Gerçek operasyon/kampanya mesajları için ayar ve bileşen korunur. `maintenance_mode` değiştirilmedi.

Admin ayarlarında **Eski Duyuruyu Temizle** işlemi hazırlandı. Yetki kontrolü yapar; veritabanında yalnızca admin tarafından görülen eski değer hâlâ aynıysa sadece `announcement_banner` temizlenir. Karar audit kaydına aynı transaction içinde yazılır. Başka ayarları yeniden kaydetmez. İlgili RPC staging doğrulaması ve production onayı olmadan uzakta çalıştırılmadı.

Yeni büyük “yakında” bandı eklenmedi. Satın alma bağlamındaki açıklama: **“Online satın alma henüz açılmadı.”**

## 2. Usta kayıtları ve güvenli temizlik

### Erişilebilen gerçek envanter

`scripts/audit-prelaunch-data.mjs` yalnızca GET kullanır; anahtar, ad, açıklama veya iletişim bilgisi rapora kaydetmez. OpenAPI metadata erişimi `401` olsa da ayrı public sorgularla **11 aktif kategori ve 4 kamuya açık usta kaydı** okunabildi. Bu erişim yalnızca anonim RLS görünümüdür; tam yönetici envanteri değildir.

| Kamuya açık provider ID | Hesap ilişkisi | Sınıflandırma / silme kararı |
| --- | --- | --- |
| `4d0d8f4a-692e-4792-9fa6-5877ba76c55f` | `profiles` ilişkisi var; özel kayıt okunamadı | Kaynak doğrulanmadı; silme listesine alınmadı |
| `78bc496a-7f93-43fb-8748-33b5d6cde252` | `user_id` boş | Kaynak doğrulanmadı; silme listesine alınmadı |
| `8a0fd4ad-4b34-4089-8737-3cebc64e4295` | `profiles` ilişkisi var; özel kayıt okunamadı | Kaynak doğrulanmadı; silme listesine alınmadı |
| `ec711057-c9a3-4a03-9737-4f560e3c39cb` | `user_id` boş | Kaynak doğrulanmadı; silme listesine alınmadı |

Bu dört ID, repodaki sabit seed ID'leriyle eşleşmiyor. İçerik sinyali veya hesapsız kayıt tek başına test kaydı kanıtı kabul edilmedi. Kullanıcının mevcut deneme profillerinin kaldırılması talebi, kimliği doğrulanmamış bir gerçek kullanıcının silinmesi için gerekçe yapılmadı.

### Depoda kesin test kaynağı bulunan tam ID listesi

Kaynak: `supabase/seed/seed.sql`. Bunlar ayrılmış geliştirme seed kimlikleridir; bu denetimde public uzaktaki dört kayıt arasında bulunmadılar. Özel/kapalı kayıtlarda bulunup bulunmadıkları bilinmiyor.

```text
00000000-0000-4000-8000-000000000001
00000000-0000-4000-8000-000000000002
00000000-0000-4000-8000-000000000003
00000000-0000-4000-8000-000000000004
00000000-0000-4000-8000-000000000005
00000000-0000-4000-8000-000000000006
00000000-0000-4000-8000-000000000007
00000000-0000-4000-8000-000000000008
00000000-0000-4000-8000-000000000009
00000000-0000-4000-8000-000000000010
00000000-0000-4000-8000-000000000011
00000000-0000-4000-8000-000000000012
00000000-0000-4000-8000-000000000013
```

### İlişki denetiminin sınırları

| Kayıt ailesi | Bu oturumdaki bulgu |
| --- | --- |
| `profiles`, `provider_applications` | Anonim erişim reddedildi (`401/42501`); bağımlılıklar bilinmiyor |
| `provider_service_offerings`, `provider_availability`, `provider_publication_reviews` | Bağlı API şemasında bulunamadı (`404/PGRST205`) |
| `provider_gallery_images`, `orders`, `reviews` | Bu dört ID için anonim görünümde satır dönmedi; bu, özel kayıt bulunmadığının kanıtı değildir |
| Belge kayıtları ve Storage | Tam envanter doğrulanamadı; belge veya nesne silinmedi |
| `payments` | Beklenen `provider_id` sözleşmesiyle sorgu uyuşmadı (`400/42703`) |
| `service_requests`, `audit_logs` | Anonim erişim reddedildi; ilişki yokluğu varsayılmadı |
| PostgreSQL FK kataloğu | Yetkili DB bağlantısı olmadan tam denetlenemedi |

**Uzakta doğrulanmış silme adayı: yok. Uzakta silinen veya pasifleştirilen kayıt: yok. Uzak veri yedeği alındığı iddia edilmiyor.** Public JSON API'deki mevcut görünürlük, onaylı migration/deployment uygulanana kadar değişmiş sayılmaz.

### Hazırlanan korumalar ve işlem sırası

- Yeni yayın incelemeleri `record_kind=unclassified` başlar. Public dizin, profil ve hizmet teklifleri ancak ayrıca `real` olarak incelenmiş, güncel içerik parmak izi onaylanmış profilleri kabul eder. Sabit 13 seed ID, yanlışlıkla `real` işaretlense bile yayınlanamaz.
- Eksik veya eski yayın RPC'si, kaynaksız profiller için görünürlük açmaz. Yeni migration eski provider, sipariş, yorum veya ödeme satırlarını silmez.
- Admin kalite kartında kaynak sınıflandırması, gerekçe, yayın kararı ve belge referansı bulunur. Kaynak/yayın kararları transaction içinde audit edilir. Belge rozetleri onaylı başvuru ve belge referansı gerektirir.
- `scripts/prelaunch-provider-cleanup.mjs` varsayılan olarak envanter ve **ROLLBACK ile biten** silme planı üretir. Uzak DELETE çalıştıran bir kod yolu yoktur.
- Operatör açıkça `PRELAUNCH_TARGET` ve `PRELAUNCH_DATABASE_URL` sağlar. Script proje env dosyalarını kendiliğinden yüklemez. Kaynak kanıtı olan ilave UUID'ler, `--verified-manifest=...` dosyasında `providerId`, `confirmedTest: true`, `evidence` alanlarıyla verilebilir. Dört belirsiz ID böyle bir dosyaya otomatik yazılmadı.
- `--backup`, test satırlarını ve sağlayıcıya gelen bütün kataloglanmış FK satırlarını Git'ten dışlanan `artifacts/prelaunch/private/` altında yedekler. `--quarantine`, önce bu yedeği alıp sonra yalnızca yayın sınıflandırmasını kapatır. Production karantinası ayrıca envanterin `PRELAUNCH_APPROVED_DIGEST` değerini gerektirir; bu oturumda çalıştırılmadı.
- `user_id`, gelen herhangi bir FK veya audit ilişkisi olan provider, izole silme planına girmez. Profil, sipariş, ödeme, audit, galeri ve belge silme işlemi hazırlanmaz. Silme planı gerçek kullanım öncesi taze FK envanteri/yedek ve sahibinin açık onayını gerektirir.

## 3. Ana sayfa

Ana slogan korundu: **“Evinin işi, FUWU'nun işi.”** Alt açıklama: **“Hizmetini seç. Ustanı belirle. Zamanını planla.”**

İlk ekranda hizmet araması, ilçe seçimi, **Hizmetleri Keşfet** ve **Usta Ol** bulunur. Arama placeholder'ı istenen metindir. İlk sekiz kart tesisat, elektrik, temizlik, boya, montaj, klima/beyaz eşya, halı yıkama ve çilingiri gerçek kategori slug'larıyla önceler. Diğer aktif kategoriler Tüm Hizmetler sayfasında yer alır.

Tek kısa işlem bölümü ve açılır satın alma/destek açıklaması bırakıldı. Yinelenen güven tanıtımı ve ayrı uzun partner tanıtımı sadeleştirildi. Gerçek yayındaki usta bulunmadığında profesyonel boş durum gösterilir:

> Usta ağımızı kuruyoruz.
>
> Alanında uzman hizmet verenleri FUWU'ya davet ediyoruz.
>
> Usta Ol

Sandbox yorumları, eski puan agregaları ve test usta sayıları public sosyal kanıt olarak kullanılmaz. Yorum okuma katmanı doğrulanmış canlı işlem kaynağı olmadan yorum yayınlamaz. Kanıt projeksiyonu olmayan eski telefon doğrulama bayrağı rozet oluşturmaz. Sandbox kayıtları backend testleri için korunur.

## 4. Kısa metinler

| Alan | Uygulanan dil |
| --- | --- |
| Ana işlem | Hizmetleri Keşfet |
| İşlem modeli | Seç. Planla. Satın al. |
| Partner | Ustalığın işe dönüşsün. |
| Partner açıklaması | Hizmetlerini sun. Takvimini yönet. Kazancını takip et. |
| Admin | FUWU bugün ne durumda? |
| Ön kayıt | Açılıştan haberdar ol. |
| Kapalı satın alma | Online satın alma henüz açılmadı. |

Eski waitlist'in sahte kod üretimi ve **Hizmeti Satın Al** düğmesi kaldırıldı. Public profil bağlantıları kapalı ödeme varken **Hizmeti İncele / Hizmetleri Keşfet** der. Yeni teklif toplama akışı eklenmedi. Ana sayfa kartları fotoğraf, ad ve bir kısa açıklamayla sınırlandı. Türkçe metinlerde kırpma ve rastgele hece bölme kaldırıldı.

## 5. Kategoriler ve fotoğraflar

Bağlı projenin anonim okumasında aşağıdaki **11 aktif kategori** doğrulandı. Aktif kategori keşfi, hizmetin bugün satın alınabilirliğinden ayrıldı; kategori keşfedilebilir olsa bile kapalı kategori/hizmet için satış koşulları açılmaz.

| Kategori slug | Mevcut lisanslı yerel fotoğraf |
| --- | --- |
| `tesisat` | `plumbing-work.webp` |
| `elektrik-hizmeti` | `electrical.webp` |
| `temizlik` | `cleaning.webp` |
| `boya-badana` | `painting.webp` |
| `mobilya-montaj` | `furniture.webp` |
| `klima-beyaz-esya` | `appliance.webp` |
| `hali-yikama` | `carpet.webp` |
| `cilingir` | `locksmith.webp` |
| `nakliye-yardimi` | `moving.webp` |
| `bahce-bakimi` | `garden.webp` |
| `havuz-bakimi` | `pool.webp` |

Yeni stok veya yapay usta fotoğrafı eklenmedi. Mevcut kaynak/lisans kayıtları `docs/service-photo-licenses.md` içinde korunur. [Pexels lisansı](https://www.pexels.com/license/) bu oturumda yeniden okundu. Stok kişiler FUWU ustası veya müşteri olarak tanıtılmaz. Bilinmeyen kategoriye başka mesleğin fotoğrafı verilmez; nötr ikon davranışı korunur. Yerel WebP, responsive `next/image`, lazy loading ve mevcut font bütçesi korunur.

## 6. Usta başvurusu ve Partner

Mevcut gerçek backend başvurusu, hesaba bağlama, dosya yükleme, admin incelemesi ve başvuru durumu ekranları korundu. Mobil bölüm düzenine **Devam Et** ve adım bazlı doğrulama eklendi. Son gönderimde hata varsa ilk hatalı bölüm açılır ve alan odaklanır. Masaüstünde bilgiler birlikte incelenebilir.

Başvuru ad/iletişim, meslek, başlangıç ilçesi, deneyim, çalışma düzeni ve belgeleri içerir. Başlangıç ilçesi başvuruda seçilir; onay sonrası mevcut mağaza akışındaki çoklu hizmet ilçeleri ve takvim yönetimi korunur. Profil, yalnızca başvurunun alınmasıyla kamuya açılmaz.

Partner faydaları: **Teklif için ücret yok. Fiyatını sen belirle. Takvimin senin kontrolünde.** Mevcut modelde teklif gönderme ücreti akışı bulunmuyor; hizmet kapsamı/fiyatı, bölgeler ve takvim mağaza kaydıyla yönetiliyor. Kullanım şartlarına bu model, varsayılan oranlar, işlem kesintileri ve kazanç garantisi verilmediği eklendi; kapalı satın alma durumu da açıklandı. Komisyon varsayılanı %10, müşteri platform ücreti varsayılanı %0 olarak korunur; mevcut yetkili işlem ayarları ve değişmez sipariş fiyat anlık görüntüleri yeniden yazılmadı. Sözleşmenin ticari/hukuki son hali şirketleşme öncesi ayrıca tamamlanmalıdır.

Canlı Auth/başvuru/admin E2E testi, doğrulanmış test Supabase ortamı olmadığı için tamamlanmış sayılmadı.

## 7. Müşteri açılış kaydı

`/waitlist` artık satın alma yönlendirmesi veya yerel örnek kod üretmez. Gerçek kayıt için ayrı sunucu işlemi ve DB RPC'leri hazırdır:

- E-posta, giriş yapılan hesabın **doğrulanmış** adresinden DB tarafında alınır. İstemciden başka birinin adresi kabul edilmez. İlçe ve kategori isteğe bağlıdır. Ad veya telefon istenmez.
- Aydınlatma bağlantısı ile isteğe bağlı e-posta iletişim izni ayrı sunulur. Önceden seçili onay yoktur. İzin tarihi ve metin sürümü sunucuda kaydedilir.
- UUID/aktif tercih doğrulaması, honeypot, kullanıcı başına kalıcı 5 kayıt/saat limiti ve benzersiz hesap kaydı bulunur. Tekrar gönderim yeni lead oluşturmaz; izin geçmişi ayrı append kayıtlarıdır.
- Gerçek DB UUID'si dönmeden başarı mesajı gösterilmez. Eksik tablo/RPC/ağ hatası başarıya dönüştürülmez.
- Kullanıcı aynı hesapla iletişim iznini geri çekebilir. Yeni kayıt kapalıyken de geri çekme işlemi korunur. Geri çekilen kayıt aktif ilgi sayısından çıkar.
- Anonim okuma/yazma ve başka kullanıcının kaydına erişim kapalıdır. Kullanıcı yalnızca kendi kaydını okur; sayımlar ve yönetim yetkilidir.

**Varsayılan durum kapalıdır:** migration uygulanmalı, KVKK/operasyon bilgileri tamamlanmalı ve yetkili admin `launch_interest_enabled` ayarını açmalıdır. Bu oturumda uzakta açılmadı. E-posta gönderim servisi veya gönderildi iddiası eklenmedi.

[KVKK Kurumu'nun aydınlatma açıklaması](https://www.kvkk.gov.tr/Icerik/2033/Aydinlatma-Yukumlulugu-) ve [ayrı aydınlatma/rıza ilkeleri](https://www.kvkk.gov.tr/Icerik/4132/aydinlatma-yukumlulugunun-yerine-getirilmesinde-uyulacak-usul-ve-esaslar-hakkinda-teblig) dikkate alındı. Veri sorumlusunun kesin kimliği, veri alıcıları/aktarım koşulları, hukuki sebep ve saklama/imha süresi tamamlanmadan bu taslak nihai hukuki uyum onayı sayılmaz. Bu eksikler nedeniyle kayıt kendiliğinden açılmaz.

## 8. Admin hazırlık paneli

Ana ekran üç alana ayrıldı: **Usta Ağı**, **Müşteri İlgisi**, **Lansman Hazırlığı**. Usta metrikleri açıkça gerçek olarak sınıflandırılan yayın/başvuru ilişkilerinden; müşteri ilgisi aktif izinli kayıtlardan gelir. Sınıflandırılmamış profiller ayrı gösterilir. Yeni başvurular mevcut başvuru inceleme kuyruğunda bulunur; incelenmeden “gerçek usta” toplamına eklenmez.

Pilot bölümleri Kadıköy, Üsküdar ve Ataşehir için aktif odak kategorilerini kullanır. İncelenmiş başvuru, yayındaki usta, kanıta bağlı belge doğrulaması, hizmet paketi, açık takvim ve izinli ilgi ayrı ölçülür. Paket ve takvim sayımları ustanın asıl ilçesiyle sınırlanmayıp gerçek hizmet bölgelerini dikkate alır. Bölgeler mobilde açılabilir kartlardır. Sahte talep veya sipariş üretilmez; satış otomatik açılmaz.

Şirket/ödeme durumu manuel, testler ise tarihli kanıt referansı olarak tutulur. Kanıt girilmesi otomatik “Hazır” durumu üretmez. İyzico, Google, staging migration veya güvenlik kanıtı yoksa eksik olduğu yazılır. Ayarlar ödeme açmaz.

Kategori görüntüleme, Usta Ol dönüşümü ve akış terk oranı için doğrulanmış ölçüm bulunmadığından sayı üretilmedi. Mevcut izin kontrollü analytics korundu; Vercel Analytics/Speed Insights da açık rıza sonrasına alındı. Analytics kapalıysa gereksiz çerez popup'ı gösterilmez. Kişisel izleme izinsiz başlatılmaz.

## 9. Backend ve bağlı şema engelleri

Hazırlanan yeni migration: `supabase/migrations/20261030000100_prelaunch_trust_and_interest.sql`. Yalnızca geçici **yerel PostgreSQL** üzerinde çalıştırıldı. Gerçek Supabase staging/production'a uygulanmadı.

Mevcut ödeme, slot, tutar, komisyon, iade, hak ediş ve OAuth uygulamaları korundu. Sunucu tarafındaki `FUWU_SANDBOX_CHECKOUT_ENABLED` varsayılan kapalıdır. Kapalıyken yeni commerce sipariş/checkout ve eski iyzico checkout uçları ödeme başlatmaz. Mevcut callback ve sonuç uzlaştırma yolları kapatılmadı. Anahtar açılsa da mevcut sandbox origin ve ödeme URL kontrolleri canlı iyzico'ya izin vermez. **Canlı ödeme açılışı bu çalışmanın parçası değildir.**

Bağlı public projede salt okunur sorgu sonuçları:

| Denetim | Sonuç / anlamı |
| --- | --- |
| `service_catalog`, `service_variants`, favoriler | `404/PGRST205`; API şemasında bulunamadı |
| Kategori görünürlük/ücret sütunları | `400/42703`; beklenen kolon sözleşmesi eksik |
| Sipariş commerce/fiyat alanları | `400/42703`; `orders` tablosu var fakat beklenen sözleşmeyle uyuşmuyor |
| Yorum kaynak alanları | `400/42703`; doğrulanmış işlem kaynağı sözleşmesi eksik |
| Yayın incelemesi/usta mağazası/takvim tabloları | `404/PGRST205` |
| Google auth ayarları | `200`, `google_enabled=true`; gerçek login testi değildir |
| OpenAPI metadata | `401`; tam şema/ledger bilinmiyor |
| Yetkili DB, doğrulanmış staging ve iyzico test anahtarları | Bu görev için kullanıma hazır değil |

Yerel `.env.local` adresinin canlı deployment'a karşılığı ayrıca doğrulanmadı. **Bu bulgular görmezden gelinmedi; lansman engelidir.** Mevcut uzak `orders` yapısı farklı olduğundan bütün migration dosyaları production'a körlemesine yeniden çalıştırılmamalıdır. Önce gerçek şema ve migration ledger alınmalı, anonimleştirilmiş staging kopyasında veri koruyan uyarlama planı denenmelidir. Sadece son migration'ı çalıştırmak eksik eski commerce altyapısını kurmaz.

## 10. Test sonuçları

| Komut / doğrulama | Sonuç | Sınır |
| --- | --- | --- |
| `npm run test:unit` | **PASS — 93 test** | Yerel unit |
| `npm run test:security` | **PASS — 33 test + statik kontrol + npm audit** | Audit: 0 bildirilen zafiyet; dinamik production güvenlik taraması değildir |
| `npm run test:integration` | **PASS — 240 kontrol** | 67 migration; temiz kurulum ve dolu şema yükseltmesi; geçici PostgreSQL |
| `npm run test:mock` | **PASS — 77 kontrol** | Ödeme/Auth/fault injection mock regresyonları; gerçek servis değildir |
| `npm run typecheck` | **PASS** | TypeScript |
| `npm run check:lint` | **PASS** | ESLint |
| `npm run check:build` | **PASS** | Yerel production build; deploy değildir |
| `npm run test:http` | **PASS — 20 kontrol** | Gerçek yerel Next production HTTP; dış entegrasyonlar kapalı |
| `node scripts/verify-prelaunch-ui.mjs --before` | **PASS — 28 rota/genişlik kontrolü** | Eski GitHub commit'i + izole fixture |
| `node scripts/verify-prelaunch-ui.mjs` | **PASS — 36 rota/genişlik kontrolü** | Public sayfalar + sentetik admin UI; gerçek hosted Auth/RLS E2E değildir |
| `npm run test:e2e:commerce` | **BLOCKED** | Doğrulanmış/izinli Supabase Auth/DB test ortamı yok; yazma testi çalıştırılmadı |
| Gerçek Google OAuth / iyzico sandbox | **TEST EDİLMEDİ** | PASS raporlanmadı |
| Production migration ledger, tam RLS/Storage envanteri | **BLOCKED** | Yetkili erişim ve staging gerekir |

Ana sayfa ve yetkili admin fixture ekranı **320, 360, 375, 390, 430, 768, 1024, 1440px** genişliklerde kontrol edildi. Hizmetler, ustalar, başvuru, ön kayıt ve anonim admin erişimi ayrıca 320/390/768/1440px kontrol edildi. Yatay document taşması ve browser pageerror yok. Test tüm 11 aktif fixture kategorisini, kategori linkini, eski bandın yokluğunu, boş usta durumunu, yetkisiz erişimi ve kullanılamayan formun kapalı kalmasını kontrol eder.

PostgreSQL testleri, veri korumaya ek olarak doğrulanmış e-posta, izin sürümü, gerçek UUID dönüşü, RLS, tekrar kayıt, izin geri çekme, kalıcı rate limit, seed yayın yasağı ve sadece duyuru temizleme işlemini çalıştırır. Canlı kullanıcı/sipariş/ödeme kaydına test yazılmadı.

İlk sandbox localhost/derleme dosyası erişim sorunları gerekli yerel erişimle giderildi. Dev sunucusu ile build aynı üretilen tip dosyalarını eşzamanlı değiştirince oluşan ara build hatası, dev kapatılıp build tek başına çalıştırılarak giderildi. Yukarıdaki tablo son başarılı sonuçları ve devam eden gerçek engelleri gösterir.

Makine kanıtları: `artifacts/security-testing/*-result.json`, `artifacts/prelaunch/{before,after}/responsive.json`, `artifacts/prelaunch/data-audit.json`, `artifacts/backend-reliability/external-readonly.json`. Farklı paketler kendi çalıştırma zamanını/kaynak hash'ini taşır; buradaki yerel sonuçlar bütün üretim release kapılarının açıldığı anlamına gelmez.

## 11. Önce / sonra ekran görüntüleri

Her iki sürüm de aynı yerel kategori fixture'larıyla çekildi. Gerçek production verisi veya gerçek admin oturumu görüntüleri değildir. “Önce” klasörü başlangıç GitHub commit'inden çıkarılan ayrı kodu kullanır. Görsellerdeki sabit alt navigasyonun uzun ekran görüntüsünün ilk viewport kısmında görünmesi normaldir.

| Ekran | Önce | Sonra |
| --- | --- | --- |
| Ana sayfa 390px | `artifacts/prelaunch/before/home-390.png` | `artifacts/prelaunch/after/home-390.png` |
| Ana sayfa 1440px | `artifacts/prelaunch/before/home-1440.png` | `artifacts/prelaunch/after/home-1440.png` |
| Hizmetler 390px | `artifacts/prelaunch/before/services-390.png` | `artifacts/prelaunch/after/services-390.png` |
| Ustalar 390px | `artifacts/prelaunch/before/providers-390.png` | `artifacts/prelaunch/after/providers-390.png` |
| Usta başvurusu 390px | `artifacts/prelaunch/before/provider-application-390.png` | `artifacts/prelaunch/after/provider-application-390.png` |
| Ön kayıt 390px | `artifacts/prelaunch/before/waitlist-390.png` | `artifacts/prelaunch/after/waitlist-390.png` |
| Admin hazırlığı 390/1440px | Önceki anonim erişim ekranı ayrı çekildi | `artifacts/prelaunch/after/admin-390.png`, `admin-1440.png` — sentetik yetkili fixture |

### Önce — mobil

![Önce: ana sayfa 390px](C:/Users/Melikezana/Desktop/FUWU/artifacts/prelaunch/before/home-390.png)

### Sonra — mobil

![Sonra: ana sayfa 390px](C:/Users/Melikezana/Desktop/FUWU/artifacts/prelaunch/after/home-390.png)

### Sonra — admin hazırlığı

![Sonra: admin hazırlığı 390px, sentetik oturum](C:/Users/Melikezana/Desktop/FUWU/artifacts/prelaunch/after/admin-390.png)

## 12. Açık kalan işler ve onay sınırı

1. Bağlı projenin deployment kimliğini, yetkili schema dump'ını, migration ledger'ını ve Storage/FK bağımlılıklarını doğrula. Şu an hiçbir uzak kaydın ilişkilerinin tamamen boş olduğu söylenemez.
2. Dört public ID'nin gerçek/test kaynağını yönetici kanıtıyla eşleştir. Tam ID/bağımlılık listesi ve yedek görülmeden production silme onayı isteme; doğrulanmamış gerçek kullanıcıyı silme.
3. Gerçek staging ortamında eski commerce şemasıyla uyarlama planını doğrula. Yerel 67 migration başarısı, farklı production şemasına otomatik uygulanabilirlik kanıtı değildir.
4. Veri sorumlusu, saklama/imha, aktarım ve iletişim operasyonu bilgilerini tamamla. Sonra staging'de gerçek kayıt/geri çekme/admin görünümü kontrol edilerek açılış kaydını yetkili ayarla aç.
5. Gerçek Google OAuth dönüşü, doğrulanmış hesaba başvuru, admin incelemesi ve iyzico sandbox ödeme/refund akışlarını ayrı test kanıtlarıyla tamamla.
6. İzinli analytics yapılandırması doğrulandıktan sonra dönüşüm/terk raporlarını gerçek veriye bağla. Şu an bu oranlar uydurulmaz.
7. Ticari sözleşmeler, komisyon/ücret bildirimleri ve pilot operasyon kuralları şirketleşme/iyzico onayıyla tamamlanmalı. Canlı işlem açılışı için ayrı değişiklik ve açık onay gerekir.

**Production migration, veri silme, Git commit/push ve deployment için ayrıca açık onay gerekir. Bunların hiçbiri bu oturumda yapılmadı.**

## Ürün araştırması ve karar gerekçesi

FUWU'nun hedef modeli: **Hizmeti seç + Ustayı seç + Zamanını seç + Satın al.** Aşağıdaki kaynaklar ürün kararına girdi sağladı; kullanıcı araştırması veya dönüşüm istatistiği olarak sunulmadı.

- [Armut — nasıl çalışır](https://armuttr.zendesk.com/hc/tr/articles/24502626742812-Armut-nas%C4%B1l-%C3%A7al%C4%B1%C5%9F%C4%B1r): teklif ve anında rezervasyon modelleri birlikte var. FUWU için rakibin rezervasyon sunmadığı iddia edilmedi.
- [Taskrabbit — usta seçimi ve takvim](https://support.taskrabbit.com/hc/en-us/articles/46260422073755-How-Do-I-Hire-a-Tasker): profil, ücret ve uygun gün/saat bilgisi kararın parçası. FUWU'da usta seçimi ödeme öncesinde açık kalır; onay/rezervasyon koşulları aynıymış gibi genellenmez.
- [Airbnb — Instant Book](https://www.airbnb.com/help/article/523): uygun ilanlarda önceden belirlenmiş koşullarla anlık rezervasyon. FUWU'da gerçek slot/uygunluk doğrulanmadan randevu sözü verilmez.
- [Booking.com — fiyatların gösterimi](https://developers.booking.com/demand/docs/accommodations/display-prices) ve [fiyat sözleşmesi](https://developers.booking.com/demand/docs/accommodations/pricing-faqs): toplam tutar ve ücret bileşenleri açık olmalıdır. FUWU'nun mevcut sunucuda hesaplanan ücret anlık görüntüsü korundu.
- [Urban Company — standart hizmet paketleri](https://www.urbancompany.com/bangalore-professional-home-cleaning): kapsam, süre ve paket seçimi görünür. FUWU'da kapsamı ve fiyatı belirsiz yeni teklif akışı açılmadı.
- [Getir — geliştirici ürün açıklaması](https://apps.apple.com/tr/app/getir-groceries-food-beyond/id995280265): kategori keşfi, kısa alışveriş akışı ve erişilebilir destek ürünün parçaları. Getir web sitesi bu oturumda 403 verdi; uygulamanın birebir son ekran akışı test edilmiş gibi raporlanmıyor. FUWU için az adım ve tek elle kullanım kendi tasarım kararıdır.

Mobil erişilebilirlik için mevcut FUWU tasarım sistemi, yerel Inter ve UI/UX Pro Max rehberi kullanıldı. Turuncu-beyaz marka sistemi korundu; yeni dekoratif animasyon, sahte sosyal kanıt veya ek pazarlama alanları üretilmedi.
