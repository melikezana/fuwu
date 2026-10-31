# FUWU — Critical Backend Repair & Pre-launch Stabilization

Tarih: **31 Ekim 2026 · Europe/Istanbul**. Başlangıç commit'i: `a51c583085b980f640024f1474ef80059f839de9`.

**Yayın kararı: BLOCKED / NO-GO.** Legacy/commerce çakışması yerel PostgreSQL 17 yükseltmesinde giderildi; gerçek yerel Supabase servislerinde kabul testleri çalıştırıldı. Production migration, Google OAuth dönüşü, dış SMS ve ödeme sağlayıcısı kabulü bu sonuçlara dahil değildir. Production ready denmiyor.

Bu rapor önceki [readiness raporundaki](FUWU_PRELAUNCH_FINAL_READINESS.md) gözlemleri silmez; aşağıdaki yeni kanıtlarla yerel onarım durumunu günceller. Git push, Vercel deployment, production DDL/DML, hesap/veri temizliği ve gerçek tahsilat yapılmadı. Yeni ücretli proje açılmadı; başka projeler durdurulmadı. Production verileri test veritabanlarına taşınmadı.

## 1. Çözülen P0/P1 nedenler

- **Gerçek oturum kaybı:** Next proxy runtime'ında `AbortSignal.any` bulunmuyordu. Supabase Auth çağrısı proxy'de hata veriyor, gerçek cookie oluşmasına rağmen korumalı sayfalar login'e dönüyordu. Ortak `AbortController`, sekiz saniye deadline ve üst çağrının iptal sinyali kullanıldı. Deadline yanıt gövdesi tamamlanana kadar sürer. Dört unit regresyonu ve gerçek PKCE/cookie/rol E2E testleri var.
- **İki farklı orders sözleşmesinin aynı tablo adı:** Yeni commerce depolaması `public.commerce_orders` oldu. Legacy `public.orders` ve finansal FK'leri yerinde kaldı. API adresleri ve yanıtların `orders` anahtarı korunuyor.
- **Partner mağazasında yetki hatası:** `providers SELECT *`, finansal kolonların SELECT yetkisi kaldırıldığı için gerçek PostgREST'te hata veriyordu. Yalnız gerekli kolonlar seçiliyor; teknik hata ayrı gösteriliyor. Kapasite, owner/admin kontrollü `commerce_provider_capacity(uuid)` ile okunuyor. IBAN ve diğer finansal kolonların yetkileri genişletilmedi. Kaydet → reload → aynı limit E2E ile doğrulandı.
- **Fixture çakışması:** Sabit telefonlar ve tekrar koşular unique constraint'e takılıyordu. Yerel seed'de yalnız service role'a açık, `NO CYCLE` sequence/RPC üzerinden her sentetik provider için farklı telefon; UUID kimlik/e-posta ve test başına ayrı sahiplik kullanılıyor. Ürün unique constraint'i korunuyor.
- **Mail teslimi / Auth tamamlanması farkı:** Bir tam koşuda gerçek `/verify` servisi `One-time token not found` döndürdü. Helper yalnız Mailpit'te mesajın görünmesine dayanıyordu. Artık tek kullanımlık link açılmadan önce gerçek `/otp` HTTP 200 yanıtının tamamlanması, ardından PKCE code varlığı ve `/api/auth/user` HTTP 200 doğrulanır; yeniden login denemesiyle hata gizlenmez.
- **Temiz kurulumda boş katalog:** Migrations, seed'den önce çalışır. Kategori parent'ları yokken yapılan `INSERT … SELECT` hizmetleri oluşturmuyordu. Commerce migration'ı 11 parent'ı `ON CONFLICT(slug) DO NOTHING` ile hazırlar; mevcut kategori kararlarını değiştirmez.
- **Başvuru taslağı:** Güncel dört alanlı form login geçişinde saklanıp geri yüklenir; başarıdan önce temizlenmez. Dosya referansı saklanmaz. Submit ve yönetici kararı hydration hazır olana kadar kapalıdır.
- **SLA hydration:** İlk sayaç değeri render saatine bağlıydı. Sunucu/istemci ilk görünümü deterministik placeholder oldu; sayaç istemcide başlıyor.
- **Tamamen boş public dizin:** Filtreli boş sonuçta hiç yayınlanmış usta yoksa katalog CTA'sı kayboluyordu. Filtreli ekranda kategori/ilçeyi taşıyan keşif bağlantısı artık her iki durumda da korunur. Başvuru testi Next'in gizli tuttuğu form kopyaları yerine erişilebilir aktif forma bağlandı.
- **Takvim/mağaza girişinin hydration öncesi kaybı:** Gerçek E2E'de `10:00` girilen saat `09:00` kaydedildi. Kontroller hydration bitene kadar ve commit sırasında disabled fieldset içindedir; görünüm korunur. Üç bağımsız partner/iki worker stres koşusunda fiyat, kapsam, kapasite ve `10:00` DB kalıcılığı geçti.
- **Paralel fixture bağımlılığı:** Varsayılan kategori sorgusu rastgele UUID sırasıyla başka testin gizli SLA kategorisini seçebiliyordu; quote doğru olarak satışa kapalı dönüyordu. Commerce fixture'ı sabit aktif/görünür Tesisat kategorisini kullanır; SLA kendi kesin kategori ID'sini alır. Admin onay testleri ara application status'ü yerine tamamlanmış server-action UI sonucunu bekler; mevcut provider güncellenmesine ait eksik başarı mesajı da eklendi.
- **Yeni tabloda eksik GRANT:** Gallery tablosuna gerekli açık yetkiler eklendi; sahiplik ve public görünürlük RLS'i korunuyor. Owner/foreign/anon kontrolleri PostgreSQL üzerinde çalıştı.

