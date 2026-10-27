# FUWU — Phase 1 tasarım ve doğrulama raporu

Başlangıç: **26 Ekim 2026**. Son kontrol: **28 Ekim 2026**.

## Sonuç ve çalışma kapsamı

Mevcut `melikezana/fuwu` uygulamasında çalışıldı. Repo: `C:\Users\Melikezana\Desktop\FUWU`. Ana sayfa ve katalog, hizmet seçmeye ve randevu planlamaya odaklanan mobil arayüze dönüştürüldü. Mevcut logo, FUWU turuncusu, yerel Inter fontları, gerçek usta verileri ve satın alma altyapısı korundu.

Yeni site veya ayrı ürün oluşturulmadı. Ödeme ve veritabanı mimarisi değiştirilmedi. Bu çalışma sırasında commit, push ve production deployment yapılmadı. Başlangıçta görülen ödeme/oturum/operasyon değişiklikleri geri alınmadı. Devam edildiğinde repo HEAD’i `de0ec95` idi; bu commit bu çalışma tarafından oluşturulmadı. Önceki 21 dosyanın içeriği hash ile kontrol edilerek korundu.

## Denetim ve başlangıç bulguları

Başlıca kaynaklar: `src/app/page.tsx`, `MarketplaceHome`, `HeroSection`, `HeroSearch`, `PopularServices`, `CategoryCard`, `HomePremiumPanels`, `ServiceCatalog`, `ProviderCard`, `ProviderFilters`, `Navbar`, `MobileBottomNav`, `MobileAppShell`, `Footer`, ortak Button/Dialog/Skeleton bileşenleri ve dört mevcut CSS katmanı.

Mevcut yolculuk: ana sayfa → katalog/usta listesi → hizmet ve usta seçimi → ilçe → gerçek müsaitlikten gün/saat → adres → sipariş özeti → giriş/ödeme → Siparişlerim. Eski `/request` yolu mevcut katalog yönlendirmesiyle korunur.

| Bulgu | Yapılan değişiklik |
| --- | --- |
| Hero metni briefteki metinden farklıydı; arama kutusu büyük bir panel ve tam genişlik CTA ile fazla yer kaplıyordu. | İstenen başlık, alt başlık ve placeholder uygulandı. Birincil “Hizmetleri Keşfet”, ikincil “Usta Ol”; altında doğrudan kategori seçimi. |
| Kategoriler statik on kategoriden geliyordu; katalogda aktif kategori/hizmet olup olmadığıyla bağlantılı değildi. | Aktif katalog kategorileri esas alındı. Katalog bağlantısı yokken yalnızca mevcut dört kapsam önizlemesi gösterilir; fiyat/usta/müsaitlik uydurulmaz. |
| Mobil kategori filtre şeridinin bazı düğmeleri ekran dışında kalıyordu. | Ana sayfada bütün kategoriler iki sütunlu grid ile erişilebilir; katalog kategori bağlantıları satır kaydırır. |
| `overflow-wrap: anywhere` başlık ve Türkçe kelimeleri gelişigüzel bölebiliyordu. | Genel metin güvenliği `break-word` ile düzenlendi; başlık ve kontrollerde normal kelime bölünmesi, yeterli alan ve doğal satır kaydırma kullanıldı. |
| `globals.css`, `marketplace.css`, `commerce.css`, `fusion.css`, `premium.css` içinde farklı renk/radius/gölge değerleri vardı. | `premium.css` ürün token’ları üzerinden yeni yüzeyler, vurgu metni, CTA üzeri yazı ve bölüm aralıkları birleştirildi; aynı dosyadaki eski ana sayfa override’ları yenilendi. |
| Mobil orta sekme özel turuncu “Usta Bul” aksiyonu, hesap sekmesi “Profil” idi. | Eşit ağırlıklı beş sekme: Ana Sayfa, Hizmetler, Ustalar, Siparişlerim, Hesabım. Usta ve admin sekme tanımları korundu. |
| Ödeme sandbox bilgisi ilk hizmet keşfinde yeterince görünür değildi. | Ana sayfa, katalog ve mevcut randevu özeti gerçek tahsilat yapılmadığını açıklar. Canlı ödeme, sigorta veya garanti vaadi eklenmedi. |
| İlk sabit masaüstü performans ölçümünde katalog yüklenirken footer görünür alandan kayıyordu. | `services/loading.tsx` yükleme iskeletine en az ekran yüksekliği ayrıldı. Footer’ın içerik akışı sırasında sıçramasının kaynağı LayoutShift observer ile doğrulandı. |

