# FUWU 3.0 — Production hazırlık durumu

**Karar: PRODUCTION-READY DEĞİL.** Tarih: 28 Ekim 2026. Yerel kod, migration, testler ve inceleme kanıtları hazır; aşağıdaki dış kurulum ve doğrulama engelleri açık.

## Kritik engeller

| Seviye | Engel | Gerekli işlem |
| --- | --- | --- |
| P0 | Canlı `service_catalog` / `commerce_offers` bulunamıyor | Migration geçmişi ve mevcut şema karşılaştırılmalı; staging → onaylı production geçişi yapılmalı. |
| P0 | iyzico API key / secret yapılandırılmamış | Sandbox alt üye onboarding, hosted ödeme, gerçek callback, tam iade ve kuruluş mutabakatı uçtan uca doğrulanmalı. |
| P0 | Canlı müşteri platform bedelinin sözleşme, vergi ve belge modeli onaysız | iyzico + hukuk + mali müşavir doğrulaması. Müşteri ücreti varsayılanı %0. Canlı endpoint kodda kapalı. |
| P1 | Gerçek Google OAuth / checkout dönüş testi yok | Staging Google/Supabase redirect ayarları ve gerçek test hesabıyla seçimlerin geri dönüşü doğrulanmalı. |
| P1 | `CRON_SECRET` yerelde yok | Yetkili cron ve süresi geçen hold/ödeme mutabakatı staging'de çalıştırılmalı. |
| P1 | Funnel, CAC, ücret deneyi, vergi defteri, net katkı verisi yok | Onaylı veri kaynağı/ölçüm ve muhasebe entegrasyonu tamamlanmalı. Bu metrikler sıfır varsayılmıyor. |
| P2 | Fiziksel cihaz ve kapsamlı yardımcı teknoloji kontrolü yok | iOS/Android PWA klavyesi, safe-area, VoiceOver/TalkBack ve WCAG 2.2 AA değerlendirmesi. |

## Faz kaydı

| Faz | Kod / sonuç | Test durumu |
| --- | --- | --- |
| 0 Denetim | Yerel/uzak main aynı; temiz başlangıç; 68 route envanteri; anon canlı kategori okuması ve önceki ekranlar. | Salt okunur kanıt mevcut. |
| 1 Kategori | Tüm gerçek kategoriler, bağımsız bağlantı hatası, admin görünürlük/sıra/ikon, dört preview fallback'i kaldırıldı. | Gerçek backend ile 11 kategori, filtre ve iki sütun geçti; production rollout bekliyor. |
| 2 Mobil | Logo/fotoğraflar korundu; beş role uygun alt sekme; dokunma/odak/kelime kırılımı iyileştirildi. | Chromium 7 genişlik, yatay, %200 metin ve simüle klavye geçti; cihaz testi açık. |
| 3 Müşteri | Yeni ana metin, gerçek kategori keşfi, mevcut checkout/taslak/takip korundu, sunucu fiyat teklifi ve ücret onayı eklendi. | 13 fixture UI kontrolü; gerçek Google/iyzico E2E açık. |
| 4 Usta | Günlük kapasite, gerçek slot sırası, brüt/komisyon/iade/masraf ayrımı; mevcut mağaza/takvim/profil korundu. | PostgreSQL sahiplik, çakışma ve kapasite yarışı geçti. |
| 5 Ücret | Integer kuruş/bps, varsayılan %0 müşteri, immutable snapshot, audit, tam iade, gelecekte kategori oranları. | İzole PostgreSQL ve mock protokol testleri geçti; dış ödeme/hukuk onayı açık. |
| 6 Yönetim | Büyüme/Finans/Operasyon görünümleri; kategori/ilçe/tekrar satın alma RPC; eksik veri ayrı. | PostgreSQL admin/rol testleri geçti; canlı schema ve ölçüm kaynakları açık. |
| 7 Dil | Ana başlık/CTA, ücret ve işletim metinleri, sandbox Kullanım Şartları; eski talep geçmişi korundu. | Responsive görüntüler incelendi; bütün legacy metinlerin ve tüm dillerin hukuk incelemesi tamamlanmış sayılmaz. |
| 8 Teslimat | Dört rapor, ekranlar, kaynak kayıtları, migration ve tekrar çalıştırılabilir testler. | Aşağıdaki testler; P0'lar nedeniyle canlı uygunluk iddiası yok. |

