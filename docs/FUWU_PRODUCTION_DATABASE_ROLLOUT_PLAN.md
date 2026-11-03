# FUWU — Production Database Rollout Plan

**Karar: NO-GO.** Yerel hazırlık production yazma izni değildir. Production migration başlatılmadı. Ödemesiz ön lansman, doğrulanmış veri yedeği/restore, gerçek Google OAuth kabulü, ayrıca onaylı migration ve deployment tamamlanana kadar **BLOCKED**. Gerçek satış şirketleşme ve ödeme kuruluşu kabulü nedeniyle **BLOCKED**.

İlk şema denetimi **31 Ekim 2026**, son production metadata doğrulaması **1 Kasım 2026, 23:40 Europe/Istanbul (UTC+03)**. [Son salt okunur karşılaştırmada](../artifacts/production-rollout/production-final-readonly.json) şema/ACL/policy/RPC/index/trigger/bucket farkı yok; ledger 46, kategori 11, başvuru 10 ve audit 77 olarak kaldı. GitHub main yeniden `a9f1089fafb5cffa74bcf27ecd5fba2a1e6151ea` doğrulandı. Yerel düzeltmeler henüz push edilmedi. Nihai çalıştırma kanıtı ve kaynak hash'i [makine özeti](../artifacts/production-rollout/summary.json) ile eşleşmelidir.

Bu turda üretim hesabı, sahte müşteri, sipariş, ödeme, belge veya ücretli staging oluşturulmadı. Production test profilleri güncellenmedi/silinmedi. Push, merge, Vercel deployment ve canlı ödeme açılması yapılmadı.

## 1. Production şema denetimi

Hedef proje `bjhyisomjadirdchruix`, durum `ACTIVE_HEALTHY`, engine PostgreSQL **17.6.1.121**. Taze katalog SELECT'leri açık `BEGIN READ ONLY ... ROLLBACK` içinde çalıştırıldı. CLI salt okunur backup metadata, dry-run ve şema dump işlemlerini gerçekleştirdi; bağlantı sırasında CLI'nin “Initialising login role” adımı da loglandı. Uygulama verisine, ayarlara veya migration ledger'ına yazma yapılmadı.

| Envanter | Gözlem |
| --- | --- |
| Migration ledger | 46 kayıt; son sürüm `20260816000100`; repo 72; eksik 26; repo dışında ledger sürümü yok |
| Public tablolar | 20; tamamında RLS açık |
| Kolon / constraint / index | 244 / 124 / 124 |
| Politikalar | public 81, Storage 9 |
| Trigger | public 16, Auth 1, Storage platform 4 |
| Public RPC/trigger fonksiyonu | 16; definition, owner, ACL, SECURITY DEFINER, search_path incelendi |
| Roller | 31; üyelikler ve varsayılan ACL'ler dahil kaydedildi |
| Storage | 3 bucket; kimlik/mesleki belgeler private; iki görsel bucket'ı public |
| Değişmeden kalan toplamlar | 11 aktif kategori, 10 başvuru, dört manifest profili, 77 audit |

[Şema envanteri](../artifacts/production-rollout/production-schema-inventory.json) kolonları, türleri, varsayılanları, nullability, FK/check/unique tanımlarını, indexleri, trigger'ları, fonksiyon gövdelerini, RLS, tablo/kolon GRANT'larını, rol üyeliklerini, default ACL'leri ve bucket yapılandırmasını içerir. Kullanıcı satırları, dosya içerikleri, Storage obje adları, token veya kişisel audit payload'ı içermez.

Tam metadata ve dört profilin sahip/başvuru ilişkileri yalnız Git tarafından yok sayılan `artifacts/prelaunch/private/rollout-20261031/` altındadır. Bu klasör GitHub'a, CI artifact upload'ına veya public rapora eklenmemelidir.

### Nesne sınıflandırması

