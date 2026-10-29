# FUWU — Security Hardening & Automated Test Engineering

> **29 Ekim 2026 Phase 3 revizyonu:** Güncel sayılar **90 unit**, **28 güvenlik**, **230 migration/SQL yürütmesi** (temiz commerce **108**, upgrade **109**), **77 offline ödeme/Auth** ve **20 gerçek localhost HTTP** kontrolüdür. Yeni profil yayın, slot ve ödeme başlangıcı regresyonları eklendi. Gerçek Google, iyzico ve izole Auth E2E kabulü bloke; production kararı NO-GO. Ayrıntı ve güncel kanıtlar: [FUWU_FINAL_PRODUCT_QA.md](FUWU_FINAL_PRODUCT_QA.md). Aşağıdaki 79/27/218 sayıları önceki denetim koşusunun tarihsel kaydıdır.

Tarih: **29 Ekim 2026 — Europe/Istanbul**.

**Release sonucu: BLOCKED. Production-ready onayı verilmedi.** Yerel doğrulamalar ile gerçek dış servis kanıtı ayrı tutulur. Production kaynağına yazılmadı, canlı ödeme yapılmadı, Git commit/push veya deployment yapılmadı. Çalışma başındaki commit edilmemiş backend düzeltmeleri korundu.

## Test mimarisi ve komutlar

| Komut | Kapsam ve güven sınırı |
| --- | --- |
| `npm run typecheck` | TypeScript; yürütme kanıtı üretir. |
| `npm run check:lint` | Tüm repo ESLint kontrolü; mevcut `npm run lint` korunur. |
| `npm run test:unit` | Ayrı `vitest.unit.config.ts`, Node ortamı. Storybook yapılandırmasına dokunulmadı. Ağ çağrısı mock edilmemişse test hata verir. |
| `npm run test:unit:coverage` | Aynı birim testleri; V8 satır, statement, function ve **branch** raporu. |
| `npm run test:security` | Ayrı Node güvenlik testleri + statik sınır kontrolü + güncel `npm audit`. High/critical bulgu CI'yi düşürür; advisory servisi erişilemiyorsa PASS üretilmez. |
| `npm run test:integration` | Dört bağımsız geçici PostgreSQL kümesi: tüm migration temiz/yükseltme ve commerce temiz/yükseltme. Env dosyası/uzak DB URL'si kullanılmaz. |
| `npm run test:mock` | Mevcut settlement fault injection, payment ve Auth regresyonları; dış HTTP cevapları sahtedir. Gerçek ödeme/OAuth testi sayılmaz. |
| `npm run test:http` | Derlenmiş Next uygulamasına gerçek localhost HTTP; entegrasyonlar kapalıdır. Satın alma E2E'si sayılmaz. Önce `npm run check:build`. |
| `npm run test:e2e:commerce` | Playwright + gerçek izole Supabase Auth/DB. Önce ortam ve Auth health kontrolü; yoksa BLOCKED ve nonzero exit. |
| `npm run check:build` | Next production build; env dosyalarındaki production değerleri açık boş değerlerle gölgelenir. |
| `npm run test:release` | Test çalıştırdığını varsaymaz. Mevcut kaynak hash'i ve son 24 saat içindeki gerçek yürütme kanıtlarını denetler. Eksik/boş/eski/skip sonuçla release geçmez. |

`artifacts/security-testing/` altında gerçek JSON çıktıları, loglar, HTML coverage ve her kontrol için `*-result.json` bulunur. Bu dosyalardaki kaynak hash'i değişiklik sonrası eski başarıların yeniden kullanılmasını engeller. Test betikleri exit code, test sayısı ve skip durumunu birlikte denetler.

Linux/CI PostgreSQL 17 binary'leri kullanır. Windows'ta PostgreSQL 17 kurulumu için `TEST_POSTGRES_BIN` binary dizinine ayarlanabilir; mevcut çalışma alanında önceki gömülü PostgreSQL runtime'ı desteklenir. Binary yoksa entegrasyon PASS sayılmaz. Bu oturumdaki sürüm ve nihai sayılar aşağıdaki sonuç tablosundadır.

## Gerçek test sonuçları

Son tamamlanan koşular: **79 unit + 27 security**, **218 PostgreSQL kontrolü**, **77 offline regresyon**, **20 gerçek localhost HTTP kontrolü**. Coverage koşusu unit testlerini tekrar çalıştırır; toplamı artırmak için ikinci kez sayılmadı. DB sayısı, temiz ve yükseltme koşularındaki kontrollerin yürütme sayısıdır; 218 farklı senaryo iddiası değildir.