## Test kanıtları ve sınırlar

| Kontrol | Gerçek kapsam / sonuç | Kanıt |
| --- | --- | --- |
| Next production build | Başarılı webpack + TypeScript + 27 statik sayfa üretimi. İlk sandbox denemesi `.next` EPERM ile durdu; aynı yerel derleme genişletilmiş dosya erişimiyle geçti. Dağıtım yapılmadı. | `artifacts/fuwu3/build.log` |
| ESLint | Değişen TypeScript ve script dosyaları: çıkış 0. | [Sonuç](../artifacts/fuwu3/lint-result.json) |
| PostgreSQL | **87 kontrol**, bağımsız TCP oturumları ve geçici gerçek PostgreSQL. Eski siparişlerin migration öncesi/sonrası fiyatları, kimlikleri ve saatleri aynı kaldı. | [Yükseltme ve SQL sonucu](../artifacts/fuwu3/upgrade/database-tests.json) |
| Yeni şema regresyonu | 86 kontrol, yeni şema baştan uygulanarak geçti. Kategori audit kaydı ve ad değişikliğinde ID bazlı raporlama ayrıca yükseltme setinde sınandı. | [SQL sonucu](../artifacts/fuwu3/database-tests.json) |
| Ücret/kategori birimleri | 3 test grubu; ayrıca 5 kategori/arama grubu ve 3 satın alma linki/tarih grubu geçti. | [Birim kanıtı](../artifacts/fuwu3/unit-tests.json) ve `scripts/test-phase1-design.ts`, `scripts/test-premium-commerce.ts` |
| Ödeme protokolü | **28 lokal kontrol**. HTTP yanıtları ve HMAC testleri mock; dış iyzico işlemi yok. | [Protokol kanıtı](../artifacts/fuwu3/payment-tests.json) |
| Checkout UI | **13 kontrol**: gerçek React bileşeni, kurgu katalog/API/OAuth gezinmesi. Ücret, onay, değişen toplam, bağlantı hatası, süre sonu ve taslak geri dönüşü. | [Fixture UI sonucu](../artifacts/fuwu3/fixture-checkout/browser-tests.json) |
| Admin / usta paneli UI | Gerçek React, fixture metrik ve mock kapasite API. Üç admin görünümü, eksik veri, 7 genişlik, kapasite hata/başarı ve 0 sınırı kontrolü geçti. | [Panel sonucu](../artifacts/fuwu3/fixture-panels/panel-tests.json) |
| Gerçek uygulama, backend kapalı | Altı sayfa × 7 genişlik; gerçek HTTP/API/korumalı route/PWA; API mock yok. | [Sonuç](../artifacts/fuwu3/after-offline/application-tests.json) |
| Gerçek uygulama, public backend | Aynı kontroller + gerçek 11 kategori ve Halı filtresi. Yalnızca anon okuma; production veri değişimi yok. | [Sonuç](../artifacts/fuwu3/after-public-backend/application-tests.json) |

Ekranlar: [önce](../artifacts/fuwu3/before/), [sonra](../artifacts/fuwu3/after-public-backend/), [backend hatası](../artifacts/fuwu3/after-offline/), [ücretli checkout — TEST](../artifacts/fuwu3/fixture-checkout/customer-fee-consent-390-FIXTURE.png). [Kategori raporu](FUWU_CATEGORY_REPAIR_REPORT.md) önce/sonra bağlantılarını eşleştirir. [UX raporu](FUWU_CUSTOMER_PROVIDER_ADMIN_UX_AUDIT.md) kapsam ve kalan işlevleri, [finans tasarımı](FUWU_DOUBLE_SIDED_COMMISSION_DESIGN.md) ödeme/hukuk sınırını açıklar.

## İncelemeye hazır kaynaklar

