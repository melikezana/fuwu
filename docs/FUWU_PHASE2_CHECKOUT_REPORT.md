# FUWU — Phase 2: Direct Service Commerce & Instant Booking

Tarih: **28 Ekim 2026**, Türkiye saati. Temel: `melikezana/fuwu`, HEAD `de0ec9598c1d3a8c19095f21828480fa2f48b895` ve mevcut Phase 1 çalışma dosyaları.

## Sonuç

Mevcut hizmet → usta → gün/saat → adres → özet → iyzico sandbox → takip akışı tamamlandı ve aşağıdaki yerel katmanlarda doğrulandı. **Gerçek iyzico sandbox ödemesi tamamlandı denemez.** Sandbox anahtarları bulunmadığından gerçek ödeme/başarısız ödeme/iade/payout ve gerçek Google hesabıyla uçtan uca satın alma **BLOCKED / NOT RUN** durumundadır.

Kod ilk olarak ortam dosyaları taşınmadan izole bir çalışma kopyasında hazırlandı. Doğrulanan dosyalar mevcut `C:\Users\Melikezana\Desktop\FUWU` reposuna aktarıldı; önceki Phase 1 değişiklikleri korundu. Commit, push, deployment veya production veritabanı değişikliği yapılmadı. Yeni migration yalnızca atılabilir yerel PostgreSQL test kümelerinde uygulandı.

## İlk inceleme: mevcut işlev ve varsayım ayrımı

İncelenenler: `ServiceCatalog`, `ServiceBooking`, `ProviderPurchases`, `OrderView`, `src/app/api/commerce`, `src/services/commerce`, `src/lib/commerce`, `src/services/payments`; 21 Ekim doğrudan ticaret migration'ı, 22 Ekim fusion migration'ları ve 26 Ekim operasyon/gizlilik migration'ları. OAuth callback, aktif Next.js proxy/middleware, rol kontrolleri ve oturum taslağı da incelendi.

| Başlangıçta kodda bulunan işlev | Başlangıçtaki kanıt sınırı / bu fazdaki işlem |
| --- | --- |
| Aktif katalog, FIXED_PRICE / VARIANT_BASED / DIAGNOSTIC_SERVICE; sağlayıcı fiyatı ve süresi | Phase 1 raporundaki satın alma kanıtları fixture API'larına dayanıyordu. Bu fazda sunucu sözleşmesi gerçek yerel PostgreSQL'de tekrar test edildi; staging kataloğu doğrulanmadı. |
| `orders` içinde 10 dakikalık hold, sunucu fiyatı, komisyon ve kapsam snapshot'ı | Ayrı sepet, sipariş, hold veya ödeme tablosu oluşturulmadı. Atomik çakışma ve fiyat manipülasyonu testleri yeniden geçti. |
| `commerce_slots`: İstanbul saat dilimi, çalışma saatleri, izin, süre, bölge, mevcut sipariş ve legacy talepler | Bunların yerel SQL kanıtı alındı. Önceki arayüzde Bugün/Yarın doğrulamasız gösteriliyordu; düzeltildi. |
| Tek ödeme initializer'ı, token kaydı, sunucudan iyzico sonucu sorgulama, idempotent resolve ve settlement claim | Mevcut ödeme/item kimliği kontrolleri korundu. Bekleyen kilit nedeniyle eski kalabilen `now()` kullanımı ve alt üye işyeri snapshot'ı güçlendirildi. |
| 30 dakikalık sekme taslağı, Google PKCE callback, güvenli `next` ve SSR cookie yenilemesi | Gerçek Google hesabıyla test yoktu. Özet adımı artık taslakta korunur, yönlendirme öncesinde kayıt tamamlanır; eski slot yeniden geçerli kabul edilmez. |
| Sipariş statüleri, teslim kodu, gerçek kaynakla yorum uygunluğu | Yeni sahte takip, harita, konum veya ETA eklenmedi. Mevcut kod ve yorum yetkisi regresyonları tekrar geçti. |