| Kontrol | Sonuç | Geçen / ölçüm | Başarısız | Skip | Kanıt / sınır |
| --- | --- | ---: | ---: | ---: | --- |
| Node birim testleri | PASS | 79 | 0 | 0 | [unit.json](../artifacts/security-testing/unit.json) |
| Coverage koşusu (aynı 79 test; ek test sayılmaz) | PASS | 79 | 0 | 0 | [coverage-summary.json](../artifacts/security-testing/coverage/coverage-summary.json) |
| Node güvenlik testleri | PASS | 27 | 0 | 0 | [security.json](../artifacts/security-testing/security.json) |
| Tam migration / boş DB | PASS | 6 | 0 | 0 | [kanıt](../artifacts/security-testing/migration-chain.json) |
| Tam migration / kayıtlı eski şema | PASS | 7 | 0 | 0 | [kanıt](../artifacts/security-testing/migration-upgrade.json) |
| Commerce SQL / temiz sözleşme | PASS | 102 | 0 | 0 | [kanıt](../artifacts/security-testing/db-clean/database-tests.json) |
| Commerce SQL / yükseltilmiş sözleşme | PASS | 103 | 0 | 0 | [kanıt](../artifacts/security-testing/db-upgrade/database-tests.json) |
| Offline fault injection + mevcut ödeme/Auth regresyonları | PASS | 77 | 0 | 0 | [kanıt](../artifacts/security-testing/mock-result.json) |
| Gerçek localhost production HTTP | PASS | 20 | 0 | 0 | [kanıt](../artifacts/security-testing/http-result.json) |
| TypeScript | PASS | — | 0 | 0 | [kanıt](../artifacts/security-testing/typecheck-result.json) |
| ESLint | PASS | — | 0 | 0 | [kanıt](../artifacts/security-testing/lint-result.json) |
| Next production build | PASS | — | 0 | 0 | [kanıt](../artifacts/security-testing/build-result.json) |
| Storybook build | PASS | — | 0 | 0 | [kanıt](../artifacts/security-testing/storybook-result.json) |
| Güncel npm audit | PASS | 0 açık | 0 | — | [dependency-audit.json](../artifacts/security-testing/dependency-audit.json) |
| Statik client/secret/HTML sınır taraması | PASS | 418 dosya | 0 | — | [static-security.log](../artifacts/security-testing/static-security.log) |
| Gerçek Auth/DB commerce Playwright | BLOCKED | 0 | 0 | — | [kanıt](../artifacts/security-testing/commerce-e2e-result.json); yerel hedef politikası geçerli, Auth hizmetine erişilemiyor |
| Gerçek Google OAuth | BLOCKED | — | — | — | Gerçek Google staging oturumu/kanıtı yok |
| Gerçek iyzico sandbox checkout/refund | BLOCKED | — | — | — | Sandbox merchant/test kimliği ve işlem kanıtı yok |
| Storybook browser test koşusu | SKIP | — | — | — | Çalıştırılmadı; mevcut yapılandırma korundu, Storybook build doğrulandı |

Migration temiz ve yükseltme koşularında **65 SQL dosyası** ayrı ayrı uygulandı. Gerçek engine: **PostgreSQL 18.4, Windows x64**. DB kontrol dağılımı **6 + 7 + 102 + 103 = 218**. Mock dağılımı **20 settlement/fault injection + 28 payment + 29 Auth = 77**.

Unit dosya dağılımı: pricing 28, payment 28, validation 17, order-state 3, appointment 1, document-upload 1, database-rate-limit 1. Security dağılımı: environment 13, API 3, release gate 3, profile 2, headers 2, order API 2, public API 2. İsim ve assertion sonuçları bağlı JSON dosyalarında bulunur.

### Ölçülen kapsam

| Modül | Satır | Branch | Statement | Function |
| --- | ---: | ---: | ---: | ---: |
| order-state.ts | 100% | 100% | 100% | 100% |
| payment.ts | 100% | 100% | 100% | 100% |
| pricing.ts | 100% | 100% | 100% | 100% |
| requestBoundary.ts | 100% | 100% | 100% | 100% |
| safeRedirect.ts | 100% | 100% | 100% | 100% |
| imageMagicBytes.ts | 100% | 100% | 100% | 100% |

Toplam ölçüm: **109/109 satır, 161/161 branch, 132/132 statement, 27/27 function**. Bu, yalnızca tabloda listelenen altı kritik saf modülün kapsamıdır; tüm backend veya repo için %100 iddiası değildir. Her dosyada minimum branch **%85**, satır/statement/function **%90** eşikleri CI tarafından zorlanır. Settlement, Auth ve SQL kapsamı bu V8 yüzdesine dâhil değildir.

