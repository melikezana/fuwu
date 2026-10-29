# FUWU Backend Reliability & Database Repair

Tarih: **29 Ekim 2026, Europe/Istanbul**. Repo: `melikezana/fuwu`.

**Sonuç: Yerel kod ve migration onarımları uygulandı. Bağlı veritabanı onarılmadı; production onayı verilmedi.** Hosted staging erişimi, gerçek Google oturumu ve iyzico sandbox işlem bilgileri bulunmadığından bunların uçtan uca doğrulaması **BLOCKED**. Production DB, gerçek ödeme, Git push veya deployment yapılmadı. Testlerde yalnızca izole PostgreSQL, kurgusal kayıtlar ve sahte HTTP cevapları kullanıldı. Uzak kontroller anonim GET ve `limit=0` ile yapıldı.

## Başlangıç ve ortam kanıtı

Başlangıç HEAD: `e9c812f7a5e6369953d1650ed0c3eba4eb161128` — `Improve FUWU premium mobile UX and app experience`. Çalışma ağacı başlangıçta temizdi. Önceki `docs/FUWU_PREMIUM_MOBILE_UX_FINAL_AUDIT.md`, `artifacts/premium-mobile/external-readonly-tests.json` ve `quality-summary.json` okundu. Önceki 86 SQL / 28 ödeme / 29 Auth sonucu yeni dış ortam doğrulaması olarak kullanılmadı; ilgili kontroller yeniden çalıştırıldı.

| Ortam | Doğrulanan bağlantı | Sınır |
| --- | --- | --- |
| Yerel uygulama `.env.local` | Supabase proje ref `bjhyisomjadirdchruix` | Service-role ve iyzico anahtarları yok. Bu ref'in production ya da staging olduğu kanıtlanmadı. |
| `.env.test` | `127.0.0.1`; yerel Supabase yapılandırması | Docker daemon kapalı. Dosyada test sunucu anahtarı bulunması çalışan Auth hizmeti kanıtı değil. |
| Hosted staging | **BLOCKED** | Ayrı staging bağlantısı veya doğrulanmış deployment ortamı yok. |
| Production deployment → Supabase eşlemesi | **BLOCKED** | Production/preview env dosyaları ve deployment ortamı erişimi yok. Yerel URL production kimliği kabul edilmedi. |
| İzole SQL ortamı | Gömülü PostgreSQL **18.4**, yalnızca loopback | `supabase/config.toml` major sürüm **17** istiyor. 17 ve gerçek Supabase platformu üzerinde staging tekrarı gerekli. |

Anahtar değerleri rapora veya terminale yazılmadı. Kişisel veri satırı, production dump'ı veya gerçek ödeme cevabı indirilmedi. Kanıt: [external-readonly.json](../artifacts/backend-reliability/external-readonly.json).

### Güncel uzak şema sonucu

| Anonim, sıfır satırlı kontrol | Sonuç | Yorum |
| --- | --- | --- |
| `service_catalog.id` | 404 / `PGRST205` | API şema önbelleğinde bulunamıyor. |
| `service_variants.id,provider_id` | 404 / `PGRST205` | API şema önbelleğinde bulunamıyor. |
| `reviews.order_id,service_request_id` | 400 / `42703` | Gerekli yorum kaynak kolonları yok. |
| `customer_favorite_providers.customer_id` | 404 / `PGRST205` | Favoriler tablosu API'de bulunamıyor. |
| Kategori görünürlük/ücret kolonları | 400 / `42703` | Yeni kategori/ücret sözleşmesi eksik. |
| `orders.id` | **200** | Aynı isimde mevcut tablo var. Hiçbir sipariş satırı istenmedi. |
| `orders.customer_id,provider_id,offering_id,total_minor` ve ücret kolonları | 400 / `42703` | Mevcut tablo beklenen commerce sözleşmesiyle uyuşmuyor. |
| Auth settings | 200, Google açık | Gerçek Google giriş/session/callback testi değildir. |
| REST OpenAPI metadata | 401 | Tam kolon, ACL, RLS ve migration ledger dökümü alınamadı. |