## 2. Önceki 12 başarısız E2E'nin tek tek karşılığı

Gerçek kaynak: [GitHub run 41186277411](https://github.com/melikezana/fuwu/actions/runs/41186277411), job `124493736343`, artifact `13036334486`. İndirilen rapor **14 passed / 12 failed / 7 skipped** içeriyor. Artifact'ta 24 hata bağlamı vardı; önceki ayarda screenshot kapalı olduğundan ekran görüntüsü ve HTML raporu yoktu. Olmayan görseller incelenmiş gibi sunulmadı. Yeni yapı HTML/JSON ve hata screenshot'ı üretiyor.

| # | Eski başarısız test | Kök neden | Düzeltme ve yeni kabul |
| --- | --- | --- | --- |
| 1 | admin-access — non-admin redirected | Ürün: proxy Auth hatası; cookie'li müşteri login'e dönüyordu | Portable fetch; gerçek müşteri admin'e giremez ve dashboard'a ulaşır |
| 2 | admin-access — dashboard shell | Aynı oturum hatası + eski `Admin Paneli` başlığı | Gerçek admin oturumu; `İşler kontrol altında.` doğrulanır |
| 3 | auth-form-restoration — guest application | Eski uzun form/type selector'ı + dört alanın taslak sürekliliği eksik | İsimlendirilmiş form, açık submit, login/dönüş/reload sonrası dört alan; dosya ref'i yok |
| 4 | commerce — customer Auth | Proxy Auth hatası | Gerçek Auth; `/orders`; rol ve geçersiz satın alma sınırları korunur |
| 5 | csp-nonce — musluk service | Ürün: clean migration'da kategori parent'ları olmadan katalog insert'i | Clean Supabase'de gerçek `Musluk montajı` kaydı; CSP ihlali yok |
| 6 | emergency-sla — countdown/admin breach | Auth hatası; eski admin operasyon görünümü beklentisi; sayaç hydration farkı | Atanmış sentetik request; gerçek provider/admin, sayaç ve `?legacy=1` SLA görünümü |
| 7 | launch-verification — filtered empty state | Hidden DOM'da duplicate text + artık kullanılmayan request giriş beklentisi | Erişilebilir heading/empty-state kapsamı; kategori/ilçe catalog'a taşınır |
| 8 | launch-verification — full launch flow | Eski `Usta Paneli`, uzun onboarding ve kapatılmış yeni request oluşturma akışı | Güncel başvuru → admin onayı → gerçek provider → yayın kapalı; yalnız sentetik tarihsel request atanır ve provider kabul eder |
| 9 | provider-control — unpublish | Auth hatası; gerçek özel bulunamadı sayfasına yanlış 404-only beklentisi | DB hidden, hesap korunur, UI badge, public liste/profil yokluğu, noindex, tek audit, anon ret. Özel sayfa 200/404 dönebilir; profil verisi sızmaması ayrıca doğrulanır |
| 10 | provider-control — store/calendar | Gerçek `23505` sabit telefon çakışması; `SELECT *` yetki hatası; eski süre/takvim/metin selector'ları | Ayrı telefon/sahip; dar SELECT; gerçek fiyat/kapsam/ilçe/takvim/kapasite kalıcılığı ve yabancı owner 403 |
| 11 | request-flow — home entry | Eski `Hizmet Satın Al` butonu/başvuru linki konumu | `Hizmetleri Keşfet`, `Usta Ol` ve istenen ana başlık; satın alma kapalı kalır |
| 12 | storage-documents — private transport | Auth hatası; retry'da sabit provider telefonu çakışması | Ayrı owner/admin/foreign Auth; gerçek HTTP upload/signed download, tür/boyut, hash, review, RLS ve audit |

Eski yedi skip'in yerine kendi sentetik fixture'ları hazırlandı: commerce quote/hold/cancel, auth'lu admin CSP, sentetik sipariş CSP, iki cron SLA testi, doğrulanmış telefonlu başvuru, Güvence müşteri/provider akışı. Google giriş ekranının CSP testinin geçmesi, dış Google hesabıyla OAuth dönüşünün geçtiği anlamına gelmez. Eski ödeme ekranı testi artık sentetik sipariş teyit ekranını ölçer; gerçek ödeme kabulü ayrıca BLOCKED'dır.

Kanıt: [orijinal JSON](../artifacts/critical-backend-repair/ci/report/artifacts/security-testing/e2e.json), [son seri/paralel koşular](../artifacts/critical-backend-repair/local-supabase/result.json).

## 3. Migration mimarisi ve veri korunması

| Sözleşme | Legacy | Commerce |
| --- | --- | --- |
| Ana tablo | `public.orders` | `public.commerce_orders` |
| Kaynak | `service_requests.request_id` | `provider_service_offerings.offering_id` |
| Para | Decimal TRY; `amount`, `commission_amount`, `provider_net_amount` | Integer kuruş; `total_minor`, `commission_minor`, `provider_gross_minor` |
| Durum | Eski `PENDING_PAYMENT`…`APPROVED`/`CLOSED` sözleşmesi | Randevu/hold/commerce durum makinesi |
| Bağımlılıklar | `order_payments`, `payouts`, `disputes`, `webhook_events` FK'leri aynı OID'li legacy tabloya bağlı | `payment_transactions`, `order_status_events`, `order_completion_codes`, settlement operasyonları commerce FK kullanır |
| Kod | Gözlenen eski payout trigger'ı legacy kontrolünü sürdürür | Customer/provider/admin sayfaları, API ve RPC'ler `commerce_orders` kullanır |

İnceleme kapsamı: production'dan salt okunur kolon/default/constraint/FK/policy/trigger ve ilgili function tanımları; repo API/RPC/admin/usta/müşteri referansları. Uygulamanın yeni commerce kodunun legacy `orders` okuyucusu olmadığı görüldü. Böylece eski tabloyu yeniden adlandırmadan veya tutarlarını dönüştürmeden ayrı tablo seçildi. Görünümle iki farklı durum/para sözleşmesini birleştiren yanıltıcı uyumluluk katmanı eklenmedi.

**46 uygulanmış migration dosyası değiştirilmedi.** Yeniden hedeflenen commerce dosyaları ve Halı Yıkama kapatma dosyası bu production ledger'ında uygulanmamıştı. Repo artık **72 migration**, production **46**, pending **26**. Yeni guard dosyası desteklenen `supabase migration new critical_backend_contract_guard` komutuyla oluşturuldu: `20261031105613_critical_backend_contract_guard.sql`.

`app_settings` ve `request_reassignment_log` ledger dışında production'da bulunuyordu. Gözlenen gerçek DDL, policy ve trigger'lar sentetik overlay'de yeniden oluşturuldu; pending zincir bunun üzerinde çalıştı. Guard gerekli kolon tiplerini ve legacy/commerce FK hedeflerini açıkça kontrol eder. Yanlış şema `IF NOT EXISTS` ile başarılı sayılmaz. Gözlenen üç trigger helper'ın yalnız search_path ayarı sabitlendi; legacy ödeme karar gövdeleri değiştirilmedi.

Halı Yıkama'yı kapatan uygulanmamış migration açık belgelenmiş no-op oldu. İlk commerce parent insert'i mevcut `is_active` kararını ezmez. Gözlenen 11 aktif kategori aynı ID/slug/flag ile yükseltme sonunda korundu; tarayıcıdan 11'i de kategori/ilçe filtresiyle açıldı.

**Önemli kapsam sınırı:** Başka bir ortam eski commerce migration'ını zaten uygulamış ve `orders.offering_id` barındırıyorsa yeni zincir bilinçli olarak `existing_commerce_orders_requires_reviewed_transition` ile durur. Bu ortam için geçmiş değiştirilmez, boş ikinci mağaza açılmaz; ayrı veri koruyan geçiş gerekir. Burada doğrulanan hedef, production'ın gözlenen legacy şeklidir.

PostgreSQL 17.6 üzerinde altı senaryo: clean chain, populated upgrade, commerce clean/upgrade, 46 sürümün ledger replay'i, **46 sürüm + gözlenen legacy grafik**. Sonuncusu yalnız kolon ekleyen eski testin yerine geçer: yedi mevcut tablo, gerçek FK/policy/trigger/index tanımları ve tamamen sentetik sipariş/ödeme/payout/dispute/webhook/reassignment/audit içerir. `1234.56 TRY` gibi küsuratlar, eski satırlar, relation OID'leri, constraint/FK hedefleri, finansal partial unique indeksler, audit ve kategori kararları korunur. Eski payout trigger'ı geçersiz payout'u, FK eski order silinmesini reddeder. Guard iki kez yeniden uygulanır; FK bilinçli kaldırıldığında fail-closed olur ve rollback FK'yi geri getirir. Bu testler hosted production kopyası değildir. [İndeks metadata'sı](../artifacts/critical-backend-repair/production-indexes-readonly.json) ve [indeks adı çakışma incelemesi](../artifacts/critical-backend-repair/index-collision-review.json) ayrıdır; koşulsuz yeni indeks adı çakışması bulunmadı.