| Durum | Nesneler / değerlendirme |
| --- | --- |
| Mevcut ve korunacak | `profiles`, `provider_applications`, `service_categories`, `districts`, `service_requests`, `reviews`, `payments`, `audit_logs`, `rate_limits`, `notifications`, `provider_gallery_images`, `request_messages`; mevcut kolon/satırlar korunarak ek alanlar ve politikalar gelecek |
| Mevcut legacy finans grafiği | `orders`, `order_payments`, `payouts`, `disputes`, `webhook_events`; eski OID, para türleri, FK/check/unique/index ve satırlar korunacak |
| Mevcut fakat uyumsuz | `providers.iyzico_submerchant_status`: canlı default `none`, eski sözlük `none/pending/active/rejected`; bekleyen dosya yalnız modern sözlüğü kabul edip yükseltmeyi durduruyordu. Altı açık değer desteklendi; mevcut default/satırlar değiştirilmedi |
| Mevcut fakat güvenlik açısından uyumsuz | `order_payments` müşteri ve `payouts` usta RLS'si satır sınırı sağlıyor; table-wide SELECT işlem token/ham yanıt kolonlarını da açıyordu. Son bekleyen guard, browser SELECT'ini özet kolonlarla sınırlayacak |
| Ledger eksik, nesne zaten var | `app_settings` tablo/kolon/PK contract'ı mevcut. `request_reassignment_log` kolon, FK, reason check ve indexleri mevcut. Dosyalar yine uygulanacak; policy/grant/backfill adımları atlanmayacak, sahte `repair applied` yapılmayacak |
| Açık legacy ayrıntısı | Reassignment `reason` default'u `sla_breach`; mevcut check'in izin verdiği beş açık nedenden biri değil. Bu default korunur; uygulama açık reason gönderir. Gizli bir “şema eşitliği” iddiası yoktur |
| Eksik | 28 yeni tablo; aşağıdaki liste ve [şema karşılaştırması](../artifacts/security-testing/db-observed-production/schema-comparison.json) |
| Veri/uyumluluk riski | Constraint yenileme, legacy checkout/reassignment backfill'leri, yayın gate'inin devreye girmesi, finansal kolon erişiminin daralması; bakım penceresi ve son envanter gerektirir |
| Açık production onayı gereken | Bütün DDL/RLS/ACL/trigger/RPC değişiklikleri, dört profil kararı, ön kayıt flag'inin açılması, uygulama deployment'ı |

Eksik tablolar: `ai_conversations`, `ai_messages`, `ai_analyses`, `support_messages`, `service_catalog`, `service_variants`, `provider_service_offerings`, `provider_availability`, `provider_time_off`, `commerce_orders`, `payment_transactions`, `order_status_events`, `order_completion_codes`, `customer_addresses`, `customer_favorite_providers`, `operations_health_checks`, `review_submission_receipts`, `commerce_settlement_operations`, `provider_publication_reviews`, `launch_interest`, `launch_interest_consent_events`, `admin_provider_action_receipts`, `provider_document_types`, `provider_document_rules`, `provider_document_uploads`, `provider_document_versions`, `trust_safety_cases`, `order_scope_changes`.

Taze şema, önceki gözlenen şemanın tüm public kolon/tür/nullability/default ve constraint/fonksiyon tanımları ile index envanterini doğruladı. Buna rağmen önceki sentetik fixture'ın provider onboarding kolon/default/check'ini ve bazı ACL'leri modellemediği bulundu. Yeni fixture bunları ve production default GRANT'larını da temsil eder. Eski testlerin yeşil olması tek başına uyumluluk kanıtı sayılmadı.

## 2. Uygulanacak 26 migration ve sıra

**Her satır production'da PENDING'dir.** “Yerel doğrulandı” ifadesi production'da uygulanmış demek değildir. Sıra CLI dry-run ve ledger farkıyla doğrulanmıştır. İlk üç eski dosya, ledger'ın son sürümünden önce olduğu için `--include-all` gerekir.