**P0: Uzak projeye yalnızca eksik migration'ları uygulamak güvenli bir onarım sayılmaz.** `20261021000100_direct_service_commerce.sql`, `orders` oluşturur; mevcut farklı `orders` tablosuyla isim çakışabilir. Tablo silme/yeniden adlandırma, veri dönüştürme, ledger'a uygulanmış gibi kayıt ekleme veya `IF NOT EXISTS` ile uyuşmazlığı gizleme yapılmadı. Migration ledger erişimi olmadan hangi sürümlerin gerçekten uygulandığı iddia edilmiyor. Tam şema metadata'sı alınıp mevcut tablonun kullanım/bağımlılıkları anlaşılmadan uzak repair SQL'i üretmek veri kaybı riski taşır.

## Bulgular ve uygulanan düzeltmeler

| Bulgu / dosya | Problem | Düzeltme | Test kanıtı | Kalan risk / production gereksinimi |
| --- | --- | --- | --- | --- |
| B01 · `supabase/migrations`, `scripts/audit-backend-readonly.mjs` | Uzak commerce tabloları/kolonları eksik; mevcut `orders` uyumsuz | Salt okunur probe, tüm zincir için gerçek PostgreSQL runner ve metadata-only kontrol SQL'i eklendi. Uzak şema değiştirilmedi. | `external-readonly.json`, `migration-chain.json`, `migration-upgrade.json` | **BLOCKED:** gerçek şema/ledger, staging ve PG17 doğrulaması. Uyuşmazlık çözülmeden doğrudan migration yok. |
| B02 · `src/services/commerce/settlement.ts`, `20261029000100_backend_reliability.sql` | Claim, dış servis ve finalize hataları sessizce dönüyordu | Tekil `release-{orderId}` / `refund-{orderId}` referansı; kalıcı işlem günlüğü, sınıflandırma, request ID, atomik audit ve admin mutabakat RPC'leri | SQL claim yarışları, yanlış tutar/kimlik/reference, timeout ve audit outage fault injection | İzleme altyapısı ve operatör takibi gerekli. Çökme sonrası `IN_FLIGHT` manuel incelemede kalır; otomatik tekrar yok. |
| B03 · aynı dosyalar | Eski finalize RPC'si yalnızca claim'e bakıyordu; uygulama dışı yanlış çağrı sonucu tamamlayabilirdi | `commerce_finish_settlement` artık kalıcı `VERIFIED` işlem kaydı ister. Servis kaydı işlem kimliği, conversation ve iade tutarı/TRY ile eşler. | Doğrulamasız finalize reddi; participant RPC erişim reddi; idempotent finish | Service-role güven sınırıdır; anahtar asla istemciye verilmemeli. Gerçek processor cevabı alınmadan `VERIFIED` yazılamaz. |
| B04 · `settlement.ts`, `src/app/admin/marketplace/actions.ts` | Doğrulanmış cevap sonrası son DB yazısı başarısız olursa belirsiz işlem tekrar gönderilebilirdi; admin release her durumda kabul edilmiş görünüyordu | Kalıcı `VERIFIED` kaydından yalnızca yerel finalize tekrarı. Admin reconcile bu kurtarmayı çağırır; release sonucu açıkça kontrol edilir. | Tek dış çağrı ile ikinci finalize denemesinde toparlanma testi | Doğrulama kaydı da yazılamadıysa manuel processor mutabakatı gerekir. |
| B05 · `src/services/payments/iyzico-client.ts`, commerce callback ve legacy webhook | HPP payload'ında direct imza fallback'i token'ı kapsamıyordu; bildirim kimliği ile sorgulanan ödeme aynı anda denetlenmiyordu | Token içeren payload yalnızca HPP V3 formülüyle doğrulanır. Legacy V1/V2 header fallback'i kaldırıldı. Saklanan token ile sorgu; conversation, payment ID ve merchant snapshot eşleşmesi | HPP token değiştirme, signed payment ID uyuşmazlığı ve mevcut 28 ödeme kontrolü | Merchant hesabında V3 etkinliği ve gerçek callback/webhook tekrarları sandbox'ta doğrulanmalı. |
| B06 · `src/app/api/payments/iyzico/webhook/route.ts` | Geç gelen legacy başarısız cevap başarılı ödeme durumunu üzerine yazabilirdi; hata yazısı kontrol edilmiyordu | Başarısız sonuç yalnızca pending/failed kayıtlarına CAS ile uygulanır; DB hatası 503. Commerce `SUCCEEDED` durumu mevcut RPC'de tek yönlü/idempotent kalır. | SQL callback idempotency ve offline reconciliation final/uncertain senaryoları | Gerçek legacy webhook yarışları hosted staging'de tekrar gerekli. |
| B07 · `src/app/api/payments/iyzico/checkout/route.ts` | Legacy initializer dış işlemden önce kalıcı claim almıyordu; tekrar veya timeout ikinci checkout oluşturabilirdi. `%1` oranı `%100` yorumlanabiliyordu. | Unique request kaydı + `NONE → IN_FLIGHT → ATTACHED` CAS. Fiyat/pay ve merchant snapshot dış çağrıdan önce yazılır; sabit `request-{requestId}` referansı, ayrı admin kuyruğu ve atomik audit. Eksik server client fail-closed; aktif/onaylı usta ve uygun legacy durum kontrolü. Oran yüzde olarak yorumlanır. | PostgreSQL'de iki eşzamanlı legacy CAS'tan biri kazanır; ayrı kuyruk/audit/ACL; commerce initializer yarış testleri; statik tür/lint | Legacy checkout'un gerçek Auth + iyzico E2E'si **BLOCKED**. Eski session'lar `ATTACHED` kalır; eski merchant snapshot'ları bilinmediği için doldurulmadı. |
| B08 · yeni migration, legacy payments | Önceki provider INSERT politikası online ödeme durumu uydurabilir; customer online pending kaydı manuel onaylayabilir; `SELECT *` checkout token'ı açabilirdi | Tüm browser rollerine online finansal INSERT/UPDATE trigger engeli. Token/merchant kolonlarının SELECT yetkisi kaldırıldı; güvenli kolonlar ve offline akış korundu. | Tam gerçek repo şemasında sahte online INSERT ve token SELECT reddi; katılımcı/anon ACL testleri | Eski tarihli kayıtların gerçekten processor'da karşılığı olup olmadığı ayrı tarihsel mutabakat gerektirir; kayıtlar otomatik değiştirilmedi. |
| B09 · `src/services/payments/index.ts`, `src/services/admin/operations.ts` | Legacy hak ediş timeout'u tahsil edilmiş ödemeyi failed gösterebiliyordu; sıfır satırlı refund update başarı sayılabilirdi | Belirsiz payout tahsil durumunu korur; `RELEASE_IN_FLIGHT` kalır. İade/approve conversation eşleşmesi; iade finalize CAS ve dönen satır kontrolü | Tür kontrolü, mevcut ödeme doğrulama kontrolleri; yeni commerce fault injection | Legacy gerçek refund/release E2E **BLOCKED**. Processor approve, banka hesabına payout gerçekleştiği anlamına gelmez. |
| B10 · `src/lib/commerce/api.ts`, 15 ilgili API route | Ham SQL mesajları, tutarsız HTTP kodları ve request ID eksikliği | Exact allowlist; 400/401/403/404/409/429/502/503; güvenli Türkçe mesaj, `code`, `requestId`, `x-request-id`, `private, no-store`; beklenmeyen hata yakalama ve rate-limit başlıklarının korunması | API raw-error/sentinel, 403/409 ve success correlation; 16 gerçek local production HTTP kontrolü | Kapsam commerce, iyzico, Auth user/logout, favorites ve commerce cron'dur; ilgisiz API'lerin yeniden yazıldığı iddia edilmiyor. |
| B11 · `src/lib/supabase/fetch.ts`, server/serviceRole, middleware | Bazı Auth/PostgREST çağrıları sınırsız bekleyebilirdi | 8 saniye üst sınırı, mevcut abort sinyali ile birleşim; mevcut iyzico 20 saniyelik timeout ve tekrarsız fetch korundu | Auth ağ hatası testleri; fault injection | Supabase SDK refresh davranışı gerçek ağ koşullarında staging'de ölçülmeli. |
| B12 · auth callback, SSR/browser clients, middleware | HTTPS session cookie'lerinde Secure açıkça belirlenmiyordu; Auth/DB logları SQL ayrıntısı içerebiliyordu | HTTPS'te Secure, SameSite=Lax; callback gerçek origin'i kullanır, loopback HTTP çalışabilir. Ham SQL message/details/hint/cause log/Sentry akışından çıkarıldı. | 29 Auth kontrolü: gerçek SSR cookie kodu + mock HTTP; metadata admin reddi, refresh, güvenli next, Secure/Lax; log sentinel testi | Gerçek Google/PKCE/browser dönüşü **BLOCKED**. HttpOnly false, Supabase browser session mimarisinin parçasıdır; bunu değiştirip oturumu bozma yapılmadı. |
| B13 · `commerce_begin_payment` | Hold sonrasında hizmet/kategori kapatılsa da ödeme başlayabilirdi | Claim sırasında offering, servis, varyant, görünür kategori ve aktif/onaylı usta tekrar doğrulanır; mevcut sipariş fiyatı yeniden hesaplanmaz | Çekilmiş offering için initializer ve transaction oluşmaması SQL testi | Çoktan oluşturulmuş harici session iptal endpoint'i eklenmedi. Gecikmiş ödeme yine refund akışına girer. |
| B14 · yeni migration index'leri | Sipariş olayları ve mutabakat sorgularında eksik destek index'leri | Pending settlement, order event, offering service/variant ve provider review index'leri | Tam migration zinciri; katalog constraint export | Büyük production tablosunda index kilit süresi ölçülmeli; bakım penceresi ve gerekirse ayrı concurrent index planı gerekir. |