Başlangıç görünümünde global yatay taşma bulunmadı; buna rağmen kategori filtre şeridindeki ekran dışı kontroller ve `overflow-x: clip` nedeniyle yalnızca belge genişliği yeterli kontrol sayılmadı. Son denetimde kritik kontrollerin kendi sınırları da kontrol edildi.

## Görsel kimlik ve hareket

- Mevcut `FuwuLogo` korundu. Ana aksan `#FF6500`; CTA üzerinde koyu yazı, küçük vurgu metninde `#A94300` kullanılır.
- Beyaz ve açık yüzeyler, koyu başlıklar, hafif kenarlık ve gölgeler; mevcut Inter ailesi ve ikon sistemi kullanıldı.
- Masaüstü hero, tesisat/elektrik/temizlik/boya fotoğraflarından kolaj içerir. Mobilde arama ve dört kategori seçeneği önce gelir; iki fotoğraflık daha kısa kompozisyon kullanılır.
- Canlı ana sayfada başlangıçta da 3D canvas yoktu. Eski referans `public/reference/fuwu-target-design.jpg`, Meshy görselleri, `HomeInteractiveVisuals` içindeki tilt/perspective kodu ve ThreeDIcon arşiv kaynakları belirlendi. Yeni müşteri ana sayfası bunları yüklemez. Kullanılmayan dosyalar ve paketler topluca silinmedi.
- Global sayfa giriş animasyonu ve özel uygulama splash’ı layout’tan çıkarıldı. İşlevsel, kısa kontrol geçişleri ve reduced-motion desteği korunur.
- Önceki Instagram görseli bulunamadı. Eski 3D mockup’ın Instagram görseli olduğu iddia edilmedi; mevcut marka ve lisanslı gerçek fotoğraflar esas alındı.

## Güncellenen sayfa ve bileşenler

| Alan | Dosyalar / davranış |
| --- | --- |
| Ana sayfa | `MarketplaceHome`, `HeroSection`, `HeroSearch`, `PopularServices`, `CategoryCard`, `HomePremiumPanels`: arama, aktif kategori bağlantıları, kısa fotoğraf kolajı ve beş adımlı anlatım. |
| Hizmet kataloğu | `src/app/services/page.tsx`, `ServiceCatalog`: aktif kategori gezintisi, Türkçe arama, ilçe kapsamına uygun fiyatlar, fiyat türü/satış durumu filtreleri, alt panel, sonuç sayısı ve boş/hata durumları. |
| Katalog yükleme | `src/app/services/loading.tsx`: footer kaymasını önlemek için yükleme alanı ayrılır. |
| Veri ile sunum arasındaki eşleme | `src/lib/commerce/catalog-navigation.ts`: aktif kategoriler, mevcut önizleme eşlemesi, Türkçe arama, ilçe ve geçerli fiyat kontrolü. Veritabanı sözleşmesi değişmedi. |
| Usta kartları | Mevcut `ProviderCard` verileri, favori, profil, doğrulama ve satın alma bağlantıları korunur; ortak kart yüzeyi/gölge ve metin kuralları uygulandı. Sahte usta, fotoğraf veya puan eklenmedi. |
| Navigasyon ve footer | `Navbar`, `MobileBottomNav`, `Footer`: daha kısa masaüstü menü, müşteri sekme adları ve Siparişlerim erişimi; mevcut auth ve rol davranışları korunur. |
| Ortak kabuk | `src/app/layout.tsx`: içeriğe geç bağlantısı ve odaklanabilir main; gereksiz giriş/splash kaldırıldı. |
| Ortak UI | `dialog.tsx`: alt sekmelerin üzerinde açılan, safe-area uyumlu panel. `Skeletons.tsx`: dar ekranda taşmayan esnek placeholder’lar. |
| Stil | `globals.css`, `premium.css`: kelime bölünmesi, ortak token’lar, responsive düzen, odak ve dokunma davranışları. Yeşil birincil CTA eklenmedi; mevcut yeşil başarı durumları korundu. |
| PWA | `manifest.ts`: kimlik, scope, Türkçe açıklama/dil, standart 192px ikon ve 512px maskable ikon. |

## Fotoğraflar ve lisanslar

Ayrıntılı kaynaklar, boyutlar, kullanım ve doğrulama kapsamı: [ASSET_CREDITS.md](ASSET_CREDITS.md).