## Davranış değişiklikleri

### Hizmet ve usta seçimi

- `ServiceCatalog` ve `ProviderPurchases` mevcut gerçek fotoğraf/kapsam/fiyat/süre/bölge verilerini ve hizmet + paket + usta bağlantılarını kullanmaya devam eder. Fiyat veya usta üreten yeni seed eklenmedi.
- Usta profilinden gelen seçim ilçe/paket düzenlenirken aynı ustanın eşleşen teklifine bağlanır. Uygun teklif yoksa seçim boş kalır ve açıklama gösterilir; farklı bir usta ancak müşterinin açık seçimiyle seçilir.
- Usta karşılaştırmasında hizmet uzmanlığı, mevcut gerçek yorum özeti, bölge, teklif fiyatı/süresi ve **Müsaitliği Gör** vardır. Bu kontrol önümüzdeki yedi günün mevcut `commerce_slots` RPC sonuçlarından ilk uygun randevuyu gösterir; saat seçimde tekrar doğrulanır.
- Paket değişince aynı ustanın yeni fiyatı ve süresi özete yansır. Diagnostik pakette bedelin keşif/arıza tespiti için olduğu, onarım/parçaların dahil olmadığı ödeme öncesinde açıklanır.

### Takvim ve adres

- `GET /api/commerce/slots?...&days=7`, en fazla yedi gün için mevcut RPC'yi çağıran bir API genişlemesidir; ikinci müsaitlik sistemi değildir. Mevcut tek gün yanıtı korunur.
- Hızlı Bugün/Yarın/gün seçenekleri yalnızca başarılı backend yanıtında uygun slot varsa gösterilir. Hata veya boş yanıtta uygunluk varsayılmaz. Tarih alanı 30 günlük mevcut sınırda kalır.
- API imkansız takvim tarihlerini, bozuk UUID'leri ve desteklenmeyen gün aralıklarını reddeder. Zaman aşımı/hata 503 döner; yanıtlar `no-store` kullanır.
- İlçe değişikliği adres ve saati; paket/usta/gün değişikliği önceki saati geçersiz kılar. Usta tercihi korunur. Kayıtlı adresler ilçe kapsamını korur.

### Mobil checkout ve Google dönüşü

- Son özet: hizmet/paket, usta, randevu, bölge, süre, açık adres, bedel, sıfır ek ücret, toplam, dahil/hariç kapsam, malzeme/ek işçilik ve iptal/iade bilgilerini gösterir. Mobilde sabit toplam ve **Ödemeye Geç** vardır. Masaüstü ve mobil ana buton metinleri aynı; bir ekran boyutunda yalnızca biri görünür.
- Son buton mevcut sipariş RPC'siyle hold alır, ardından mevcut `/api/commerce/checkout` yolunu başlatır. Başarılı sonuç yalnızca izin verilen HTTPS sandbox alanına yönlenir. Başlatma başarısız/belirsiz ise müşteri oluşturulmuş aynı siparişe gider; yeni sipariş veya ikinci initializer üretilmez.
- 401 yanıtında seçimler sekme oturumuna senkron kaydedilir ve mevcut Google girişini sunan `/login?next=...` sayfasına dönülür. Adres, saat veya fiyat OAuth URL'sine konmaz. Özet adımı da korunur.
- Taslak, hesabın kimlik/rol/ödeme yetkisi yerine geçmez. Girişten dönüşte katalog sunucudan gelir, slot tekrar sorgulanır, sipariş oluşturulurken fiyat ve slot atomik RPC'de yeniden doğrulanır. Dolu/eski saatte ödeme kapalıdır ve yeniden seçim bağlantısı görünür.
- Taslak 30 dakikayla sınırlıdır; gelecekte yazılmış zaman damgası ve dizi biçimli veri reddedilir. Depolama engellenmişse girişe yönlendirilmez; seçimler ekranda tutulur ve anlaşılır hata gösterilir. Auth token veya kart bilgisi bu taslağa eklenmez.