## Migration ve satın alma bütünlüğü denetimi

64 migration sıralı olarak **aynen**, tarihsel migration dosyalarını değiştirmeden çalıştırıldı. Auth/Storage için yalnızca platform DDL shim'i kullanıldı; Supabase Auth sunucusu veya Storage E2E'si taklit edilmiş sayılmaz. Temiz kurulum ile mevcut şemadan yükseltme ayrı geçici kümelerde test edildi.

| Zincir | İncelenen/veritabanında test edilen sözleşme |
| --- | --- |
| Direct commerce `20261021000100` | Katalog/varyant/offering FK'leri; tek customer idempotency key; tek payment/order; unique token/payment/item ID; provider kilidiyle slot çakışması ve legacy rezervasyon köprüsü; RLS ve service-only ödeme RPC'leri |
| Fusion operations `20261022000100` | Varsayılan customer rolü; rol değiştirme trigger'ı; finance/GMV ayrımı; audit/notification; legacy settlement tek claim |
| Fusion reviews `20261022000200` | Kaynak FK'leri; tek order/request review unique index'leri; tarihsel yorumu silmeden koruma; ücretli tamamlanmış hizmet uygunluğu; eşzamanlı review |
| Customer favorites `20261026000100` | Customer/provider FK + birleşik PK; başka müşterinin favorisini okuma/yazma/silme reddi |
| Phase3 ve finance privacy `20261026000200…00400` | Provider-owned paket unique constraint'i, tamamlama kodu, özel finans kolonları; moderation sonrası tekrar review engeli |
| Checkout consistency `20261028000100` | Initializer merchant snapshot; token/item/payment kimliği; provider kilidinde beklerken süresi dolan rezervasyonun yeniden canlanmaması |
| Category visibility / double commission `20261028000200` | Gizli kategori satın alınamaz; default provider %10/customer %0; immutable fiyat, ücret/rate ve onay snapshot'ı; günlük kapasite yarışı; GMV/platform geliri ayrımı |
| Reliability `20261029000100` | Doğrulanmış settlement zorunluluğu; sınıflı audit; eski IN_FLIGHT karantinası; legacy initializer/finans yetkileri; satış uygunluğunun yeniden doğrulanması |