Bu çalışmada Pexels 32588548 kaynağı yeniden indirildi; `hero-plumbing.webp` 960×1080 WebP olarak oluşturuldu. Diğer uygun gerçek hizmet fotoğrafları mevcut projeden yeniden kullanıldı. Kaynaklar ve ticari kullanım şartları belgede bağlantılıdır. Stok fotoğraflar gerçek FUWU ustası veya müşteri değerlendirmesi olarak sunulmaz.

Fotoğraflar yerel dosyadır. `next/image`, responsive `sizes`, ayrılmış görsel alanları ve lazy loading kullanılır; yalnızca ilk hero fotoğrafı önceden yüklenir. Yeni fotoğrafın yeniden üretimi: `node scripts/prepare-phase1-hero.mjs`.

## Testler ve kanıtlar

Hedef genişlikler: **320, 375, 390, 430, 768, 1024 ve 1440px**. Ayrıca 844×390 yatay ekran, %150 metin boyutu ve 24px safe-area alt payı kontrol edildi.

| Kontrol | Sonuç |
| --- | --- |
| TypeScript, `tsc --noEmit --incremental false` | Geçti. Production build’in TypeScript adımı da geçti. |
| Tam `npm run lint` | Geçti. Son eklenen doğrulama betikleri ayrıca lint edildi. |
| `npm run build` | Geçti; son yükleme iskeleti düzeltmesinden sonra yeniden doğrulandı. |
| `scripts/test-phase1-design.ts` | 5 regresyon grubu geçti: aktif/pasif kategori, boş canlı katalog, önizleme, Türkçe arama ve ilçe/fiyat uygunluğu. |
| Production Playwright | 11 rota × 7 genişlik = **77** yerleşim kontrolü. Kritik kontrollerde kesilme veya yatay taşma yok. |
| Etkileşim ve erişilebilirlik | Arama aktarımı, ilk ekrandaki CTA, beş müşteri sekmesi, 44px kontroller, filtre alt paneli, odak döngüsü, Escape/odak dönüşü, empty state temizleme ve mobil menü geçti. |
| Auth/navigasyon | 7 korumalı müşteri/usta/admin yolu misafir kullanıcıyı girişe yönlendirdi. |
| Resim ve link taraması | Görünen resimlerde kırık kaynak yok; **43** benzersiz iç bağlantı/anchor çözümlendi. Runtime/hydration hatası yok. |
| PWA | Manifest, scope/start URL, turuncu tema, PNG ikonlar, Apple ikonu, viewport-fit ve kullanıcı zoom’u geçti. |
| Mevcut ticaret regresyonları | `verify-direct-commerce.mjs` fixture modunda **13** kontrol grubu ve **40** screenshot ile geçti; hata yok. |

Ticaret regresyonları, açıkça TEST olarak etiketli yerel bileşen verileri ve taklit API yanıtları kullanır. Gerçek sipariş/ödeme veya mağaza değişikliği oluşturulmadı. Randevu/ustayı seçme, varyant fiyatı, saat hatası/boş gün, adres ve giriş taslağı, sipariş durumları, teslim kodu, mağaza, admin salt okunur görünümü, favoriler ve değerlendirmeler kapsandı. Bu sonuçlar canlı banka veya gerçek kullanıcıyla uçtan uca doğrulama olarak sunulmaz.

Son makine çıktıları: `artifacts/phase1/production-tests.json`, `performance.json`, `commerce-regression/browser-tests.json`, `validation-summary.json`.

Son doğrulama koşusunda başarısız kontrol yoktur. Doğrulanamayan canlı senaryolar aşağıdaki kalan sınırlar bölümünde belirtilir.

## Screenshot yolları

| Kanıt | Repo içindeki yol |
| --- | --- |
| Önceki mobil ana sayfa | `artifacts/phase1/screenshots/before/home-390-viewport.png` |
| Önceki masaüstü ana sayfa | `artifacts/phase1/screenshots/before/home-1440-viewport.png` |
| Yeni mobil ana sayfa | `artifacts/phase1/screenshots/after/home-390-viewport.png` |
| Yeni masaüstü ana sayfa | `artifacts/phase1/screenshots/after/home-1440-viewport.png` |
| Yeni katalog / usta listesi / hizmet / giriş / Usta Ol | `artifacts/phase1/screenshots/after/{catalog,providers,service,login,join}-{390,1440}[-viewport].png` |
| Filtre alt paneli | `artifacts/phase1/screenshots/after/catalog-filter-sheet-390.png` |
| Büyük metin / yatay ekran | `artifacts/phase1/screenshots/after/home-text-150-percent-390.png`, `home-landscape-844.png` |
| Ticaret ekranları — açıkça test verisi | `artifacts/phase1/commerce-regression/fixture-*.png` |