Kanıt: [salt okunur şema](../artifacts/critical-backend-repair/production-schema-readonly.json), [observed upgrade](../artifacts/security-testing/db-observed-production/migration-production-upgrade.json), [ledger-only replay](../artifacts/security-testing/db-production-ledger/migration-production-upgrade.json), [integration özeti](../artifacts/security-testing/integration-result.json).

## 4. Gerçek Supabase ve paralel izolasyon

Supabase CLI **2.115.0**, Docker ve gerçek PostgreSQL/Auth/PostgREST/Storage/Realtime/Mailpit kullanıldı. Her nihai koşu yalnız kendisine ait project_id, workdir ve boş portlar oluşturur; `.temp`/link bilgisi, uzak env veya production satırları kopyalanmaz. Mevcut FUWU geliştirme yığını resetlenmedi/durdurulmadı. Test yığını sonunda yalnız kendi workdir'i ile kapatılır.

`bjhyisomjadirdchruix` denylist'tedir. Env/key claim/URL kontrolü production veya sınıflandırılmamış uzak hedefi servis çağrısından önce reddeder. Ürün rate limiter'ı gevşetilmedi. Aynı localhost IP'sinin bütün sentetik kimlikleri tek kişi saymaması için yalnız izole tarayıcı fixture'ları farklı belgeleme IPv6 istemci adresi kullanır. Auth e-postaları yalnız Mailpit'e gider; dış SMS teslimi yapılmaz. Telefon sahipliği test fixture'ında Supabase Admin ile doğrulanmış sentetik telefon üzerinden gerçek Auth `getUser`/başvuru kontrolüyle ölçülür.