İlk koşulardaki sandbox izin hataları, eşzamanlı derleme sırasında oluşan TypeScript/worker hataları ve düzeltilen hata mesajı/HTTP beklentileri PASS sayılmadı. Son koşular sırayla tamamlandı. Worker başarısızlığı örneği [attempts](../artifacts/security-testing/attempts/) altında korundu. **Nihai tamamlanan unit/security/SQL/mock/HTTP assertion başarısızlığı: 0**. Beklenen release BLOCKED komutu nonzero exit üretir; bu başarılı production release değildir.

### Release kapılarının gerçek sonucu

| Kapı | Sonuç |
| --- | --- |
| `typecheck` | **PASS** |
| `lint` | **PASS** |
| `unit` | **PASS** |
| `coverage` | **PASS** |
| `integration` | **PASS** |
| `security` | **PASS** |
| `build` | **PASS** |
| `commerce-e2e` | **BLOCKED** |
| `google-oauth` | **BLOCKED** |
| `iyzico-sandbox` | **BLOCKED** |
| `staging-schema` | **BLOCKED** |
| `p0-review` | **BLOCKED** |

**Release: BLOCKED**. [Makine tarafından üretilen gate sonucu](../artifacts/security-testing/release-gate.json).


## İş kuralları ve testlerin sınırları

- Fiyat: %10 usta komisyonu, varsayılan %0 ve yapılandırılmış müşteri ücreti, geçersiz/negatif/sıfır/aşırı fiyat, oran sınırları, half-up kuruş yuvarlama ve tutar korunumu test edilir. Gerçek iade RPC'sinde müşteri ücreti dâhil **tam tahsilat** matrahı doğrulanır. Uygulamada kupon/indirim motoru yoktur; test yalnızca verilmiş indirimli hizmet bedelini fiyatlandırır, olmayan bir indirim özelliğini doğrulanmış saymaz.
- Sipariş: yetkili durum zinciri, başka müşteri/usta reddi, tamamlanma kodu, iptal, dispute, iade, süresi dolan rezervasyon, gecikme gözlemi ve idempotency kapsanır. Otorite SQL RPC'leridir; test için ikinci bir durum makinesi icat edilmedi.
- Ödeme: token, conversation, basket, TRY, tutar, paidPrice, payment/item/submerchant kimliği ve fraud sonucu eşleşir. HPP V3 imzası token'a bağlıdır. Duplicate callback, yanlış ödeme sonucu ve yarım settlement gerçek SQL/mocked HTTP katmanlarında ayrı ayrı sınanır.
- Yetki: gerçek RLS/ACL, customer/provider/admin ayrımı, metadata ile admin olamama, finans/token kolonları, admin RPC'leri, yorum sahipliği/tekilliği ve katılımcı izolasyonu test edilir. Stubbed Auth/API testleri RLS kanıtı sayılmaz.
- Doğrulama: HTML/script içeren düz metin yorumlar, uzun yorum, UUID, gövde byte sınırı, sahte Content-Length, gerçek takvim tarihi/explicit timezone, güvenli redirect ve rate limit sınırları test edilir.
- Aynı slot için **12 bağımsız TCP bağlantısı** aynı anda RPC çağırır; yalnızca biri kabul edilmelidir. İki ayrı oturum aynı idempotency key ile aynı siparişi ve expiry'yi alır. Audit insert hatası enjekte edildiğinde ödeme transaction'ı, sipariş ve audit atomik olarak geri alınır.
- Tam migration testleri gerçek repo SQL'ini çalıştırır. Supabase `auth`/`storage` platform tabloları ve fonksiyonları minimal DDL ile sağlanır. Auth servisi, Storage HTTP, PostgREST JWT doğrulaması veya hosted Supabase emüle edilmiş sayılmaz. Commerce fixture testlerinin baseline tabloları ayrıca kurgusaldır; bu yüzden tüm migration testleri de ayrı çalıştırılır.

## Güvenlik bulguları ve değişiklikler