### Ödeme ve finansal tutarlılık

- Tutarlar mevcut sunucu sipariş snapshot'ından gelir; müşteriye ayrıca FUWU komisyonu eklenmez. Başlangıç %10 davranışı korunur. **2.000 TL = 200 TL FUWU brüt komisyonu + 1.800 TL usta brüt payı** yerel SQL testinde doğrulandı; işlem kuruluşu kesintisi ayrı alandır.
- Sandbox initializer'ı başarılı durum, beklenen `conversationId`, dolu token ve izinli ödeme URL'si ister. Yeni initializer claim'i sağlayıcının alt üye işyeri anahtarını özel `payment_transactions.submerchant_key` alanında dondurur; başlatma ve başarılı sonuç aynı hedefi kullanır.
- Sonuç URL'sine güvenilmez: mevcut sunucu retrieve çağrısı + token, conversationId, basketId, currency, price, paidPrice, paymentId, item kimliği, fraud onayı ve sağlayıcı payı doğrulaması korunur/güçlendirilir. Yeni snapshot varsa `subMerchantKey` de eşleşmelidir. Tutar doğrulaması kuruş altı farkı, üs gösterimini ve boşluklu sayıları kabul etmez.
- Başarılı kayıtla aynı ödeme/item kimliğini taşıyan tekrarlar idempotent kalır. Doğrulanmış başarılı ödemeyi sonradan gelen başarısız bildirim geri alamaz. İmzalı webhook ve form callback aynı reconcile yolunu kullanır; bildirim tek başına ödeme kanıtı değildir.
- İade/payout, mevcut kalıcı claim ve doğrulanmış dış kuruluş yanıtı olmadan tamamlandı gösterilmez. Belirsiz initializer ve settlement durumları otomatik kör tekrar yerine mevcut mutabakat kuyruğunda kalır.
- Canlı iyzico endpoint'ini reddeden guard korunur. Kart alanı veya kart saklama eklenmez.

## Migration

`supabase/migrations/20261028000100_phase2_checkout_consistency.sql`:

1. Mevcut özel ödeme tablosuna nullable `submerchant_key` ekler. Tarihsel oturumlara bugünkü anahtarı geçmiş gerçekmiş gibi yazmaz; eski kontroller sürer, yeni snapshot şartı yeni oturumlara uygulanır.
2. `commerce_begin_payment`, sağlayıcı → sipariş kilit sırasını izler, kilit sonrası gerçek saatte hold süresini kontrol eder ve tek initializer claim'inde alt üye işyeri anahtarını kaydeder.
3. `commerce_resolve_payment`, kilit sonrası `clock_timestamp()` ve başka aktif/hold siparişlerle çakışma kontrolü kullanır. Süresi dolan/çakışan geç başarılı ödeme `REFUND_PENDING` olur; randevuyu geri alamaz. Var olan kimlik, eksik item onarımı ve idempotency kontrolleri korunur.
4. RPC'ler yalnızca `service_role` için çalışır. Yeni tablo veya statü oluşturulmaz; legacy istekler silinmez.

**Remote migration: NOT RUN.** Kodun staging'e kurulmasından önce migration staging'de uygulanmalı; yeni alt üye işyeri snapshot'ı için şema/kod birlikte gözden geçirilmelidir. Buradaki test üretim Supabase migration zincirinin tamamını veya PostgREST/Google/iyzico entegrasyonunu kanıtlamaz.

## Test sonuçları ve kanıt sınırları