Provider cleanup yalnız o testin registry'sine eklenmiş UUID'leri hidden/test yapar; başka testin provider'ını, hesabını, siparişini veya audit'ini silmez. SLA cleanup yalnız o testin oluşturduğu request UUID'sini ve bağlı yerel bildirim/reassignment satırlarını kapsar. Tam yığın atılırken sentetik veriler kaldırılır. Para sağlayıcısı anahtarları test env'den silinir.

GitHub Actions aynı çalıştırıcıyı çağıracak şekilde hazırlandı: tüm suite workers=1 ardından workers=2; retry=0; skip/flaky/unexpected/error bulunan rapor PASS olamaz. Eski JSON silinmeden yeni koşuya başlanmaz. HTML, JSON, hata screenshot'ı ve mobil kanıt yüklenir. Hosted Actions rerun/push yapılmadığından CI sunucusundaki yürütme ayrıca bekliyor.

Playwright'ın `webServer.env` alanı JSON/HTML raporuna serileştirildiğinden test anahtarları buradan çıkarıldı; doğrulanmış env alt sürece kalıtılır. Önceki yerel/indirilen tanılama JSON'larındaki yerel JWT'ler maskelendi; test sayıları/assertion'lar değiştirilmedi. Ignored CLI/env dosyaları yayınlanmaz.

Yerel Docker Desktop iki kez eski, 0 baytlık Windows Unix socket dosyalarında açılış hatası verdi. Yalnız logla doğrulanan `Docker/run` ve `docker-secrets-engine` socket yolları aynı dizinlerde `fuwu-backup-20261031*` adlarıyla yedeklendi; volume, ayar veya veritabanı resetlenmedi. Bu çevre onarımı production Supabase işlemi değildir.