| Öncelik | Bulgu | Sonuç / kanıt |
| --- | --- | --- |
| P0 / ortam sınırı | Playwright `.env.local` yükleyebiliyor; remote flag tek başına yazmayı açıyordu. Loopback prefix regex'i yanıltılabilirdi. | **Düzeltildi:** WHATWG URL ile exact host, `config/test-targets.json` allowlist, korunan proje ve developer/prod env ref/key reddi, JWT target/role eşleşmesi, ayrı remote opt-in. Varsayılan uzak allowlist boştur. Bilinen eski uzak ref korumalı/unclassified olarak reddedilir; production olduğu iddia edilmez. |
| P0 / test iddiası | Test çalışmamışken release başarısı üretme riski. | **Düzeltildi:** gerçek exit code, pozitif test sayısı, sıfır failure/skip, kaynak hash'i ve taze kanıt. Google/iyzico/staging/P0 inceleme kanıtı eksikse release BLOCKED. Bu, otomatik deployment veya manuel onay mekanizması değildir. |
| P1 | Testler mevcut developer sunucusunu kullanıp dolaylı production DB'ye yazabilirdi. | **Düzeltildi:** uygulama loopback, `reuseExistingServer:false`, dış sunucu skip seçeneği reddedilir. Next'in env loader'ının production sırlarına geri düşmesi boş env değerleriyle engellenir. |
| P1 | Bazı eski DB test betikleri `.env.local`/uzak opt-in kullanıyordu. | **Düzeltildi:** assignment-race, provider-matching, customer-payment ve review-submission ortak test ortamı doğrulamasına bağlandı. Eski uzak matching bayrağı ortak allowlist'i aşamaz. |
| P1 | Commerce/ödeme JSON ve callback form gövdeleri sınırsız okunabiliyordu. | **Düzeltildi:** stream byte sayımı ve Content-Length kontrolü, 64 KiB üstünde 413. AI multipart için mevcut 10 MiB görsel sınırına ek 256 KiB toplam form payı; destek JSON'u 64 KiB. |
| P1 | Origin olmayan cross-site fetch bazı mutation kontrollerinden geçebiliyordu; support/AI Origin kontrolü eksikti. | **Düzeltildi:** merkezi Origin + Fetch Metadata kontrolü. Gerçek iyzico callback/webhook exact path istisnasıdır; gövde sınırı, imza ve sunucudan ödeme doğrulaması korunur. Origin/Fetch Metadata içermeyen non-browser istemciler mevcut sözleşme kapsamında kabul edilir. |
| P1 | Görsel magic-byte okuyucu hatasında doğrulama başarılı dönüyordu. Özel belgeler uzantı/MIME'a güveniyordu. | **Düzeltildi:** okunamayan görsel fail-closed; belge header'ı PDF/JPEG/PNG olmalı, sıfır byte reddi, doğrulanmış Content-Type kullanımı, mevcut 5 MiB sınırı. Bu antivirüs veya tam dosya decode taraması değildir. |
| P1 | `Date.parse` locale formatlarını ve taşan takvim tarihlerini kabul edebiliyordu. | **Düzeltildi:** sipariş API'si gerçek takvim günü ve explicit timezone içeren ISO timestamp ister. |
| P1 | Authenticated rate-limit fallback'ı read-modify-write yarışına ve browser'ın kendi sayacını düşürmesine açıktı. | **Düzeltildi:** yeni atomik consume RPC, doğrudan counter mutation reddi ve production DB outage durumunda fail-closed. Ayrı 12 TCP bağlantısıyla limit yarış testi. |
| P1 | Service-role modülünün browser kullanımına karşı ek koruması yoktu. | **Düzeltildi:** browser runtime reddi + client kaynakta doğrudan import/public-secret statik denetimi. Static scanner tüm olası transitif import akışlarını kanıtlamaz; build ayrıca çalıştırılır. |
| P1 | İlk güncel npm audit 24 paket bulgusu bildirdi: 4 critical, 10 high, 9 moderate, 1 low. | Kontrollü aynı-major güncellemeler ve lockfile yenilendi. Next 16, Storybook 10, Vitest 4, Vite 6 korundu; MCP addon 0.7 korundu, Valibot alt bağımlılığı override ile 1.x içinde yamalandı. Nihai audit sonucu test tablosundadır. `audit fix --force` kullanılmadı. |
| Kontrol | CSP, cookie, XSS, hata ve audit sınırları | Production CSP nonce/strict-dynamic, unsafe-eval yokluğu, frame/plugin reddi; gerçek SSR cookie/Auth regresyonları; React düz metin yorum render'ı; SQL/processor mesajı redaksiyonu, request ID/no-store ve redakte audit kontrolleri çalıştırılır. |
| Kontrol | Storage | Gerçek migration politikalarıyla özel belge sahibi okuma/yazma, başka kullanıcı/path spoofing ve anon erişim reddi; bucket private/MIME/size metadata'sı test edilir. Storage servisinin dosya HTTP davranışı staging gerektirir. |

## Açık riskler ve BLOCKED kapsam