| Kontrol | Sonuç | Kanıt / kapsam |
| --- | --- | --- |
| Production build + TypeScript | PASS | `artifacts/phase2/build.log`; gerçek Next.js webpack derlemesi |
| Tam ESLint + son eklenen test betikleri | PASS | `lint.log`, `scripts-lint.log` |
| `scripts/test-direct-commerce-db.mjs` | **74 PASS** | `database-tests.json`; atılabilir PostgreSQL, bağımsız TCP oturumları, sözleşme fixture'ı ve gerçek ticaret migration'ları |
| `scripts/test-direct-commerce-payment.ts` | **28 PASS** | `payment-tests.json`; gerçek doğrulama/HTTP imzalama kodu, **taklit iyzico HTTP** |
| `scripts/test-fusion-auth.ts` | **29 PASS** | `auth-tests.json`; gerçek Supabase SSR cookie/proxy kodu + taklit Auth HTTP; gerçek Google hesabı yok |
| `scripts/test-phase1-design.ts` | **5 PASS** | `phase1-regression.log`; mevcut katalog/navigation davranışı |
| `scripts/test-premium-commerce.ts` | **3 PASS grubu** | `commerce-ux.log`; satın alma bağlantısı, legacy bağlam ve İstanbul takvim sınırları |
| `scripts/verify-direct-commerce.mjs` | **13 PASS grubu / 40 screenshot** | `regression/browser-tests.json`; mevcut gerçek bileşenler ve açıkça TEST etiketli fixture verileri |
| `scripts/verify-phase2-checkout.mjs` | **10 PASS grubu** | `browser-tests.json`; usta tercihi, farklı fiyat/paket, doğrulanmış hızlı gün, checkout, taslak dönüşü, eski slot, kapalı storage ve hold hatası; **fixture API** |
| `scripts/verify-phase2-application.mjs` | **4 PASS grubu** | `application-tests.json`; gerçek yerel production HTTP, mock yok; veri yokluğunda satış kapalı, API yetkileri, tarih ve OAuth redirect kontrolleri |

Mobil/masaüstü genişlikleri: **320, 375, 390, 430, 768, 1024, 1440px**. Ekran görüntüleri görsel olarak incelendi. Testler reduced-motion kullanır; fiziksel telefon veya tüm tarayıcı motorları doğrulanmadı.

| İstenen entegrasyon senaryosu | Durum |
| --- | --- |
| Geçerli hizmet / farklı usta fiyatları / fiyat manipülasyonu | PASS — yerel gerçek PostgreSQL; gerçek müşteri checkout E2E'si değil |
| Aynı slotta eşzamanlı sipariş / overlap / hold expiry | PASS — ayrı DB oturumları |
| Başarılı/başarısız ödeme ve tekrarlanan callback | PASS — yerel SQL çözümleme + taklit processor HTTP; **gerçek sandbox NOT RUN** |
| Geç gelen callback / yeni rezervasyonu çalmama | PASS — yerel SQL; ayrıca kilit beklerken süre dolması testi |
| Yetkisiz erişim / rol / cookie / open redirect | PASS — yerel RLS, gerçek yerel misafir API ve taklit Auth HTTP |
| İade ve payout mutabakatı | PASS — kalıcı DB claim ve yanıt doğrulama birimleri; **iyzico sonucu NOT RUN** |
| Google girişinden sonra checkout'a dönüş | PASS — taslak/reload, iç yönlendirme ve SSR adapter testleri; **gerçek Google NOT RUN** |
| Mobil satın alma ekranları | PASS — gerçek bileşenlerle fixture akışı ve gerçek uygulamanın veri yokluğu ekranları |

İlk denemelerde ortam kısıtlaması nedeniyle yerel DB bağlantısı ve build dosya oluşturma engellendi; yerel çalıştırma izniyle tekrarlandı ve yukarıdaki sonuçlar alındı. Arayüz testlerinin ilk yükleme ve eski buton/redirect beklentileri düzeltilerek son koşular tekrar geçirildi. Son sonuç dosyalarında hata yoktur; bunlar gerçek dış hizmet kanıtı olarak sunulmaz.

## Screenshot'lar