## 5. Admin, partner, belge ve müşteri kabulü

Gerçek yerel Auth oturumlarıyla admin başvuru onay/ret; pasifleştirme/aktifleştirme; hesap onayı; yayından kaldırma; test/gerçek sınıflandırma; kalite yayın onayı/düzeltme; mesleki doğrulama kaldırma/yeniden verme; kimlik ve mesleki belge incelemesi çalıştı. DB sonucu, audit, güncel UI ve public/rol sınırları kontrol edildi. Başvuru veya belge onayı, ayrı yayın onayının yerine geçmez. Onaylanmamış profil doğrudan URL'de görünmez. Provider Control RPC kararları sürüm, gerekçe, idempotency, transaction içi audit ve server-side role kontrolünü korur. Bu RPC'lerin SQL testinde audit outage ve iki admin yarışı gerçekten yürütülür. Legacy başvuru onay/ret E2E'si ise server action'ın tamamlanmış sonucunu ve ayrı DB/audit kayıtlarını doğrular; tüm eski admin yazmaları tek transaction'a çevrilmiş gibi sunulmaz.

Partner dört bilgiyle başvurur; profil/fiyat/kapsam/ilçe/takvim/kapasite ayrı kaydedilir. Teknik backend hatası boş kayıt veya sınırsız kapasite olarak sunulmaz. Yabancı provider düzenlemesi 403/ownership kontrolüyle reddedilir.

Private Storage: sentetik PDF gerçek HTTP ile yüklenip owner ve admin tarafından signed URL üzerinden byte-for-byte indirildi. SHA-256 upload receipt doğrulandı. Anonymous 401, yabancı kullanıcı 403 ve doğrudan Storage RLS reddi kontrol edildi. Yanlış magic bytes ve >5 MiB dosyada tür/dosya seçimi korunur; owner kendi belgesini onaylayamaz. Kimlik ve mesleki belge ayrı testlerdir. Upload, erişim ve review audit'leri kontrol edildi. **Malware tarayıcısı bağlı değildir:** durum `unavailable`; tarandı iddiası yoktur.

Müşteri ön kaydı: gerçek doğrulanmış e-posta, KVKK bağlantısı, sürümlü consent, tekil kayıt/duplicate aynı ID, admin aggregate görünümü, yabancı RLS ve izin geri çekme/consent ledger doğrulandı. Eksik production tablolarında mevcut kapalı/kurulum durumu korunur; yerel PASS production'da kayıt alınıyor demek değildir.

## 6. FUWU Güvence ve ödeme sınırı

Gerçek Supabase E2E: sentetik randevu + ayrı müşteri/atanmış provider → yola çıktı → tek kullanımlık kapı kodu → hizmete başlama → provider tamamlandı bildirimi. Bu aşamada sipariş **IN_PROGRESS** kalır; yalnız müşterinin açık onayıyla **COMPLETED** olur.

Korunan legacy SLA akışında cron'un gerçek yeniden ataması, notification satırı, gerçek Realtime WebSocket INSERT teslimi ve provider bildirim penceresi de doğrulanır. E-posta/Realtime mock'u kullanılmaz.

PostgreSQL testleri ayrıca yanlış provider/customer/order, süre aşımı, beş yanlış deneme, tekrar kullanım, eşzamanlı tüketimde tek başarı, şikâyet/itiraz, ek iş/fiyat değişikliğinde yalnız müşteri kabulü ve audit INSERT hatasında rollback'i kapsar. Konum/GPS zorunluluğu eklenmedi.

Testteki `PAID` randevu sentetik DB fixture'ıdır; ödeme kuruluşundan tahsilat/hak ediş değildir. Checkout varsayılan kapalı; HTTP 503 ve gerçek SQL quote/hold/idempotent cancel ayrı doğrulanır. Canlı iyzico, dış sandbox işlem veya gerçek payout oluşturulmadı.

## 7. Mobil ve erişilebilirlik

Yeni gerçek Supabase tarayıcı koşusunda 14 ekran × 320/360/390/768/1024/1440 px = **84 ekran-boyut kontrolü**. Home, catalog, hizmet, usta, başvuru, müşteri ön kayıt/Güvence, partner, mağaza, belge ve admin dosya/kuyrukları dahil. Document scrollWidth viewport'u aşamaz. 390 px'de 14 axe taraması WCAG 2 A/AA ve 2.1 A/AA etiketlerinde sıfır ihlal ister; yalnız ciddi bulgular filtrelenmez. Hydration/uncaught page error listesi boş olmalıdır. 320/1440 px için 28 screenshot alınır; seçili home/admin/belge/Güvence görselleri ayrıca incelendi. Mevcut turuncu/beyaz premium düzen, fotoğraflar ve ana metinler korundu.