Sunucu akışı: hizmet ve usta uygunluğu → bölge/takvim → gerçek slot/hold → SQL fiyat ve ücret snapshot'ı → tek checkout claim → authenticated processor retrieval → kimlik/tutar/TRY/merchant/fraud kontrolü → ödeme durum RPC'si. Tarayıcı fiyatı yalnızca beklenen tutar karşılaştırmasıdır. İşlenmemiş/incelemede/belirsiz dış sonuç `PAID`, `REFUNDED` veya `RELEASED` üretmez.

Geç ödeme, süresi dolmuş hold'u veya başkasının yeniden aldığı slot'u geri alamaz; `REFUND_PENDING` olur. Müşteri ücreti yapılandırılmadığında sıfır; provider başlangıç komisyonu %10. Hizmet GMV'si, tahsilat, usta komisyonu ve müşteri ücreti ayrıdır. Bilinmeyen processor kesintisi sıfır varsayılıp net gelir uydurulmaz. Fiyat/rate/consent alanları lifecycle update ile değişmez. İade müşteri ücretini de kapsayan tam tahsilat üzerinden doğrulanır.

## Kanıtlar ve doğrulama sınırları

Güncel sonuçların makine kaydı: [verification-summary.json](../artifacts/backend-reliability/verification-summary.json).