| # | Dosya | Etkilenen nesneler ve özel inceleme |
| --- | --- | --- |
| 1 | `20260725000100_admin_management_layer.sql` | reviews, service_categories, districts, notifications; admin RLS/GRANT; katalog satırı değiştirmez |
| 2 | `20260726000100_app_settings.sql` | Mevcut app_settings; tablo var diye dosya atlanmaz; admin policy/grant tekrar kurulur |
| 3 | `20260804000100_ai_assistant_support.sql` | Dört eksik AI/support tablosu, owner/admin RLS, indexler ve ilgili private Storage policy'leri |
| 4 | `20260817000100_request_reassignment_log.sql` | Mevcut reassignment tablosu; yalnız dry-run reason backfill; son canlı okumada aday 0; check/index/RLS |
| 5 | `20260817000200_ai_assistant_openai_failure_audit_index.sql` | audit_logs partial index; kayıtları yeniden yazmaz |
| 6 | `20260818000100_iyzico_commission_escrow.sql` | providers, payments, service_requests, app_settings; eski none/pending korunacak; ödeme açılmaz |
| 7 | `20260819000100_repair_request_reassignment_log_schema.sql` | Reassignment metadata/is_dry_run, check/index/policy; mevcut FK hedefleri korunur |
| 8 | `20260824000100_deactivate_hali_yikama.sql` | Bilinçli `SELECT 1`; güncel 11 aktif kategoriyi korur; halı yıkama kapatılmaz |
| 9 | `20261021000100_direct_service_commerce.sql` | Katalog, varyant, teklif, takvim, time-off, commerce_orders, transaction/event/code; eski orders'a dokunmaz |
| 10 | `20261022000100_fusion_operations.sql` | customer_addresses, commerce finans/notification/audit RPC'leri; legacy payments'e additive alanlar |
| 11 | `20261022000200_fusion_quality_and_reviews.sql` | reviews kaynak ilişkileri/unique sınırı, provider koruma trigger'ı, rating ve finans RPC'leri; mevcut yorum silmez |
| 12 | `20261026000100_customer_favorites.sql` | customer_favorite_providers; müşteri sahipliği ve RLS |
| 13 | `20261026000200_phase3_operations.sql` | operations_health_checks, varyant/mağaza/finans RPC'leri; yeni commerce akışı |
| 14 | `20261026000300_provider_financial_privacy.sql` | Provider private alanlarının browser SELECT'ini sınırlar; owner/admin kontrollü RPC |
| 15 | `20261026000400_review_submission_receipts.sql` | review_submission_receipts ve yorum idempotency; geçmiş yorumları silmez |
| 16 | `20261028000100_phase2_checkout_consistency.sql` | Yeni ödeme initialization/callback tutarlılığı; gerçek tahsilat başlatmaz |
| 17 | `20261028000200_fuwu3_catalog_and_fees.sql` | Kategori sunum/fee kolonları, quote/consent/capacity; eski kategori flag'leri korunur |
| 18 | `20261029000100_backend_reliability.sql` | commerce_settlement_operations; belirsiz geçmiş settlement'lar MANUAL_REVIEW; legacy payment koruması |
| 19 | `20261029000200_atomic_rate_limit.sql` | rate_limits ve atomik consume RPC; browser reset yetkisi verilmez |
| 20 | `20261029000300_provider_publication_quality.sql` | provider_publication_reviews ve içerik fingerprint'i; yeni queue backfill; mevcut provider içeriği değiştirilmez |
| 21 | `20261030000100_prelaunch_trust_and_interest.sql` | provenance, launch_interest/consent_events, ön kayıt ve yayın RPC; kayıt flag'i varsayılan kapalı |
| 22 | `20261030000200_provider_control_center.sql` | admin_provider_action_receipts, version/fingerprint/idempotency/audit ve admin/partner RPC'leri |
| 23 | `20261030000300_partner_store_preparation.sql` | Teklif scope, partner profil/hizmet/belge hazırlığı; owner/admin sınırları |
| 24 | `20261030154616_marketplace3_operations_readiness.sql` | Health/snapshot/readiness/service/calendar RPC; mağaza yetkisi ve kalite kuyruğu |
| 25 | `20261030204829_trust_service_confirmation.sql` | Belge types/rules/uploads/versions, trust_safety_cases, scope_changes, private code hash; pgcrypto extensions ön koşulu |
| 26 | `20261031105613_critical_backend_contract_guard.sql` | Legacy/new FK ve support contract kontrolü; sabit search_path; gallery/capacity ACL; legacy processor kolonlarının daraltılması |

Dosya SHA-256'ları [rollout manifest'inde](../artifacts/production-rollout/rollout-manifest.json) sabitlenir. Yeni drift, yeni dosya veya hash farkında onay geçersiz sayılır ve plan yenilenir. Hiçbir eksik dosya “zaten vardır” gerekçesiyle otomatik başarılı işaretlenmez.

## 3. Bağımlılık, veri koruma ve iki sipariş mimarisi

`public.orders` eski request tabanlı finans sözleşmesidir: `request_id`, `amount numeric(10,2)`, commission/provider net ve eski status sözlüğü. `order_payments`, `payouts`, `disputes`, `webhook_events` bu tabloya bağlı kalır. Eski payout precondition trigger'ı da korunur.

`public.commerce_orders` yeni teklif/randevu sözleşmesidir: offering, time range, integer minor-unit tutarlar ve ayrı durum makinesi. `payment_transactions`, `order_status_events`, `order_completion_codes`, `commerce_settlement_operations` yalnız bu tabloyu referanslar. Yeni review ve trust ilişkileri de açık biçimde bu mimariyi kullanır.

Eski orders silinmez/yeniden adlandırılmaz; FK'ler yeni tabloya yönlendirilmez; TRY ondalık tutarlar kuruşa dönüştürülmez. Eskiden commerce biçiminde `orders.offering_id` bulunan başka bir ortamla karşılaşılırsa migration açık hata verir; boş ikinci mağazayla veri görünmez yapılmaz.

İzole provada relation OID'leri, özgün satırlar, ondalık tutarlar, FK/check/unique/index, eski audit, provider none/pending ve default'u, tüm legacy finans kolon türleri/nullability/default'ları korundu. Geçersiz payout ve FK'ye bağlı eski order silinmesi reddedildi. 11 aktif kategori korundu.

Yeni yayın kuyruğu tüm mevcut profilleri başlangıçta `pending_review/unclassified` yapar. Bu, eski provider active/approved/verified flag'lerini değiştirmez; buna rağmen yeni uygulamanın kamuya açık sonuçlarını daraltır. **Migration sonrası ayrı yayın incelemesi gerekir.**

Production'da eski order/payment/payout/dispute ve legacy payments toplamı son okumada 0; bu, gelecekte veri olmayacağına güvenme gerekçesi değildir. Migration öncesi yeniden sayım ve kontrollü yazma durdurma zorunludur.

## 4. Yedekleme, şema snapshot'ı ve restore kanıtı