1. **Önceki rapordaki uzak şema uyuşmazlığı kapatılmış sayılmıyor.** `docs/FUWU_BACKEND_RELIABILITY_REPORT.md` mevcut uzak `orders` sözleşmesi ve eksik commerce tabloları için P0 bildirmişti. Bu oturum production şemasına müdahale etmedi veya tarihsel uzak bulguyu yeniden doğrulanmış sonuç olarak sunmadı. Yetkili metadata/ledger karşılaştırması ve ayrı staging onarımı olmadan `staging-schema`/`p0-review` kapısı geçmez.
2. **Gerçek Google OAuth BLOCKED.** Mocked Auth HTTP, PKCE/cookie/redirect testleri gerçek Google hesabıyla girişin kanıtı değildir. Ayrı sentetik staging kimliğiyle login→callback→kalıcı session→satın almaya dönüş test edilmelidir. Canlı kullanıcı oturumu veya geçmiş storage-state dosyaları kullanılmadı.
3. **Gerçek iyzico sandbox E2E BLOCKED.** Sandbox merchant/submerchant/test kimliği ve gerçek işlem sonucu yok. Üretim iyzico API'si kabul edilmez. Genel Playwright/Node koşularına gerçek ödeme anahtarları verilmez; gerçek sandbox checkout/callback/webhook/refund/payout approval, ayrı kontrollü staging koşusunda kanıtlanmalıdır. Mocked processor testleri bu kapıyı geçirmez.
4. **PG17 ve gerçek Supabase platformu:** yereldeki gömülü PG18 sonucu PG17 veya Auth/Storage hizmetiyle eşdeğer değildir. GitHub Actions PG17 ve ayrı local Supabase iş akışı tanımlandı; bu oturumda GitHub üzerinde çalıştırılmadı.
5. **Dağıtık anonim rate limiting P1:** authenticated DB limiter `20261029000200_atomic_rate_limit.sql` ile atomik upsert RPC'sine taşındı; browser counter reset/update/delete yetkileri kaldırıldı ve production DB outage durumunda erişim reddedilir. 12 bağlantıdan yalnızca limitteki 3 istek kabul edilir. Anonim IP tabanlı API limiter'ının Redis kesintisi yolu hâlâ instance belleğine döner; global DDoS kontrolü sertifikalandırılmadı. Production Redis/proxy IP güven sınırı ve anonim outage politikası staging gerektirir. Commerce slot/idempotency güvencesi DB kilit/constraint'lerine dayanır.
6. **Dosyalar ve CSP:** magic bytes tam içerik zararsızlığı kanıtlamaz. Private PDF aktif içeriği/virüs taraması yapılmadı. CSP mevcut `style-src 'unsafe-inline'` ve gerekli üçüncü taraf kaynaklarını korur; bunu kaldırmanın tüm UI üzerinde doğrulaması yapılmadı.
7. **Secret taraması sınırı:** runtime production sırları test env'ine aktarılmadı. Statik public-key/import denetimi bir secret-history veya harici DAST/pentest raporu değildir.

## CI ve release gate

`.github/workflows/quality.yml` PR/main üzerinde TypeScript → ESLint → unit → coverage → izole PostgreSQL entegrasyon → mocked regresyon → güvenlik/audit → build çalıştırır; hiçbir production secret istemez ve başarısız adım işi düşürür. Mevcut local-Supabase Playwright iş akışı korunup yeni ortam sınırına uyarlandı. Workflow dosyası eklenmesi, GitHub üzerinde yeşil koşu gerçekleştiği anlamına gelmez.

`test:release` en az `typecheck`, `lint`, `unit`, `coverage`, `integration`, `security`, `build`, `commerce-e2e`, `google-oauth`, `iyzico-sandbox`, `staging-schema`, `p0-review` kanıtlarını ister. Eksik kritik test SKIP/BLOCKED iken release **PASS olamaz**. `release-gate.json` her kapıyı ayrı gösterir. OAuth/sandbox/staging kanıtları bu çalışma sırasında üretilmedi; elle başarılı sayılmadı.

## Resmî teknik kaynaklar

- [Supabase RLS ve ACL](https://supabase.com/docs/guides/database/postgres/row-level-security) — gerçek DB rol/policy test yaklaşımı.
- [Supabase veritabanı testleri](https://supabase.com/docs/guides/database/testing) — gerçek PostgreSQL testlerinin platform E2E'den ayrılması.
- [iyzico V3 webhook imzaları](https://docs.iyzico.com/en/advanced/webhook) — HPP token'ının imza girdisine dâhil edilmesi.

Vitest/Next yapılandırması ayrıca kurulu paketlerin type/source sözleşmelerine göre doğrulandı.