Nihai sonuç: **64 migration temiz kurulum + 64 migration mevcut şemadan yükseltme; 95 clean / 96 upgrade SQL kontrolü; 20 offline hata enjeksiyonu; 28 offline ödeme; 29 offline Auth; 16 gerçek local production HTTP kontrolü geçti.** Production webpack build, `tsc --noEmit`, değişen TypeScript dosyalarında ESLint ve `git diff --check` geçti. Bunlar hosted staging veya gerçek Google/iyzico testi değildir.

- Tam 64 migration temiz kurulum: [migration-chain.json](../artifacts/backend-reliability/migration-chain.json).
- Tam repo şemasından kurgusal kayıtlarla yükseltme, mevcut order/review/payment/provider/category satırlarının birebir korunması ve tarihsel IN_FLIGHT karantinası: [migration-upgrade.json](../artifacts/backend-reliability/migration-upgrade.json).
- Bağımsız PostgreSQL oturumlarıyla commerce clean/upgrade davranışları: [clean/database-tests.json](../artifacts/backend-reliability/clean/database-tests.json), [upgrade/database-tests.json](../artifacts/backend-reliability/upgrade/database-tests.json).
- Dış HTTP/RPC fault injection: [fault-injection.json](../artifacts/backend-reliability/fault-injection.json). Gerçek iyzico işlemi değildir.
- Mevcut 28 ödeme kontrolü: [payment/payment-tests.json](../artifacts/backend-reliability/payment/payment-tests.json).
- Gerçek SSR kütüphanesiyle 29 offline Auth kontrolü: [auth-tests.json](../artifacts/backend-reliability/auth-tests.json). Gerçek Google oturumu değildir.
- Gerçek yerel production sunucusunda 16 HTTP hata/yetki/correlation kontrolü: [http-guards.json](../artifacts/backend-reliability/http-guards.json). Authenticated satın alma veya dış servis E2E'si değildir.
- FK/check/unique envanteri: [isolated-constraints.json](../artifacts/backend-reliability/isolated-constraints.json). Yalnızca izole şema metadata'sı.

İlk sandbox çalıştırmasında loopback bağlantısı EACCES ile engellendi; aynı yalnızca-localhost testler gerekli yürütme izniyle çalıştırıldı. İlk yeni test koşumundaki SQL fixture parametre tipi uyuşmazlığı düzeltildi. İlk build .next yazısında EPERM aldı; aynı workspace derlemesi gerekli yürütme izniyle geçti. Build ve HTTP testlerinde Supabase yalnızca `127.0.0.1:1` adresine yöneltildi, ödeme anahtarları boştu. Geçen sonuçlar ilk başarısız denemelerin yerine kullanıldı. Docker/Supabase Auth ortamı çalışmış gibi raporlanmıyor.

## Manuel mutabakat ve kurtarma