CLI **2.115.0** sürümü ve `--help` ile db push/dump, migration list ve backups list bayrakları doğrulandı. CLI güncellenmedi; repo CI sürümü korundu.

`backups list` sonucunda **WALG=true, PITR=false, backups=[], physical_backup_data={}** geldi. Bu, geri yüklenebilir production veri yedeği kanıtı değildir. Kuruluşun ücretli planı/backup retention hakkı mevcut araç çıktısından doğrulanamadı; plan ve faturalama dashboard'unda ayrıca kanıtlanmalıdır. Hiçbir plan/PITR eklentisi satın alınmadı veya etkinleştirilmedi.

Public şema-only dump özel klasöre alındı: **117085 byte**, SHA-256 `1a77fbbbbf4988c802c513e7fbc24877726ce48948d9792c8b19fe8a3ef61ed7`. Dry-run, üretilen `pg_dump` komutunda `--schema-only` bayrağını doğruladı. Dump'ta public tablo verisine ait COPY/INSERT ifadeleri 0.

Otomatik onay denetimi ilk dump çağrısını veri dışa aktarımı endişesiyle reddetti. CLI dry-run'ında açık `--schema-only` kanıtı sağlandıktan sonra aynı şema-only işlem onaylandı ve tamamlandı. Veri dump'ı alınmadı.

Taze dump boş PostgreSQL 17'ye geri yüklendi. Tüm **244 kolon, 124 constraint, 124 index, 16 fonksiyon** metadata ile eşleşti. Public dump'ın içermediği `extensions.pgcrypto 1.3` ön koşulu ayrıca kuruldu. Auth/Storage platform DDL shim'i, gerçek custom Auth trigger'ı, Storage policy/bucket metadata'sı ve **yalnız sentetik** kayıtlar kullanılarak 26 pending migration ve 31 ek kontrol geçti. [Restore/yükseltme kanıtı](../artifacts/production-rollout/schema-rehearsal.json).

Bu kanıt **public şema restore'udur**. auth.users, müşteri/usta verisi, Storage içerikleri, tüm platform şemaları, özel rol parolaları veya production verisi restore edilmedi. Böyle bir restore yapılmış gibi GO verilemez.

Canlı geçişten önce tamamlanacak güvenli yedek paketi:

1. Yetkili operasyon sahibinin erişimi kontrollü, şifreli tam DB yedeği; public ile birlikte Auth ve gereken platform verileri; anlık ledger ve roller/üyelikler/ACL/policy/function/trigger snapshot'ı.
2. DB yedeğinden bağımsız Storage obje içerikleri, obje metadata'sı, bucket/policy ve içerik hash manifest'i. DB backup tek başına dosyaları geri getirmez.
3. OAuth redirect/provider, SMTP ve uygulama env/feature-flag ayarlarının sırları ifşa etmeyen, erişimi kısıtlı envanteri.
4. Backup ID, timestamp, checksum, şifreleme anahtarı sorumlusu, saklama süresi ve restore runbook'u.
5. Onaylı izole restore tatbikatı; tablo/anahtar/FK sayımları, kritik kayıt eşleşmesi, Auth oturum yaklaşımı, Storage byte/hash doğrulaması ve RLS/ACL kabulü. Production verisini public repo/test raporlarına veya bu sentetik CI'a kopyalama.
6. Ölçülmüş RTO, kabul edilen RPO ve olası kayıp aralığının sahibi tarafından kabulü.

**Tam veri yedeğinin restore'u kanıtlanmadan production migration onayı işleme alınmaz.**

