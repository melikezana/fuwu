# FUWU — Doğrudan hizmet satın alma ve rezervasyon

21 Ekim 2026. Değişiklikler çalışma klasöründe. Commit, push ve deployment yapılmadı. Hedef Supabase projesine migration uygulanmadı; gerçek kullanıcı verisine test siparişi, fiyat, yorum veya ödeme yazılmadı. Çalışmaya başlanırken mevcut olan değişiklikler korundu.

## Başlangıçta bulunan eksikler

Mevcut Next.js 16 / Supabase uygulaması `service_requests` üzerinden talep, atama ve teklif fiyatı yönetiyordu. Ustanın `average_price_min/max` alanları satın alınabilir hizmet fiyatı değildi. Haftalık saatler bir metin alanıydı; hesaplanan randevu slotu, izin takvimi, geçici rezervasyon ve eşzamanlı satın alma koruması yoktu. iyzico Checkout Form ve Marketplace yardımcıları, önceki talep ödeme/teslim kodu sistemi ve rol bazlı paneller vardı. Yeni akış bunların yanına eklendi; geçmiş talep ve ödeme kayıtları dönüştürülmedi veya silinmedi.

## Uygulanan satın alma akışı

`/` → `/services?category=…` → `/services/[slug]` → ilçe / paket / usta → gerçek müsait gün ve saat → açık adres → 10 dakikalık rezervasyon + sipariş özeti → iyzico sandbox ödeme sayfası → sunucudan doğrulama → `/orders/[id]`.

- Katalog; hizmet fotoğrafı, kapsam, hariç tutulan işler, fiyatlandırma tipi ve gerçek usta fiyatlarını kullanır. `FIXED_PRICE`, `VARIANT_BASED`, `DIAGNOSTIC_SERVICE` desteklenir. İlk ürün tanımları musluk montajı, klima bakımı (1/2/3 klima), elektrik arıza tespiti ve standart masa montajıdır. Diğer kategoriler için ürün kapsamı ayrıca tanımlanmalıdır.
- Fiyatı/süresi/bölgesi olmayan, kapalı veya onaysız hizmet satın alınamaz. Çalışma saati olmayan ya da izinli ustada uygun slot oluşmaz. Bağlantı yokken sadece açıkça satışa kapalı kapsam önizlemeleri gösterilir. Önizlemelerde usta, ücret, puan veya randevu uydurulmaz.
- Profildeki hizmetler kategori adından türetilmez; yalnızca ustanın gerçekten fiyatlandırdığı teklifler gösterilir. Kullanıcı buradan o ustayla hizmet seçimine geçebilir.
- Varyant fiyatı ve süresi ustanın varyanta ait teklifinden alınır. Tek hizmet / tek usta / tek randevu MVP'si vardır; çoklu hizmet sepeti eklenmedi.
- Adres, hizmet kapsamı, varyant, fiyat, komisyon, usta ve randevu sipariş anında kaydedilir. Sonraki mağaza düzenlemeleri mevcut sipariş sözleşmesini değiştirmez. Ek ücret sıfırdır ve özette açıkça gösterilir.
- `/orders` müşteri geçmişidir. Önceki talepler `/dashboard/requests` üzerinden erişilebilir. Eski `/request` akışı geriye uyumluluk için korunur; yeni satın alma girişleri kataloğa yönlenir.
- Müşteri alt navigasyonu ve hesap bağlantıları satın alma/sipariş akışına bağlandı. Mobilde sabit toplam ve sonraki adım, dokunmatik slot seçimi, yükleme iskeleti, hata/boş durumları ve safe-area desteği vardır.

## Migration ve rezervasyon güvenliği

Yeni migration: `supabase/migrations/20261021000100_direct_service_commerce.sql`.

Yeni tablolar: `service_catalog`, `service_variants`, `provider_service_offerings`, `provider_availability`, `provider_time_off`, `orders`, `payment_transactions`, `order_status_events`, `order_completion_codes`.