1. Mevcut admin `/admin/marketplace?view=reconciliation` IN_FLIGHT siparişleri gösterir. Admin oturumu `commerce_admin_settlement_queue()` ile işlem referansı, state, hata sınıfı, request ID ve zamanı okuyabilir. RPC'de checkout token, merchant key, adres veya raw processor cevabı bulunmaz.
   Legacy checkout başlatmaları `commerce_admin_legacy_checkout_queue()` üzerinden ayrı okunur. `request-…` referansı ve `IN_FLIGHT` kaydı korunur; inceleme yapılmadan `NONE` durumuna alınmaz. Bu kuyruğa yeni commerce siparişleri karıştırılmaz.
2. `commerce_review_settlement(operation_reference, evidence_reference)` yalnızca admin rolüyle çağrılır. Örnek kanıt referansı `IYZ-SUPPORT-1234`; kişisel veri veya tam ödeme cevabı bu alana yazılmaz. Bu işlem yalnızca inceleme izini kaydeder, ödeme/iade başarısı yaratmaz.
3. `IN_FLIGHT` / `MANUAL_REVIEW`: aynı referans için iyzico merchant destek/raporuyla sonucu araştır. Timeout'u başarısız kabul edip yeniden refund/approve gönderme. `payout_state`/`refund_state` alanını `NONE` yapma; claim satırını silme.
4. `VERIFIED`: processor cevabı daha önce doğrulanıp kalıcı kaydedilmiş; yalnızca son yerel finalize eksik. Admin **Ödeme Sonucunu Sorgula** akışı tekrar dış settlement göndermeden yerel finalize'ı tamamlayabilir.
5. Manuel doğrulama için servis operatörü gerçek processor kanıtını işlem/conversation/tutar/TRY ile doğrulamalıdır. Sadece ekran görüntüsü, admin beyanı, istemci payload'ı veya uygulamanın `SUCCEEDED` kaydı yeterli değildir. Doğrulanmış processor kanıtı yoksa kayıt beklemede kalır. Bu görevde otomatik refund-status/approval-status adapter'ı veya süper-admin “başarılı say” endpoint'i eklenmedi.
6. İşlem doğrudan processor'da gerçekleşmiş fakat doğrulanmış cevap uygulamaya ulaşmamışsa manuel mutabakat gerekir. Bu sınırlama ikinci para hareketi oluşturmaktan daha güvenlidir. Onay yanıtı, banka transferinin tamamlandığına dair kanıt değildir.

## Staging, yedekleme ve geri dönüş planı

**Bu adımlar uygulanmadı; production işlem talimatı olarak otomatik çalıştırılmaz.**

1. Staging/production deployment → Supabase project ref eşleşmesini yetkili deployment ortamından teyit et. Secret değerleri rapora/sohbete çıkarma. Production ve test projelerini ayrı tut.
2. Yetkili operatör [backend_reliability_readonly.sql](../supabase/checks/backend_reliability_readonly.sql) ile yalnızca metadata karşılaştırması yapsın; migration ledger sürümlerini ayrıca alsın. Özellikle mevcut uzak `orders` tablosunun FK/view/RPC bağımlılıklarını belirle. Kişisel kayıtları bu çalışma alanına taşıma.
3. Operatör mevcut Supabase backup/PITR kapsamını ve geri yükleme noktasını doğrulasın; şema/ACL/ledger snapshot'ını korumalı depoya alsın. Veri yedeği gerekiyorsa erişimi sınırlandırılmış, şifreli altyapıda tutulsun; repo/artifact içine kopyalanmasın. Restore tatbikatı olmadan “yedek var” yeterli değildir. RPO/RTO'yu bu tatbikatla ölç.
4. PostgreSQL **17** ve gerçek Supabase Auth/Storage ile ayrı hosted staging'de önce temiz kurulum, sonra PII içermeyen temsili eski şema/kayıtlardan yükseltme yap. Gerçek uzak `orders` uyumsuzluğu için veri/bağımlılık koruyan ayrı repair tasarımı ve test kanıtı gerekiyor. Bu rapordaki temiz kurulum, gerçek uzak drift'in çözüldüğü anlamına gelmez.
5. Yapısal migration'lar kayıtlı sürüm sırasıyla, her transactional dosya bütün olarak uygulanmalı. Index sürelerini ve kilitlerini staging'de ölç. Yeni migration atomiktir; hatada transaction geri alınır. Fail eden migration'ı ledger'a başarılı yazma.
6. Yeni finalize RPC sözleşmesi eski uygulama koduyla uyumlu değildir. Cutover sırasında ödeme/settlement işlerini durdur, sürmekteki dış çağrıları bitir/karantinaya al, DB+uygulama sürümünü koordineli geçir ve sonra aç. Rolling deployment sırasında eski worker'ın yeni claim sonrası eski finalize çağrısı belirsiz kayıt bırakabilir.
7. DB değişikliği commit edildikten sonra rollback için tabloları/drop kolonları silme. Öncelik yeni checkout/settlement'i durdurmak ve veriyi koruyan forward fix veya uyumlu uygulama sürümüdür. Eski uygulamayı yeni finalize sözleşmesiyle körlemesine çalıştırma. Backup restore gerekirse restore noktasından sonra processor'da gerçekleşen para hareketlerini ayrıca mutabakat et; DB restore para hareketini geri almaz.
8. Gerçek staging testleri: üç rol için Auth/RLS, Google PKCE+cookie+checkout taslağı, iki eşzamanlı rezervasyon, başarılı/başarısız/incelemede ödeme, çift callback, imzasız/bozuk webhook, geç ödeme, tam iade, payout approval, HTTP timeout ve DB yazı kesintisi. iyzico yalnızca sandbox test alt üye işyeri kullanılmalı. Müşteri giriş sonrası mevcut taslağı kullanır; fiyat ve müsaitlik yeniden SQL'den doğrulanır.