Yeni migration: `supabase/migrations/20261028000200_fuwu3_catalog_and_fees.sql`. Kategori yönetimi, quote, ücretli hold, fiyat snapshot koruması, günlük kapasite, finans ve CEO RPC'lerini içerir. Mevcut tablo/satırlar korunur; eski siparişlere tutar backfill'i yapılmaz. Eski para denge constraint'i tanımıyla bulunur; bağımsız randevu başlangıç/bitiş constraint'i korunur.

Yeni API'ler: `GET /api/commerce/quote`, `POST /api/commerce/store/capacity`. Sipariş endpoint'i tutar ve onayı ücretli RPC'ye geçirir. Kimlik/yetki/slot/tutar kararları PostgreSQL'de tekrar doğrulanır. Mevcut sandbox ortak istemci kısıtı bütün iyzico yollarında korunur.

Ana değişiklikler ve yeni dosyalar: [tam liste](../artifacts/fuwu3/changed-files.json). Fotoğraf kaynakları: [lisans kaydı](service-photo-licenses.md). Yeni raster görsel veya sahte müşteri verisi eklenmedi.

## Manuel geçiş sırası

1. Ayrı staging veritabanında migration geçmişini doğrulayın; production schema dump/backup ve geri dönüş planını hazırlayın. Bilinen eksik commerce zinciri `20261021000100` → `20261022000100` → `20261022000200` → `20261026000100` → `20261026000200` → `20261026000300` → `20261026000400` → `20261028000100` → `20261028000200`. Bu liste önceki temel şemanın uyumlu olduğunu varsayar; uygulanacak gerçek liste migration geçmişinden çıkarılmalıdır.
2. Tüm eski dosyaları körlemesine `db push` ile uygulamayın. Özellikle `20260824000100_deactivate_hali_yikama.sql` aktif kategoriyi kapatır ve bu görevin niyetine aykırıdır. Yeni çalışma bunu çalıştırmaz ve veri silmez.
3. Staging'de kategori/ürün/variant ilişkilerini, RLS ve yetkileri gerçek Supabase Auth oturumlarıyla doğrulayın. Onaylı test ustasının kapsam, fiyat, bölge, takvim, günlük sınır ve sandbox alt üye hesabını hazırlayın.
4. Google/Supabase callback ve `NEXT_PUBLIC_SITE_URL`, sandbox API key/secret, cron yetkilendirmesi ve dış webhook erişimini staging için yapılandırın. Sırları repository'ye eklemeyin.
5. Gerçek sandbox ödeme → doğrulanan callback → sipariş → teslim kodu → hak ediş onayı ve tam iade akışlarını çalıştırın. Dış kuruluşun bildirdiği tutarı ve alt üye payını karşılaştırın. Kart veya özel kimlikleri rapora yazmayın.
6. Hukuk, vergi ve iyzico sözleşme onaylarını tamamlayın. Ücret modeli onaylanana kadar müşteri oranını %0 bırakın. Canlı tahsilat için bu sürümdeki sandbox kısıtını kaldırmak ayrıca açık kapsam/onay ve ayrı güvenlik incelemesi gerektirir.
7. **Git commit, push, production migration ve deployment yalnızca kullanıcının ayrıca verdiği onaydan sonra.** Bu çalışma bunların hiçbirini yapmadı.

Yerel tekrar çalıştırma: `npm run test:commerce:db`, `tsx scripts/test-fuwu3.ts`, `tsx scripts/test-phase1-design.ts`, `npm run test:commerce:payment`, `npm run test:commerce:ux`, `node scripts/verify-phase2-checkout.mjs`, `node scripts/verify-fuwu3-panels.mjs`, `node scripts/verify-fuwu3-application.mjs`. PostgreSQL testi mevcut `artifacts/commerce-test-runtime` içindeki yerel runtime'ı kullanır ve uzak URL/env okumaz. Yükseltme senaryosu için `FUWU3_UPGRADE_TEST=true`; public-backend görsel kontrolü için `FUWU3_READONLY_CATALOG=true`. Windows'ta Playwright tarayıcı yolu yerel kuruluma göre ayarlanmalıdır.