Mevcut `profiles`, `providers`, `service_categories`, `districts`, `reviews`, `app_settings` yeniden kullanılır. Tek ürün siparişinde ürün ve fiyat snapshot'ı `orders` satırındadır; ayrıca `order_items` tablosu gerekmiyor. `PENDING_PAYMENT` siparişi, `expires_at` alanıyla slot hold görevini de görür; ikinci bir hold tablosu yoktur.

- Rezervasyon RPC'si önce ustanın veritabanı satırını kilitler. Ardından güncel fiyatı, bölgeyi, hizmet süresini, izinleri, çalışma saatlerini ve çakışan zaman aralıklarını doğrular; siparişi aynı transaction içinde ekler. Yalnızca aynı başlangıç saati değil, kesişen hizmet aralıkları da engellenir.
- Slotlar 15 dakikalık aralıklarla, ustanın kayıtlı saatlerinden hesaplanır. Hizmet çalışma saati bitmeden tamamlanmalıdır. Geçmiş ve 30 dakikadan daha yakın başlangıçlar kapalıdır. Takvim 30 gün ileriyi kapsar. Tüm yerel takvim hesapları `Europe/Istanbul`, saklanan randevular `timestamptz` kullanır.
- Süresi dolan hold, cron çalışmasa bile slot sorgularında anında etkisizdir. Günlük `/api/cron/commerce-expiry` işi yalnızca kalıcı durum temizliği yapar; `CRON_SECRET` zorunludur. Vercel yapılandırması değiştirildi ama yayınlanmadı.
- İstemci idempotency anahtarıyla tekrarlanan rezervasyon aynı siparişi döndürür, süreyi uzatmaz. Değişen seçimle aynı anahtar kullanılırsa reddedilir.
- Eski atanmış işlerde güvenilir hizmet süresi yoktur. Güvenli geçiş için bu işler ilgili günün tamamını kapatır; tarihi belirsiz aktif iş ustanın müsaitliğini kapatır. Bu eski kayıtların tarihi/süresi operasyonel olarak netleştirilmelidir. Yeni eski-tip atamalar da aynı usta kilidiyle commerce siparişleriyle çakışmaya karşı korunur.
- Tüm yeni tablolarda RLS açıktır. Müşteri kendi siparişini, usta kendisine atanmış işi, admin tüm siparişleri görebilir. Sipariş, fiyat ve ödeme alanlarına müşteriden doğrudan INSERT/UPDATE/DELETE yetkisi verilmez. Checkout token'ları müşteriye/ustaya açılmaz; teslim kodu yalnızca müşteriye görünür. SQL fonksiyonlarının varsayılan PUBLIC çalıştırma yetkileri kapatıldı.

## Ödeme ve sipariş yaşam döngüsü

Mevcut iyzico istemcisi ve Marketplace yardımcıları yeniden kullanıldı. Canlı API adresi sunucu tarafında reddedilir; bu değişiklik eski iyzico girişlerini de sandbox ile sınırlar. Kart verisi FUWU'ya gönderilmez/saklanmaz; kullanıcı izin verilen iyzico sandbox alan adına yönlenir.

`PENDING_PAYMENT → CONFIRMED → PROVIDER_ON_THE_WAY → IN_PROGRESS → COMPLETED` ve `CANCELLED`, `PAYMENT_FAILED`, `REFUND_PENDING`, `REFUNDED`, `DISPUTED` durumları desteklenir.