- [Mobil checkout — TEST verisi](../artifacts/phase2/checkout-390-FIXTURE-viewport.png)
- [Tam mobil özet — TEST verisi](../artifacts/phase2/checkout-390-FIXTURE.png)
- [Masaüstü checkout — TEST verisi](../artifacts/phase2/checkout-1440-FIXTURE.png)
- [OAuth dönüşünde artık dolu slot — TEST verisi](../artifacts/phase2/oauth-stale-slot-390-FIXTURE.png)
- [Hold süresi dolması — TEST verisi](../artifacts/phase2/hold-expired-390-FIXTURE-viewport.png)
- [Gerçek yerel katalog: veri yokluğu](../artifacts/phase2/actual-catalog-390.png)
- [Gerçek yerel hizmet: satın alma kapalı](../artifacts/phase2/actual-unavailable-service-390.png)

Fixture ekranlarında kurgusal usta/fiyat/randevu olduklarını belirten banner vardır. Bunlar gerçek usta, müşteri yorumu veya tahsilat kaydı değildir. Gerçek uygulama screenshot'larında backend konfigürasyonu olmadan fiyat/slot üretilmez.

## Açık blokajlar

1. **BLOCKED — gerçek iyzico sandbox:** mevcut `.env.local` ve yerel `.env.test` dosyalarında API/secret anahtarları yok. Değerler dışarı aktarılmadı. Test alt üye işyeri, ulaşılabilir callback ve gerçek sandbox ödeme/iade/payout kanıtı üretilmedi.
2. **NOT RUN — staging Supabase:** doğrulanmış staging proje erişimi kullanılmadı. `.env.test` yerel Supabase hedefi içeriyor; bu fazın DB kanıtı Supabase Auth/PostgREST yerine bağımsız atılabilir PostgreSQL'dir. Production bağlantısı veya migration komutu çalıştırılmadı.
3. **BLOCKED — gerçek Google + satın alma:** gerçek Google hesabıyla giriş, staging cookie/redirect yapılandırması ve ardından gerçek sandbox işlemi uçtan uca denenmedi. Offline adapter/SSR ve tarayıcı taslağı testleri bu eksikliği kapatmış sayılmaz.
4. **NOT RUN — fiziksel mobil ve gerçek banka aktarımı:** responsive Chromium ve kuruluş onay yanıtı birimleri, fiziksel cihaz kurulumu veya banka hesabına aktarım kanıtı değildir.

## Değişen dosyalar

`src/components/commerce/{ServiceBooking,OfferAvailability,OrderView}.tsx`, `src/app/api/commerce/{slots,checkout}/route.ts`, `src/lib/commerce/{payment,types,display}.ts`, `src/lib/hooks/useSessionFormDraft.ts`, `src/services/commerce/reconciliation.ts`, `src/styles/premium.css`, `e2e/fixtures/commerce-ui/main.tsx`; yeni migration; `scripts/{test-direct-commerce-db.mjs,test-direct-commerce-payment.ts,phase2-checkout-db-checks.mjs,verify-direct-commerce.mjs,verify-phase2-checkout.mjs,verify-phase2-application.mjs}` ve bu rapor.

Çalıştırma: `npm run test:commerce:db`, `npm run test:commerce:payment`, `node scripts/verify-phase2-checkout.mjs`; mevcut bileşen regresyonu için `COMMERCE_FIXTURE_ONLY=true` ile `node scripts/verify-direct-commerce.mjs`. DB betiği mevcut `artifacts/commerce-test-runtime/node_modules` içindeki embedded PostgreSQL ve `pg` test bağımlılıklarını kullanır. Gerçek uygulama probu yalnızca localhost kabul eder ve kendi sunucusunun açılmasını gerektirir.

iyzico sonuç alanları ve sunucu retrieve yaklaşımı, [resmî CheckoutForm referansı](https://docs.iyzico.com/en/getting-started/preliminaries/api-reference-beta/payment-methods/checkoutform) ve [resmî SDK örneği](https://github.com/iyzico/iyzipay-php/blob/master/samples/retrieve_checkout_form_result.php) ile kontrol edildi. Bu referans incelemesi gerçek sandbox testi değildir.