### Tekrar çalıştırma

```powershell
npm run audit:backend:readonly
npm run test:backend:migrations
npm run test:backend:migrations:upgrade
$env:COMMERCE_OUTPUT_DIR='artifacts/backend-reliability/clean'
node scripts/test-direct-commerce-db.mjs
$env:FUWU3_UPGRADE_TEST='true'
$env:COMMERCE_OUTPUT_DIR='artifacts/backend-reliability/upgrade'
node scripts/test-direct-commerce-db.mjs
Remove-Item Env:FUWU3_UPGRADE_TEST
npm run test:backend:reliability
$env:COMMERCE_OUTPUT_DIR='artifacts/backend-reliability/payment'
npx tsx scripts/test-direct-commerce-payment.ts
$env:AUTH_OUTPUT_DIR='artifacts/backend-reliability'
npx tsx scripts/test-fusion-auth.ts
npx tsc --noEmit
```

SQL runner'ları `artifacts/commerce-test-runtime/node_modules` altındaki mevcut `@embedded-postgres/windows-x64` ve `pg` paketlerini kullanır; proje env dosyalarını veya uzak DB URL'sini okumaz. `audit:backend:readonly` yalnızca anonim GET yapar; migration uygulamaz. Test çıktıları gerçek sandbox/OAuth sertifikası değildir.

### Açık BLOCKED maddeler

- Bağlı Supabase'in uyumsuz `orders` şeması, eksik commerce tabloları ve gerçek migration ledger karşılaştırması.
- Hosted staging temiz kurulum/yükseltme, PostgreSQL17 ve gerçek Supabase platform doğrulaması.
- Production deployment'ın hangi projeye bağlı olduğu ve yedek/restore tatbikatı.
- Gerçek Google OAuth oturumu, cookie persistence ve aynı tarayıcıda satın alma dönüşü.
- Gerçek iyzico sandbox checkout, callback/webhook, iade ve payout approval işlemleri; anahtar/test alt üye işyeri yok.
- Legacy checkout/refund için gerçek Auth ile tam HTTP uçtan uca senaryoları; mevcut kurgusal testler bunun yerine geçmez.

Başvuru kaynakları: iyzico [V3 webhook formülleri](https://docs.iyzico.com/en/advanced/webhook), [approve yanıtı](https://docs.iyzico.com/en/products/marketplace/marketplace-implementation/approval), [refund alanları](https://docs.iyzico.com/en/advanced/refund-and-cancel), Supabase [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow) ve [SSR oturum rehberi](https://supabase.com/docs/guides/auth/server-side/advanced-guide). Kütüphane varsayımları kurulu `@supabase/ssr` kaynaklarıyla da karşılaştırıldı.