Kanıt: [84 kontrol](../artifacts/critical-backend-repair/mobile/result.json). Bu sonuç fiziksel cihaz, ekran okuyucu veya saha Web Vitals sertifikası değildir.

## 8. Nihai test sonuçları

Nihai kaynak hash'i: `516a791929fa71f102d3ad0830f8cf51ab243c76d2ffef12b335174b3affa5c1`. Aşağıdaki sonuçlar aynı kaynak sürümüne aittir. [Makine özeti](../artifacts/critical-backend-repair/summary.json), [yerel Supabase koşuları](../artifacts/critical-backend-repair/local-supabase/result.json) ve [release gate](../artifacts/security-testing/release-gate.json) saklandı. Test yığını kendi kesin workdir'i üzerinden kapatıldı; gerçek geliştirme yığını resetlenmedi.

| Test | Sonuç | Kanıt |
| --- | --- | --- |
| ESLint | PASS | `lint-result.json` |
| TypeScript | PASS | `typecheck-result.json` |
| Production build | PASS | `build-result.json` |
| Vitest unit | 157 test PASS, skip 0 | `unit-result.json` |
| Coverage | 157 test; seçili 6 çekirdek dosyada %100 | `coverage-result.json`; tüm uygulama coverage'ı değildir |
| Vitest security | 59 test PASS; wrapper 60 kontrol | `security-result.json` |
| npm audit | 0 high / 0 critical; **24 moderate açık** | `dependency-audit.json`; sıfır açık denmiyor |
| PostgreSQL 17 entegrasyon | 338 kontrol / 6 senaryo PASS | `integration-result.json` |
| Fault injection / mock protokol | 77 kontrol PASS | `mock-result.json`; gerçek servis E2E'nin yerine sayılmaz |
| HTTP guards | 20 kontrol PASS | `http-result.json`; gerçek localhost production server |
| Chromium tüm suite, workers=1 | 39/39 PASS · 6,3 dk · retry/skip/flaky 0 | `local-supabase/e2e-workers-1.json` |
| Chromium tüm suite, workers=2 | 39/39 PASS · 4,1 dk · retry/skip/flaky 0 | `local-supabase/e2e-workers-2.json` |
| Responsive / axe | 84 boyut, 14 axe PASS · 0 ihlal · 28 PNG | `mobile/result.json` |
| Takvim hydration regresyonu | 3/3 PASS · iki worker · retry 0 | `local-supabase/calendar-hydration-regression.json` |
| Yerel P0 kaynak/kanıt incelemesi | 6 kontrol PASS | `p0-review-result.json`; production uygulama onayı değildir |
| Release gate | BLOCKED | Google OAuth, dış processor sandbox ve hosted staging/production geçişi kapıları açık |

İlk tanılama denemelerinde browser binary eksikliği, localhost toplu rate limit ve eski selector hataları yaşandı. Bu başarısız koşular nihai PASS yerine kullanılmaz; tanılama JSON'ları ayrı tutuldu. Tek tek yeşil testler tam suite kanıtı sayılmadı.

Nihai tam koşular, başlangıçta bütün 72 migration'ı gerçek CLI ile kurulmuş aynı sahipli test yığınında doğrudan Playwright CLI komutlarıyla seri/paralel yürütüldü. Rapor doğrulayıcı her iki JSON'da 39 başarı, tek deneme, retry=0, skip/flaky/error=0 ve seri koşudan sonra paralel başlama koşulunu denetledi; eski başarısız JSON'lar kullanılmadı. Her iki strict acceptance kaydı bu gerçek rapordan üretildi. Bu, GitHub sunucusunda yeni bir run başlatıldığı anlamına gelmez.

## 9. Dört doğrulanmış test profili — production işlemi HENÜZ YOK

Kimlik kaynağı yalnız [açık ID manifest'i](prelaunch-confirmed-test-providers.json). Ad/telefon benzerliğiyle gerçek kayıt test sayılmadı. [Taze envanter](../artifacts/critical-backend-repair/production-provider-inventory.json), [son salt okunur kontrol](../artifacts/critical-backend-repair/production-final-readonly.json) ve [somut operasyon manifest'i](../artifacts/critical-backend-repair/confirmed-provider-operation-plan.json) saklandı.