- Sipariş tutarı veritabanındaki sağlayıcı teklifinden gelir. Checkout sırasında istemciden fiyat alınmaz. Komisyon mevcut `commission_rate` ayarından, varsayılan %10 ile kuruş cinsinden hesaplanır; `10` ve `0.10` gösterimleri desteklenir. Platform komisyonu, usta brüt hak edişi ve kuruluşun bildirdiği işlem kesintisi ayrı alanlardadır.
- Ödeme oturumu için tek bir kalıcı başlatma hakkı verilir. Tekrarlanan istek mevcut ödeme URL'sini kullanır veya hazırlık durumunu bildirir.
- Tarayıcı callback'i ödeme kanıtı değildir. Kayıtlı token için iyzico sunucusundan sonuç sorgulanır; token, conversation ID, basket/order ID, TRY, fiyat, ödenen tutar, ürün ve usta payı doğrulanır. Başarılı sonuçta fraud onayı aranır. JSON webhook'unda ayrıca imza doğrulanır. Sonuçlar atomik ve idempotent işlenir.
- Başarısız ödeme slotu bırakır. Süresi dolduktan/iptalden sonra gelen başarılı sonuç randevuyu kesinleştirmez, `REFUND_PENDING` olur; başka müşterinin slotunu alamaz.
- Usta yalnızca sıradaki iş aşamasına geçebilir. Hizmet tamamlama, müşterinin altı haneli teslim kodunu gerektirir. Hatalı kod denemeleri sınırlandırılır. Eski taleplerin teslim kodu sistemi korunur.
- Tamamlamada mevcut Marketplace approve yardımcısı; iptal veya geç ödemede refund yardımcısı çağrılır. Kalıcı işlem claim'i aynı dış işlemin tekrar gönderilmesini önler. İade ancak kuruluşun işlem ID'si, tutarı ve TRY sonucu eşleşirse `REFUNDED` yapılır.
- Ödeme kuruluşuna erişim sırasında sonucu belirsiz kalan hak ediş/iade `IN_FLIGHT` / beklemede tutulur. Körlemesine tekrar gönderilmez. Otomatik mutabakat işçisi bu MVP'de yoktur; iyzico işlem kaydıyla operasyonel mutabakat gerekir. Bu işlemler gerçek sandbox hesabıyla henüz doğrulanmadı.
- Sipariş sonunda mevcut gerçek `reviews` tablosuna değerlendirme eklenebilir. Tamamlanan siparişin sahibi doğrulanır; eski tek müşteri/usta değerlendirme sınırı korunur. Puan gerçek yorumlardan yeniden hesaplanır. Canlı harita veya tahmini varış süresi gösterilmez.

## Usta paneli

`/provider-dashboard/store`: hizmet/varyant fiyatı, süre, satış durumu, hizmet ilçeleri, haftalık saatler ve izin günleri. Seçilen bölgeler bu MVP'de ustanın tüm hizmetlerine uygulanır. Mağaza RPC'si sahipliği ve uzmanlık kategorisini veritabanında doğrular.

`/provider-dashboard/orders`: atanmış satın alımlar, yaklaşan randevular, tamamlanan hizmet sayısı ve test brüt hak edişi. Sipariş detayında tarih, adres, varyant, bedel ve teslim koduyla tamamlama bulunur. Genel bakış, mevcut takvim ve kazanç ekranlarına commerce özeti de eklendi.

## Test kanıtları ve sınırları

- `npm run test:commerce:db`: **25 geçti**. Gerçek yerel PostgreSQL 18, ayrı TCP bağlantıları. Eşzamanlı rezervasyon, çakışan süreler, bölge, çalışma saati, izin, aktif/onaylı usta, fiyat manipülasyonu, eski iş çakışması, RLS, ödeme claim'i, tekrar callback, aşama yetkisi, teslim kodu, yorum, süre aşımı, geç ödeme, iade/hak ediş claim'leri test edildi. İyzico ödeme sonuçları bu testte veritabanına kontrollü test girdisi olarak verilir; gerçek ödeme değildir.
- `npm run test:commerce:payment`: **20 geçti**. Eşleşen/bozulmuş ödeme sonuçları, tutar/para birimi/sipariş/token/usta payı, fraud, imza, canlı ortam engeli ve kimlik doğrulamalı processor sorgusu. HTTP yanıtı mock'tur; gerçek sandbox tahsilatı değildir.
- `node scripts/verify-direct-commerce.mjs`: **6 kontrol grubu geçti, 0 tarayıcı JavaScript hatası**. Gerçek production kataloğu 320, 375, 390, 430, 768, 1440 px genişliklerde kontrol edildi. Aynı React bileşenleri ayrı Vite test ortamında satın alma, paket, hata/boş saat, sipariş, tamamlama ve mağaza işlemleri için sınandı. Test ortamı ekranları sarı “YALNIZCA ARAYÜZ TESTİ” şeridiyle ve `fixture-` dosya adlarıyla ayrılır. Bunlar gerçek Supabase/iyzico E2E kanıtı değildir.
- `npm run test:provider-validation`: mevcut doğrulama testi geçti.
- `npm run lint`: geçti, hata/uyarı yok. `npx tsc --noEmit`: geçti. `npm run build`: geçti. `git diff --check`: geçti. Son kontrol özeti `artifacts/direct-commerce/verification-summary.json` dosyasındadır.