Resmî dayanak: [Supabase backup kapsamı](https://supabase.com/docs/guides/platform/backups), [CLI dump varsayılanı ve kapsamı](https://supabase.com/docs/reference/cli/supabase-db-dump), [backup/restore adımları](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).

## 5. Migration uygulama prosedürü — henüz çalıştırılmadı

1. Yedek/restore ve gerçek OAuth kapılarını kapat; uygulama commit'i ve dosya hash manifest'ini sabitle; production migration için ayrıca açık onay al. Push/deploy onayını bundan ayrı tut.
2. Bakım penceresi ve sorumlu kişi belirle. Yeni başvuru, belge, admin, müşteri consent ve sipariş yazmalarını kontrollü durdur. Checkout kapalı kalmalı. Aktif transaction/lock ve bağlantıları incele.
3. O ana ait ledger, tam metadata, sayımlar, kategori kararları, provider state, app_settings ve Storage envanterini özel alanda yeniden al. Herhangi bir farkta dur; eski snapshot üstüne işlem yapma.
4. CLI 2.115.0 veya ayrıca doğrulanmış sürümde `db push --dry-run --include-all --skip-vault --project-ref bjhyisomjadirdchruix` çalıştır. **Tam 26 onaylı dosya** ve hash listesi eşleşmeli. Seed, role import ve config push ekleme. `--skip-vault`, CLI'nin migration öncesi Vault config yazmasını önler.
5. Onaylı uygulama komutu aynı planın dry-run kaldırılmış halidir; yalnız bu adım production yazmasıdır ve bu görevde çalıştırılmadı. Transaction/ledger atomikliğini kullanılan CLI/runner sürümünde doğrula. İncelenen transaction sınırlarını koru; bir hatadan sonra otomatik devam etme.
6. Her dosya sonrası başarılı ledger kaydı, yeni nesne ve süre/lock gözlemini kaydet. Ledger'ı elle başarılı gösterme; eksik dosyayı atlama veya `migration repair --status applied` ile gizleme.
7. Backend health, yeni RLS/GRANT/RPC, eski/yeni FK grafikleri, eski satır ve kolon contract'ları, 11 kategori, uygulama/Storage kabulünü doğrula.
8. Yalnız ayrıca onaylı uyumlu uygulama deployment'ını yap. Ön kayıt feature flag'i başlangıçta kapalıdır; ayrı kabul sonrası açık ve audit'li admin işlemiyle açılır. Ödeme flag'leri kapalı kalır.

## 6. Durdurma ve kısmi başarısızlıktan kurtarma

Şunlardan birinde derhal dur: beklenmeyen ledger/hash/nesne/satır farkı, bilinmeyen status/tür, FK veya unique hatası, schema contract guard hatası, audit INSERT hatası, lock/statement timeout, yetkisiz erişim, Storage gizlilik hatası, veri/kategori/provider kaybı veya beklenmeyen ödeme aktivasyonu.

Başarısız transaction'ın rollback'ini ve ledger'a eklenmediğini doğrula. Önceki başarılı dosyalar commit edilmiş olabilir; “bütün geçiş geri alındı” varsayma. Trafiği yazmaya açma. Özel alanda error code, dosya/hash, ledger ve schema diff'i al; sır/PII loglama.

Kısmi durumda yeni plan olmadan kalan dosyaları çalıştırma. O anki şemayı izole ortama metadata olarak al, sentetik kayıtlarla aynı başarısızlığı üret, düzeltmeyi doğrula ve ek production onayıyla forward-fix uygula. Transaction dışı kısmi nesne oluşmuşsa bunu `IF NOT EXISTS` ile gizleme veya başarılı ledger yazma.

## 7. Rollback / forward-fix stratejisi

DDL-only ve veri kaybı yaratmayan uyumlu düzeltmeler için gözden geçirilmiş forward-fix tercih edilir. Yeni commerce/trust/consent kaydı oluştuysa ters migration ile tablo silme/TRUNCATE yapılmaz. `DROP TABLE CASCADE` kullanılmaz.

Kod rollback'i DB rollback'i değildir. Eski uygulama sürümlerinden bazıları commerce için `orders` beklediğinden kör deployment rollback'i güvenli sayılmaz. Gerçek schema contract'ına uygun sürüm seçilir ve salt okunur kontrollerden geçirilir.

ACL rollback'i hassas token/ham yanıtı tekrar browser'a açmamalıdır. Eski browser SELECT * kullanan bir consumer varsa owner-scoped/server-side güvenli sorguya forward-fix yapılır. Repo kaynak taramasında legacy order_payments/payouts için böyle bir ürün sorgusu bulunmadı; yeni summary erişimi ve service-role evidence erişimi ayrı test edildi.

Tam DB restore yalnız ayrıca açık onay, doğrulanmış yedek, RPO/RTO, kesinti penceresi ve restore sonrası kayıt uzlaştırmasıyla mümkündür. Yeni kayıtlar varsa kayıp aralığı açıkça kabul edilmeden restore yapılmaz. Storage restore ve metadata tutarlılığı ayrı doğrulanır.

## 8. Güvenlik değerlendirmesi

| Alan | Doğrulama / açık durum |
| --- | --- |
| PKCE ve session | Kurulu @supabase/ssr browser/server client'ı `flowType: pkce`, persistSession=true; SSR callback code exchange ve `getUser` doğrulaması kullanır |
| Callback/redirect | Safe internal next path; protocol-relative, backslash/control-character ve encoded saldırı sınırları test edildi; yanıt private/no-store |
| Cookie | SameSite=Lax; HTTPS'te Secure; SSR cookie yenileme ve kalıcı oturum yerel gerçek Auth ile test edildi |
| Yetkilendirme | Müşteri/usta/admin profili server-side doğrulanır; user_metadata admin yükseltmesi reddedilir; yabancı provider düzenlemesi reddedilir |
| CSRF/XSS/rate limit | Same-origin/body-size sınırları, CSP nonce, unsafe redirect regresyonları; kalıcı atomik limiter ve concurrency testleri |
| Service role | Browser'da çalışma engeli; public env anahtarı değildir; server auth/ownership sonrasında kontrollü kullanım; test ortamı production ref/key claim'ini reddeder |
| Private Storage | Belge bucket'ı private, 5 MiB, PDF/JPEG/PNG; server byte kontrolü ve owner/admin signed erişim; yabancı/anon ve doğrudan upload reddi |
| SECURITY DEFINER | Yetkili actor/owner/admin kontrolü, sabit search_path ve açık EXECUTE sınırları; trigger/internal RPC'ler browser'a açılmaz |
| Production advisor | Üç mutable search_path, 9 anon ve 11 authenticated definer bulgusu; hepsi tek başına exploit değildir, gövde/rol kullanımına göre incelendi |
| Planlanan advisor düzeltmesi | Son guard üç helper search_path'ini sabitler ve check_gallery_limit EXECUTE'ını kapatır; son şema provasında mutable public path 0 |
| Legacy finansal gizlilik | Yeni regression müşteri token/ham yanıt açığını tekrar üretti; dar tablo+kolon REVOKE ve summary GRANT ile kapandı; service_role erişimi korundu |
| Audit | Kritik yeni control/trust kararları receipt ve audit ile aynı transaction'da; outage rollback testli. Legacy başvuru action'larının tüm alt yazmaları tek transaction'a çevrilmiş gibi sunulmaz |
| Auth password advisor | Leaked-password protection kapalı; ayrı Auth ayarı incelemesi gerekir. Mevcut ana akış Google/magic-link; parola akışı için kabul ayrıca yapılmalı |
| npm audit | 24 moderate; high=0, critical=0. Sıfır zafiyet iddiası yok |
| Performance advisor | 4 unindexed FK, 42 auth initplan, 71 unused index, 29 multiple-policy, 1 duplicate-index bulgusu; bu görevde mevcut indexler silinmedi |

Public tablolarda gerçek production default ACL'leri anon/authenticated için geniştir. RLS ile SELECT/UPDATE ayrı katmanlardır; bu nedenle yeni fixture bu default'ları da uygular. Yeni gizlilik düzeltmesinde table-wide SELECT yanında bağımsız kolon SELECT grant'ları da geri alınır. Yetki hatası çözmek için yeni blanket GRANT eklenmedi.

Belge malware tarayıcısı bağlı değildir; durum `unavailable` gösterilir. “Tarandı/temiz” kanıtı olarak sunulmaz. Kimlik/belge doğrulama ve yayın kalitesi birbirinden ayrıdır.

Kaynaklar: [Kolon izinleri ve table SELECT önceliği](https://supabase.com/docs/guides/database/postgres/column-level-security), [mutable search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [definer EXECUTE incelemesi](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).

## 9. Admin, Partner ve müşteri kabulü

Nihai [yerel Supabase raporu](../artifacts/critical-backend-repair/local-supabase/result.json), tek/iki worker JSON'ları ve SQL kabulü birlikte değerlendirilir. Test verilerinin tamamı sentetiktir.

| Rol | Kapsanan kabul |
| --- | --- |
| Admin | Başvuru listeleme/onay/ret, account activation/approval, unpublish, verify/unverify, belge inceleme, kalite kararı, test/real sınıflandırma, receipt/audit, kategori ve kapasite/bölge yetkileri |
| Başarı mesajları | Control RPC sonucu commit, version ve publication state yeniden okunmadan başarı kabul edilmez; conflict ve audit outage hata verir; legacy action'larda persisted DB/audit/UI sonucu ayrı doğrulanır |
| Partner | Gerçek yerel Auth oturumu, mağaza fiyat/scope/hizmet/bölge/takvim/kapasite, private belge, başvuru ve yayın durumu; başka provider üzerinde mutation reddi |
| Müşteri | 11 aktif kategori, arama/filtre/link devamlılığı, public profil kapısı, verified email + sürümlü consent, duplicate idempotency, admin aggregate ve consent withdrawal |
| FUWU Güvence | Atanmış provider, tek kullanımlık süreli kapı kodu, yanlış deneme limiti, concurrent consume, provider tamamlandı bildirimi ve yalnız müşteri açık completion onayı |
| Audit/transaction | Yarışlarda tek karar/receipt, hatada rollback, rol/ownership ihlali ve çapraz hesap erişimi reddi |

Google hesabıyla dış servis callback'i bu yerel Auth testlerinin kapsamına dahil değildir. Yeni production tabloları olmadığı için bu özellikler production'da PASS sayılmaz. Checkout'un kapalı kalması ve HTTP 503 davranışı test edildi; sentetik PAID order gerçek tahsilat kanıtı değildir.

## 10. Dört deneme profili — ayrı açık onay gerekir

Yetkili ID kaynağı [mevcut manifest](prelaunch-confirmed-test-providers.json). İsim/telefon benzerliği sınıflandırma kanıtı değildir. Sahip kullanıcı, bağlı başvuru, profile/Auth varlığı, dokuz incoming FK, ödeme/request, private belge ve provider/owner audit ilişkileri salt okunur incelendi; tam ID ilişkileri private envanterdedir.

| Provider ID | Mevcut hesap / başvuru | Diğer bağımlılıklar |
| --- | --- | --- |
| `4d0d8f4a-692e-4792-9fa6-5877ba76c55f` | Sahibi ve onaylı başvurusu var; active/approved=true | Mevcut provider audit'i korunur; finans/request/private belge yok |
| `78bc496a-7f93-43fb-8748-33b5d6cde252` | Sahipsiz; başvuru yok; active/approved=true | Mevcut provider audit'i korunur; finans/request/private belge yok |
| `8a0fd4ad-4b34-4089-8737-3cebc64e4295` | Sahibi ve onaylı başvurusu var; active/approved=true | Mevcut provider audit'i korunur; finans/request/private belge yok |
| `ec711057-c9a3-4a03-9737-4f560e3c39cb` | Sahipsiz; başvuru yok; active/approved=true | Finans/request/private belge yok; kayıt silinmez |

İlk üçünde mevcut is_verified=true, dördüncüde false. phone_verified/identity_verified hepsinde false. Bu bayraklar toplu değiştirilmeyecek. Mevcut uygulamanın bu dört açık ID'yi public sonuçlardan çıkaran koruması korunur.

**Önce / beklenen sonra:**

- Bugün publication review tablosu yok; dört provider satırı ve tüm bağlı kayıtlar aynıdır.
- Onaylı migration sonrası başlangıç: `pending_review/unclassified`; eski provider flag'leri ve sahipliği aynıdır.
- Ayrı profil operasyonu onayından sonra admin oturumuyla her ID'ye `mark_test`, ardından taze version/fingerprint ve ayrı request_id ile `unpublish`: `hidden/test`. Sekiz yeni control audit/receipt beklenir. Kullanıcı, başvuru, belge, para ve eski audit silinmez/değiştirilmez.
- 409/version conflict, farklı insan kararı, yeni ilişki veya audit hatasında dur. Retry aynı request_id/payload ile yapılır.
- Geri alma: snapshot hâlâ bu başlangıcı gösteriyorsa taze version/fingerprint ve ayrı request_id ile `admin_provider_action` çağrısında `p_action='pending_review'`, `p_record_kind='unclassified'` ve açık geri alma gerekçesi kullanılır. İnceleme/sınıflandırma başlangıcına dönülür; yeni audit/receipt eklenir, eskiler silinmez. Provider flag'leri aynı kalır ve public yayın açılmaz. Farklı snapshot ayrı plan ister.

**Bu dört kaydı test olarak sınıflandırıp yayından kaldırmak için ayrıca açık onay istenir. Migration onayı bu onayı kapsamaz. Şu anda hiçbir profil işlemi uygulanmadı.**

## 11. Test kanıtı ve açık dış servis kapıları

[Makine özeti](../artifacts/production-rollout/summary.json) final sourceHash, her suite'in gerçek yürütme zamanı, fail/skip ve kaynak eşleşmesini denetler. Eski başarısız/teşhis koşuları final PASS yerine kullanılmaz.

| Kontrol | Nihai kanıt |
| --- | --- |
| ESLint / TypeScript / production build | İlgili güncel *-result.json; kaynak eşleşmesi zorunlu |
| Unit / coverage | 157 unit; seçili çekirdek dosyaların coverage'ı; bütün uygulama coverage'ı iddiası yok |
| Security | 59 Vitest testi + dependency gate; 24 moderate, 0 high/critical |
| PostgreSQL 17 | 340 kontrol; clean, populated, commerce clean/upgrade, ledger replay, observed-production olmak üzere 6 senaryo |
| Taze production şema restore'u | 26 pending dosya, 31 kontrol; gerçek public DDL/default ACL + sentetik veri |
| Fault injection / HTTP | 77 offline protocol/failure kontrolü; 20 gerçek localhost production HTTP guard |
| Gerçek yerel Supabase/Playwright | Tam 39 test; workers=1 sonra workers=2; retry/skip/flaky/error 0 şartı |
| Responsive / axe | Gerçek E2E içindeki responsive/erişilebilirlik testi; fiziksel cihaz/ekran okuyucu kanıtı değildir |

GitHub güncel başlangıç commit'inin [backend CI'ı](https://github.com/melikezana/fuwu/actions/runs/41226934515) ve [Launch verification](https://github.com/melikezana/fuwu/actions/runs/41226934514) başarılı. Logda 157 unit, 59 security, eski 338 integration ve tek/iki worker 39/39 doğrulandı. **Yerel yeni düzeltmeler için hosted CI henüz çalışmadı; bunlara eski CI sonucu atfedilmez.** Push ve yeni CI ayrı onay sonrası yapılır.

| Kapı | Durum |
| --- | --- |
| Gerçek Google OAuth dönüşü | **BLOCKED**; production GET /auth/v1/settings 200 ve google_enabled=true, fakat gerçek Google → callback → refresh/rol kabulü yapılmadı |
| Production tam veri backup/restore | **BLOCKED**; PITR kapalı, backup listesi boş; şema-only restore bunun yerine geçmez |
| Production migration/deployment | **BLOCKED**; ayrı onay bekliyor; yeni tablolar canlıda yok |
| Dış SMS teslimi | **BLOCKED**; sentetik confirmed phone gerçek SMS teslimi kanıtı değil |
| Malware tarayıcısı | **BLOCKED**; bağlı servis yok, unavailable |
| Gerçek iyzico sandbox ve canlı satış | **BLOCKED**; şirketleşme/sağlayıcı kabulü ve ayrı izin; gerçek ödeme açılmayacak |
| Ücretli staging | Oluşturulmadı; yerel izole Supabase ve mevcut Actions kullanıldı |

## 12. Somut production değişiklik listesi ve kullanıcı etkisi

Onay verilirse yukarıdaki 26 dosya; 28 yeni public tablo ve private yardımcı şema; mevcut provider/review/payment/category kolonları; explicit constraint/index/trigger/RPC/RLS/ACL değişiklikleri uygulanır. Ayrı bir feature rewrite veya tasarım değişikliği yoktur.

Bu turda değiştirilen iki **henüz production'da uygulanmamış** migration:

- `20260818000100`: eski none/pending durumları ve default'u korunarak modern durumlarla birlikte açık check contract'ı; schema type/nullability guard.
- `20261031105613`: eski payment/payout processor token/ham yanıt/diagnostic alanları browser SELECT'inden çıkarılır; summary ve service-role erişimi korunur.

Uygulama type/UI etiketleri none/pending'i tanır; yalnız `active` ödeme uygunluğu sağlar. Legacy fixture gerçek onboarding kolonları, durumları, default ACL ve sensitive SELECT grants ile güçlendirildi. Production veri satırlarına yönelik bir düzeltme UPDATE'i eklenmedi.

Paralel E2E'nin yakaladığı hızlı admin işlem seçimi sorunu da düzeltildi: onay penceresi native select'teki güncel işlemden açılır; gecikmiş React state'i eski bir kararı seçmez. Mevcut yedi kararlı kabul matrisi, gönderimden önce pencere başlığını da denetler. Tasarım ve yetki sınırları korunur.

Partner takvim/bölge alanlarında checkbox ve saat değerleri, ertelenen state updater içinde DOM'dan yeniden okunuyordu. Değerler artık olay anında yakalanır. Gerçek Supabase kabulü haftalık günü aç/kapat/aç, saat değişimi ve veritabanında kalıcılığı kapsar.

Windows'ta daha önce üretilmiş kanıt dosyasını açarken görülen UNKNOWN I/O hataları ayrıca ele alındı: check sonucu ve schema comparison önce benzersiz geçici dosyaya yazılıp atomik adlandırılır. Responsive PNG/JSON'ları artık stack ve worker'a özel dizindedir; güncel yol Supabase raporunun `runs[].artifactDirectory` alanındadır. Hatalı/eksik yazım hâlâ koşuyu başarısız yapar. Hata veren önceki koşular PASS kanıtına dönüştürülmez.

Beklenen etki: Migration sırasında ALTER/constraint/index işlemleri kilit alabilir; **sıfır kesinti garantisi verilmez**. Son hacimler küçük olsa da süre ölçülmeden kesin dakika söylenmez. Onaylı bakım penceresinde yazmalar durdurulur; izole prova süresi bir production SLA değildir.

Migration+uyumlu deployment sonrasında mevcut ustalar yayın incelemesine girer; yeni başvuru veya belge onayı otomatik yayın değildir. Ön kayıt başlangıçta kapalı kalır. Finansal geçmişin müşteri/usta özet alanları okunabilir, token/ham cevap alanları sadece yetkili server süreçlerinde kalır. Gerçek ödeme açılmayacak; production checkout feature flag ve env kabulü deployment öncesi ayrıca doğrulanmalıdır.

## 13. Kesin GO / NO-GO ve onay noktası

| Aşama | Karar | Kapanması gereken kapı |
| --- | --- | --- |
| Yerel backend hazırlığı | Nihai suite/summary PASS şartıyla hazır | Güncel kaynak kanıtları ve inceleme |
| A — Ödemesiz ön lansman | **NO-GO / BLOCKED** | Geri yüklenebilir tam backup; gerçek Google OAuth; ayrıca onaylı migration, deployment ve production kabulü; kontrollü interest flag |
| B — Gerçek satış | **NO-GO / BLOCKED** | Şirketleşme, ödeme kuruluşu, gerçek sandbox/production finans kabulü ve ayrı açık onay |

Production migration'ın bugün başlatılması önerilmez. Yedek/restore ve OAuth kanıtları gelince plan güncellenmeli; migration öncesi son envanter alınmalı ve **bu 26 dosya/hash, etkilenen nesneler, bakım penceresi, kullanıcı etkisi ve recovery planı için açık onay** istenmelidir.

Ayrı onaylar: **(1)** production migration, **(2)** dört test profilinin hidden/test işlemi, **(3)** git push / olası merge, **(4)** Vercel deployment ve feature flag açılması, **(5)** gelecekte gerçek ödeme. Biri diğerinin izni değildir. Bu rapor herhangi birini otomatik yetkilendirmez.