| Provider ID | Sahip user ID | Başvuru / durum | Provider audit | Legacy order / request / payout / private Storage |
| --- | --- | --- | --- | --- |
| `4d0d8f4a-692e-4792-9fa6-5877ba76c55f` | `0e8618e1-57af-4504-815f-dd8066688a4b` | `3ecc1ed3-1a0c-4224-b2e9-b0c4d32ec495` / approved | 1 | 0 / 0 / 0 / 0 |
| `78bc496a-7f93-43fb-8748-33b5d6cde252` | yok | yok | 1 | 0 / 0 / 0 / 0 |
| `8a0fd4ad-4b34-4089-8737-3cebc64e4295` | `132cf13b-5b40-4da5-af9b-188a4c116f86` | `348ede79-f436-464c-a631-e09b413c22c8` / approved | 2 | 0 / 0 / 0 / 0 |
| `ec711057-c9a3-4a03-9737-4f560e3c39cb` | yok | yok | 0 | 0 / 0 / 0 / 0 |

Hepsi active=true ve approved=true. İlk üçünde is_verified=true; sonuncuda false. identity_verified/phone_verified hepsinde false. Başvurularda belge path'i yok. Production'da yayın review tablosu/RPC henüz yoktur. Bu nedenle bugün `mark_test` çalıştırılamaz. Uygulamanın bu dört kesin ID'yi kamuya açık sonuçlardan çıkaran mevcut koruması kaldırılmadı; deployment yapılmadığı için yeni kodun production'da çalıştığı iddia edilmiyor.

**Somut operasyon sırası — yalnız ayrıca açık onaydan ve onaylı migration geçişinden sonra:**

1. Proje ref'ini, dört ID/sahip/başvuru/FK/Storage/audit envanterini yeniden oku; fark varsa dur. Provider ve yeni publication review satırlarının erişimi sınırlı snapshot'ını al. Buradaki beklenen migration sonrası başlangıç: q.status=`pending_review`, q.record_kind=`unclassified`. Farklı bir insan kararı varsa üzerine yazma.
2. Dört ID'nin her biri için yetkili admin oturumunda `admin_provider_directory` ile güncel version/fingerprint al; `admin_provider_action(mark_test)` çağrısına açık gerekçe ve o işleme özel UUID request_id ver. **Yeni durum: hidden/test.** Provider active/approved/verified/user_id, başvuru, belge ve finans satırları aynı kalır.
3. Aynı ID'yi yeniden oku; yeni version ile ayrı UUID request_id kullanarak `unpublish` uygula. **Durum hidden/test kalır.** İki karar bilinçli olarak ayrı audit/receipt üretir: her provider için 2, dört provider toplam **8 yeni `provider.control.*` audit satırı**. Retry aynı payload/request_id ile yapılır; yeni UUID ile kör retry yapılmaz.
4. Her commit sonrası admin badge, anon liste/doğrudan profil, publication gate, offers ve slots kontrolü; account/application/finans/storage sayılarıyla snapshot karşılaştırması. 409/version conflict veya audit hatasında dur ve yeniden envanter al.
5. Geri dönüş yalnız yeni bir gerekçeli admin kararıdır. Bu başlangıç snapshot'ı için `pending_review` + `record_kind=unclassified` ve taze version/fingerprint, başlangıçtaki sınıflandırma/yayın inceleme durumunu geri getirir; **yeniden public yayın yapmaz**. Eski audit/receipt silinmez. Farklı snapshot geri dönüşü ayrı inceleme gerektirir. `mark_real` da yayın açmaz; pending review'a alır. Test profilleri otomatik olarak gerçek/yayında yapılmaz.

`mark_test`, `unpublish`, `mark_real`, review ve anon sınırları izole gerçek Supabase/SQL testlerinde çalıştı. Production için bu plan bir yazma yetkisi değildir. Kullanıcı talebi: **“Bu üretim işlemini uygulamak için ayrıca açık onay iste.”** Dört kayıt operasyonu için ayrıca onay istenmelidir; bu onay migration/deployment/ödeme açma onayı sayılmaz.

## 10. Production migration, yedekleme ve rollback planı