Önceki ekranlar 26 Ekim’de, son production ekranları 28 Ekim’de kaydedildi. Eski ana sayfa/katalog/usta listesi için 12, son production için 27, bileşen regresyonları için 40 görüntü teslim kanıtına dahil edilir. Tam sayfa ve viewport dosyaları ayrı tutulur.

## Performans

Sabit viewport’ta yeni tarayıcı bağlamıyla yerel production sunucusundan örnekler alındı. CPU/ağ kısıtlaması uygulanmadı; bunlar saha Core Web Vitals veya mobil cihaz performans garantisi değildir. Responsive test boyunca boyut değiştirilerek biriken ölçümler değerlendirmeye alınmadı; esas dosya `performance.json`’dır.

| Sayfa / genişlik | LCP örneği | CLS örneği |
| --- | --- | --- |
| Ana sayfa / 390px | 1.084 ms | 0,000086 |
| Katalog / 390px | 572 ms | 0,000086 |
| Ana sayfa / 1440px | 1.008 ms | 0,000155 |
| Katalog / 1440px | 1.092 ms | 0,000150 |

Katalog masaüstündeki footer kayması düzeltme öncesinde yaklaşık **0,193 CLS**, sonrasında **0,00015 CLS** olarak ölçüldü. Önceki kaymanın öğe kaydı `performance-before-catalog.json` dosyasındadır. İlk yükte ana sayfa yaklaşık 344 KiB, katalog 334 KiB JavaScript aktardı; görsellerde Next.js’in boyuta uygun yerel çıktıları kullanıldı.

Kod incelemesindeki kalan performans noktaları: legacy CSS katmanları halen mevcut; global auth bilgisi navbar ve alt sekmeler tarafından ayrı isteniyor; herkese açık ayar fetch’inde açık timeout bulunmuyor. İlk yük JavaScript maliyeti daha sonraki optimizasyon aşamasında incelenebilir. Bu aşamada ödeme/veritabanı veya ortak oturum mimarisi yeniden yazılmadı.

## Kalan sınırlar

- Yerel katalog bağlantısı kullanılamadığı için gerçek fiyat, aktif usta ve randevu müsaitliğiyle canlı satın alma doğrulanamadı. Uygulama bu durumda kapsam önizlemesi gösterir ve satın almayı açmaz.
- Ödeme hâlâ iyzico sandbox’tır; gerçek tahsilat yoktur. Canlı ödeme, sigorta ve garanti vaadi eklenmedi.
- Service worker kayıt sayısı **0**. Manifest ve mobil kabuk doğrulandı; çevrimdışı katalog, offline sipariş/ödeme ve fiziksel iOS/Android kurulum testi bu teslimde yoktur.
- Gerçek oturumlarla tüm admin/usta sayfalarına erişilmedi; korumalı yönlendirmeler gerçek uygulamada, ticaret davranışları yerel fixture’larda test edildi.
- Arşiv 3D/cartoon varlıkları ve kullanılmayan eski bileşenler dosya olarak durur; yeni ana sayfada yüklenmez. Genel bağımlılık/CSS temizliği ayrı bir bakım işi olarak kalır.

## Yeniden çalıştırma

Repo kökünde:

```powershell
node node_modules/typescript/bin/tsc --noEmit --incremental false
npm run lint
npm run build
node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3028
```

Başka terminalde, yerel sunucu hazır olduktan sonra:

```powershell
node node_modules/tsx/dist/cli.mjs scripts/test-phase1-design.ts
node scripts/verify-phase1-design.mjs
node scripts/measure-phase1-performance.mjs
```

Mevcut ticaret fixture paketi:

```powershell
$env:COMMERCE_FIXTURE_ONLY='true'
$env:COMMERCE_OUTPUT_DIR='artifacts/phase1/commerce-regression'
$env:PLAYWRIGHT_BROWSERS_PATH="$env:LOCALAPPDATA\ms-playwright"
node scripts/verify-direct-commerce.mjs
```

Production denetimi varsayılan olarak mevcut Edge tarayıcısını Playwright ile kullanır. Farklı port için `PHASE1_BASE_URL`, farklı çıktı dizini için `PHASE1_OUTPUT_DIR` ayarlanabilir.