Makine kayıtları: `database-tests.json`, `payment-tests.json`, `browser-tests.json`. Gerçek uygulama görüntüleri: `actual-catalog-390.png`, `actual-catalog-1440.png`, `actual-service-390.png`. Test senaryosu görüntüleri: `fixture-booking-390.png`, `fixture-booking-1440.png`, `fixture-pending-390.png`, `fixture-confirmed-390.png`, `fixture-provider-390.png`, `fixture-store-390.png`; ayrıca viewport kopyaları bulunur.

Test DB'si mevcut Supabase şemasının kullanılan ilişkilerini temsil eden izole sözleşme fixture'ıyla başlatılır; tüm geçmiş Supabase migration'ları veya Auth/PostgREST sunucuları çalıştırılmış sayılmaz. Hedef proje PostgreSQL 17 ayarlıdır; tam migration zinciriyle staging doğrulaması ayrıca yapılmalıdır. Docker motoru bu oturumda çalışmadığı için ayrı yerel PostgreSQL test ikilileri kullanıldı.

Yerel DB testini yeniden hazırlamak için Windows'ta: `npm install --prefix artifacts/commerce-test-runtime --no-package-lock --no-save --ignore-scripts --offline=false @embedded-postgres/windows-x64@18.4.0-beta.17 pg@8.23.1`. Bu klasör Git tarafından yok sayılır. Test runner yalnızca kendi geçici localhost cluster'ını başlatır; `.env.local`, uzak DB URL'si veya servis anahtarı okumaz.

## Henüz doğrulanamayan / gerekli ortam adımları

1. Yeni migration hedef Supabase'e uygulanmadı. Mevcut ortam yeni tabloları/RPC'leri sağlamadığı için gerçek katalog satışı kapalı gösterilir. Önce migration tam şema üzerinde staging'de doğrulanmalıdır.
2. Bu oturumda `IYZICO_API_KEY` / `IYZICO_SECRET_KEY` yapılandırması bulunmadı. Gerçek sandbox başarılı/başarısız ödeme, dış callback, Marketplace approve/refund tamamlanmadı. Yerel localhost callback'i dışarıdan erişilebilir bir test ortamı gerektirir.
3. Gerçek ustalar hizmet fiyatı, süre, bölge ve takvimlerini kendileri tanımlamalı; sandbox alt üye işyeri durumları aktif olmalıdır. Migration fiyat veya müsaitlik üretmez.
4. Tam oturumlu Next.js + Supabase Auth/PostgREST + iyzico E2E akışı ve fiziksel iOS/Android cihaz testi tamamlanmış sayılmaz. Cron kodu eklendi; yayınlanmış zamanlayıcı çalışması doğrulanmadı.
5. Canlı ödeme her durumda kapalıdır. Şirket/Marketplace onayı ve ayrı, açıkça yetkilendirilmiş canlı ortam çalışması olmadan açılmamalıdır. Çoklu sepet, otomatik ödeme mutabakat işçisi ve diğer kategorilerin ürün kapsamları bu MVP'ye dahil değildir.

## Dosyalar