1. Ayrı production değişiklik onayı ve bakım penceresi al. O ana ait tam ledger + şema diff + bağımlılık/FK/trigger/RLS/function/grant envanterini al. Repo sürümünü/hash'ini sabitle. Yeni drift varsa bu raporla otomatik ilerleme.
2. Mevcut planın backup/PITR hakkını doğrula; yoksa erişimi sınırlı, şifrelenmiş mantıksal DB yedeği al. Roles/grants, migration ledger, private Storage obje/metadata yedeği ve restore adımlarını ayrı kaydet. Yedeği bir restore tatbikatıyla doğrula. Production verisi bu görevde test ortamına kopyalanmadı; veri içeren restore ayrıca yetkili ve erişimi kontrollü bir süreçtir.
3. Tam pending **26 dosyayı** sürüm sırasıyla gözden geçir. Ledger son sürümünden eski üç eksik kayıt da var; desteklenen CLI'da `db push --dry-run --include-all` planını incele. Normal push'un sadece en yeni dosyayı uygulaması yeterli değildir. Bu raporda hiçbir push/repair çalıştırılmadı; `migration repair --status applied` ile tarih sahteleme yapılmaz.
4. Gözlenen legacy grafiğin yeni alınan metadata ile hâlâ eşleştiğini kontrol et. `app_settings`/reassignment contract, `orders` decimal/status/FK, kategori kararları ve mevcut applied migration içeriklerini uzlaştır. Eski commerce-shaped orders görülürse dur.
5. Onay verilirse yalnız onaylı CLI planıyla migration'ları uygula. Dosyalar transaction sınırlarını kullanır; guard başarısızlığı durdurmalıdır. Başarısız dosya ledger'ını elle başarılı yazma. Önceki başarılı dosyalar ayrı transaction olarak kalabileceğinden kısmi geçişte eski uygulamayı kontrolsüz yeniden açma.
6. Backend health, legacy OID/FK/satır/audit/kategori karşılaştırması, yeni tablo/RPC/grant/RLS, private Storage ve bakım kimlikleriyle yetkili smoke yap. Deployment ayrı onaylanır; DB-first uyumluluk ve tüm request/order okuyucuları kontrol edilir. Online ödeme kapalı kalır. Ön kayıt, migration + app kabulünden sonra bilinçli açılır.
7. Rollback: yeni commerce tablolarını DROP/TRUNCATE etme; yeni finansal kayıt oluşmuşsa ters şema yerine forward fix tercih et. Eski uygulama sürümü commerce `orders` beklediğinden kör code rollback güvenli değildir. Önce trafik/checkout kapalı; uyumlu uygulama sürümü; migration/grant için gözden geçirilmiş düzeltme. Yıkıcı restore yalnız ayrı açık onay, veri kaybı aralığı ve restore tatbikatıyla. Legacy tabloyu/ledger'ı elle değiştirmek rollback sayılmaz.

Salt okunur [taze metadata planında](../artifacts/critical-backend-repair/migration-plan.json) CREATE çakışmaları **0**, pending **26**, koşullu mevcut nesneler `app_settings` ve `request_reassignment_log` olarak listelenir. Muhafazakâr `canApply:false` kararı otomatik uygulama sertifikası değildir. Yerel observed-upgrade PASS ile production uygulama onayı birbirinden ayrıdır.

## 11. Açık kalan kapılar

| Kapı | Durum / yapılacak |
| --- | --- |
| Production migration + deployment | **BLOCKED** — kullanıcı ayrı onay vermedi; uygulanmadı |
| Dört production test profili operasyonu | **BLOCKED** — yukarıdaki ayrı onay ve güncel snapshot gerekir |
| Gerçek Google OAuth dönüşü | **BLOCKED** — dış Google hesabı/redirect allowlist kabulü yok; local Auth PASS bunun yerine sayılmaz |
| Dış SMS teslimi | **BLOCKED** — sentetik doğrulanmış Auth telefonu test edildi; SMS sağlayıcısı teslimi test edilmedi |
| Gerçek iyzico sandbox/canlı ödeme | **BLOCKED** — şirketleşme/ayrı sağlayıcı kabulü; canlı ödeme kapalı |
| Malware taraması | **BLOCKED** — bağlı tarama servisi yok; unavailable açıkça gösterilir |
| Npm moderate advisories | **OPEN** — 24 bulgu; mevcut high/critical kapısı geçse de ayrı uyumlu güncelleme/triage gerekir |
| Hosted CI çalışması | **PENDING** — workflow hazır; talep gereği push/rerun yapılmadı |
| Fiziksel cihaz/ekran okuyucu/saha metrikleri | **BLOCKED** — browser responsive/axe kapsamı dışında |

Son production okuması 46 ledger, son `20260816000100`, commerce_orders yok, 11 aktif kategori, 10 başvuru, dört provider'ın aynı bayrakları ve 0 private belge nesnesi gösterdi. Bu oturum yalnız SELECT/READ ONLY yaptı. Başka kullanıcıların bütün olası eşzamanlı faaliyetlerine dair tam veri hash'i iddia edilmez; gözlenen alanlar ve bizim yazma yapmadığımız açıkça ayrılır.