- Veri: `supabase/migrations/20261021000100_direct_service_commerce.sql`, `src/lib/supabase/types.ts`, `src/lib/commerce/{types,display,payment,previews}.ts`.
- Servisler: `src/services/commerce/{index,settlement}.ts`, `src/services/payments/{iyzico-client,iyzico-checkout}.ts`.
- API: `src/app/api/commerce/{slots,orders,orders/[id],store,checkout,payment-callback}/route.ts`, `src/app/api/cron/commerce-expiry/route.ts`.
- Yeni sayfalar: `src/app/services/{page,loading}.tsx`, `src/app/services/[slug]/page.tsx`, `src/app/orders/{page,loading}.tsx`, `src/app/orders/[id]/page.tsx`, `src/app/provider-dashboard/{store,orders}/page.tsx`.
- Bileşenler: `src/components/commerce/{CommerceJourney,ServiceCatalog,ServiceBooking,OrderList,OrderView,ProviderStore,ProviderPurchases,ProviderCommerceSummary}.tsx`; `src/styles/commerce.css`.
- Bağlantılar: `src/app/{layout,account/page,dashboard/page}.tsx`, `src/app/providers/[id]/page.tsx`, `src/app/provider-dashboard/{page,calendar/page,earnings/page}.tsx`; `src/components/dashboard/ProviderDashboardUI.tsx`; `src/components/home/{MarketplaceHome,HeroSection,HeroSearch,CategoryCard,PopularServices,HomePremiumPanels}.tsx`; `src/components/layout/{Navbar,Footer,MobileBottomNav}.tsx`; `src/components/providers/ProviderCard.tsx`; `src/lib/constants/navigation.ts`; `middleware.ts`.
- Testler: `scripts/test-direct-commerce-db.mjs`, `scripts/test-direct-commerce-payment.ts`, `scripts/verify-direct-commerce.mjs`, `e2e/fixtures/commerce-base.sql`, `e2e/fixtures/commerce-ui/*`, `artifacts/direct-commerce/*`.
- Yapılandırma: `.env.example`, `.gitignore`, `package.json`, `vercel.json`. Yeni üretim bağımlılığı eklenmedi; `package-lock.json` değiştirilmedi.

## İşlevsel UX araştırması

Tasarım/kod kopyalanmadı. [Taskrabbit](https://www.taskrabbit.com/how-it-works) ve [rezervasyon yardımı](https://support.taskrabbit.com/hc/en-us/articles/46260422073755-How-Do-I-Hire-a-Tasker) hizmet/konum, gerçek sağlayıcı karşılaştırması ve müsaitliğe göre zaman seçimi için incelendi. [Trendyol ürün sayfası](https://www.trendyol.com/kancaev/sepet-hasir-kapakli-naturel-yuvarlak-buyuk-p-32925036) görünür fiyat, satıcı/yorum ve satın alma adımları için incelendi. [Migros teslimat seçimi](https://www.migros.com.tr/tikla-gel-al-teslimatini-nasil-secebilirsin-x-6b5) adres ve gün/saat seçiminin ödemeden önce kesinleşmesi ilkesini destekledi; bu kaynak Hemen yerine Migros'un planlı teslimat akışıdır. [BiTaksi SSS](https://www.bitaksi.com/tr/faq) işlem durumu, sağlayıcı bilgisi ve ödeme onayı için incelendi. FUWU'da konum altyapısı olmadığı için canlı harita aktarılmadı.

Ödeme doğrulaması [iyzico Checkout Form sorgulama](https://docs.iyzico.com/en/payment-methods/checkoutform/cf-implementation/cf-retrieve), [başlatma](https://docs.iyzico.com/en/payment-methods/checkoutform/cf-implementation/cf-initialize) ve [sandbox/canlı ortam](https://docs.iyzico.com/en/getting-started/preliminaries/live-vs-sandbox) belgelerine göre düzenlendi. UX kontrolünde `ui-ux-pro-max` becerisi kullanıldı; FUWU'nun mevcut turuncu/beyaz/siyah kimliği ve Inter fontu korundu.
