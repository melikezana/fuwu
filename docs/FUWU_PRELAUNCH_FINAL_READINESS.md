# FUWU — Prelaunch Final Readiness

Tarih: **31 Ekim 2026 · Europe/Istanbul**. Proje: `melikezana/fuwu`.

**Nihai yayın kararı: FAIL / NO-GO.** Yerel uygulama ve SQL regresyonları geçiyor; mevcut production şemasından güvenli geçiş ve gerçek Supabase E2E kabulü tamamlanmadı. Şirketleşmeden sonra yalnızca yasal/ödeme aktivasyonunun kalmış olduğu söylenemez.

`PASS` yalnızca yanında belirtilen kapsamda doğrulanmış sonucu, `FAIL` gözlenen hatayı, `BLOCKED` ise yürütülemeyen veya dış koşula bağlı kabulü belirtir. Fixture UI, mock protokol, gerçek PostgreSQL ve gerçek Supabase Auth/Storage sonuçları ayrı değerlendirilir.

Makine tarafından okunabilir nihai özet: [summary.json](../artifacts/final-readiness/summary.json).

Production yalnızca SELECT/anonim GET ile incelendi. Production migration, UPDATE/DELETE, canlı ödeme aktivasyonu, Git commit/push ve Vercel deployment yapılmadı. Onaylanan $0 staging oluşturma denemesi Supabase kotasında reddedildi; proje oluşmadı. Production kişisel verileri, belgeleri veya anahtarları staging'e taşınmadı.

## 1. Gerçek backend durumu

| Kontrol | Durum | Gözlem |
| --- | --- | --- |
| Production projesi | PASS | `fuwu`, ref `bjhyisomjadirdchruix`, `ACTIVE_HEALTHY`, `ap-southeast-1`, PostgreSQL 17.6 |
| Gerçek migration ledger'ı | PASS | 46 kayıt; son sürüm `20260816000100` |
| Public şema RLS envanteri | PASS | Gözlenen 20 public tabloda RLS açık. Bu, bütün politikaların dinamik kabulü değildir. |
| Aktif kategoriler | PASS | 11 gerçek aktif kategori |
| Başvurular | PASS | 10 kayıt; içerik/telefon/ad rapora kopyalanmadı |
| Usta envanteri | PASS | Dört mevcut ID, sahiplik/FK/audit sayıları salt okunur doğrulandı |
| Commerce / yayın / yeni belge / Güvence altyapısı | FAIL | İlgili tablolar ve RPC'ler production'da eksik |
| Gerçek müşteri ön kayıtları | BLOCKED | `launch_interest` ve izin olayları production'da yok; kayıt alma/izin çekme hosted kabulü yok |
| Canlı ödeme güvenlik sınırı | PASS | Varsayılan checkout kapalı; canlı iyzico host kısıtı korundu. Canlı işlem yapılmadı. |

Son salt okunur doğrulamada 46 migration, 10 başvuru, aynı dört provider ID, 11 aktif kategori ve **0 özel doğrulama belgesi nesnesi** görüldü. Eski `orders`, `order_payments`, `payouts`, `webhook_events` tablolarının her birinde 0 satır var. Boş olmaları, tabloyu kaldırmak veya sözleşmesini değiştirmek için onay sayılmadı.

Kanıtlar: [metadata](../artifacts/final-readiness/production-metadata.json), [ID/FK/Storage envanteri](../artifacts/final-readiness/production-readonly.json), [son okuma](../artifacts/final-readiness/production-after-readonly.json), [anonim API ve Google ayarları](../artifacts/backend-reliability/external-readonly.json).

## 2. Supabase migration farklılıkları

**FAIL — repoda 71, production'da 46 migration; 25 eksik kayıt var.** Bunların üçü production son sürümünden daha eski. Sadece en son migration'ı uygulamak yeterli değil.

Eksik zincir, dosya sırasıyla:

```text
20260725000100_admin_management_layer.sql
20260726000100_app_settings.sql
20260804000100_ai_assistant_support.sql
20260817000100_request_reassignment_log.sql
20260817000200_ai_assistant_openai_failure_audit_index.sql
20260818000100_iyzico_commission_escrow.sql
20260819000100_repair_request_reassignment_log_schema.sql
20260824000100_deactivate_hali_yikama.sql
20261021000100_direct_service_commerce.sql
20261022000100_fusion_operations.sql
20261022000200_fusion_quality_and_reviews.sql
20261026000100_customer_favorites.sql
20261026000200_phase3_operations.sql
20261026000300_provider_financial_privacy.sql
20261026000400_review_submission_receipts.sql
20261028000100_phase2_checkout_consistency.sql
20261028000200_fuwu3_catalog_and_fees.sql
20261029000100_backend_reliability.sql
20261029000200_atomic_rate_limit.sql
20261029000300_provider_publication_quality.sql
20261030000100_prelaunch_trust_and_interest.sql
20261030000200_provider_control_center.sql
20261030000300_partner_store_preparation.sql
20261030154616_marketplace3_operations_readiness.sql
20261030204829_trust_service_confirmation.sql
```

**P0: mevcut `orders` tablosu yeni commerce sözleşmesiyle çakışıyor.** Production tablosu `request_id`, `amount`, `commission_amount`, `provider_net_amount` ve eski durumları içeriyor. `20261021000100` ise aynı isimle `offering_id`, randevu saatleri, integer kuruş ve farklı durumları olan yeni tabloyu oluşturuyor. Yalnızca `IF NOT EXISTS` eklemek de gerekli kolonları/durum sözleşmesini sağlamaz.

Gözlenen kolonlar izole PostgreSQL'de yeniden oluşturulup eksik zincir çalıştırılınca gerçek **`42P07: relation "orders" already exists`** hatası tekrarlandı. Bu test yalnızca eski orders kolonlarını ekler; bütün production şemasının kopyası veya hosted staging değildir.

Önceki `--production-upgrade` kontrolü, 46 kayıtlı dosyayı yeniden oynatıyordu; ledger dışındaki bu şemayı içermiyordu. Çalıştırıcının kapsamı `production_ledger_replay_only` olarak düzeltildi. Bu koşunun PASS olması production yükseltmesinin PASS olduğu anlamına gelmez.

`app_settings` ve `request_reassignment_log` da eksik ledger kayıtlarına rağmen production'da mevcut; koşullu CREATE semantik eşdeğerlik kanıtı değildir. `20260824000100` Halı Yıkama kategorisini kapatır; iş niyeti ve mevcut kategori verileri ayrıca uzlaştırılmalı.

Eksikler arasında `service_catalog`, `service_variants`, `provider_publication_reviews`, `provider_document_{types,rules,uploads,versions}`, `order_completion_codes`, `trust_safety_cases`, `order_scope_changes`, `launch_interest` ve `admin_provider_action_receipts` bulunuyor. `admin_control_snapshot`, `admin_provider_action`, `trust_admin_queue`, `provider_publication_gate`, `consume_user_rate_limit` mevcut değil.

Yeni `npm run audit:migrations:readonly` hiçbir env/credential/network kullanmadan metadata ile pending CREATE çakışmasını yakalar ve `canApply:false` döndürür. Bu, otomatik SQL uygulayıcı değildir; dinamik SQL ve tam bağımlılık analizi ayrıca gerekir.

Kanıtlar: [plan](../artifacts/final-readiness/migration-plan.json), [gerçek SQL hata tekrarı](../artifacts/final-readiness/production-overlay/migration-production-upgrade.json), [ledger replay](../artifacts/final-readiness/ledger-replay/migration-production-upgrade.json), [şema farkları](../artifacts/security-testing/schema-comparison.json). Son dosyanın production karşılaştırma girdisi önceki metadata kaydıdır; güncel çakışmanın asıl kanıtı bu oturumun `production-metadata.json` dosyasıdır.

## 3. Düzeltilen kritik hatalar

| Düzeltme | Durum | Doğrulama |
| --- | --- | --- |
| Yanıltıcı production-upgrade kapsamı | PASS | Ledger replay adı/sınırı açık; gözlenen orders overlay ayrı FAIL kanıtı |
| Kör migration riskinin otomatik tespiti | PASS | Beş birim testi; gerçek metadata üzerinde çakışma yakalanıyor |
| Dört onaylı test profilinin app görünürlüğü | PASS | Ortak public liste/profil/commerce filtresi bu ID'leri yanlışlıkla `real` gelse bile reddeder |
| Belge yükleme hatasında alan kaybı | PASS | Dosya, tür ve tarih hata sonrası korunuyor; yalnızca başarıda reset |
| Profil açıklamasının hata sonrası sıfırlanması | PASS | Ad/açıklama kontrollü taslak alanları oldu |
| Hydration öncesi istemci formu gönderimi | PASS | Belge/inceleme alanları JS hazır olana kadar kapalı; POST form yöntemi korundu |
| Belge tarihinin yüklemeden sonra doğrulanması | PASS | Geçersiz/taşan tarih, Storage çağrısından önce reddediliyor |
| Admin belge kararında teyit eksikliği | PASS | Gerekçe ve karar ayrı onay penceresinde; çift gönderim kilidi var |
| Belge durum dilinin açıklığı | PASS | Yüklenmedi / İncelemede / Onaylandı / Düzeltme Gerekli; yükleme onay sayılmıyor |
| Admin öncelik bağlantıları | PASS | Aktif kategori metriği ve belge inceleme kuyruğu bağlantısı eklendi; bilinmeyen sayı sıfıra çevrilmez |
| Katalog fotoğraf seçeneklerinde duplicate React key | PASS | Aynı fotoğraf yolu tek seçeneğe indirildi; fotoğraflar korunuyor |
| CI'da atlanan kabul testlerinin yeşil görünmesi | PASS | JSON raporu korunuyor; eksik/skip içeren prelaunch kabulü PASS olamaz |

## 4. Test ve demo usta kayıtlarının durumu

Kullanıcı bu istekte mevcut dört profilin test amaçlı oluşturulduğunu doğruladı. Ad veya telefon tahmini kullanılmadı. Açık ID manifest'i: [prelaunch-confirmed-test-providers.json](prelaunch-confirmed-test-providers.json).

| Provider ID | Sahip | Başvuru | Provider audit | Production gizleme |
| --- | --- | --- | --- | --- |
| `4d0d8f4a-692e-4792-9fa6-5877ba76c55f` | Var | 1 | 1 | BLOCKED — yazma onayı/şema geçişi yok |
| `78bc496a-7f93-43fb-8748-33b5d6cde252` | Yok | 0 | 1 | BLOCKED — yazma onayı/şema geçişi yok |
| `8a0fd4ad-4b34-4089-8737-3cebc64e4295` | Var | 1 | 2 | BLOCKED — yazma onayı/şema geçişi yok |
| `ec711057-c9a3-4a03-9737-4f560e3c39cb` | Yok | 0 | 0 | BLOCKED — yazma onayı/şema geçişi yok |

**PASS — yerel public koruma hazır. BLOCKED — production'da kaldırıldılar/gizlendiler denemez.** Dört kayıt production'da aktif/onaylı kalıyor; anonim DB görünürlüğü ve deployment değiştirilmedi. Hesaplar, belgeler, başvurular, yorumlar ve audit silinmedi.

Sorgulanan service request/review/order/payout/gallery/reassignment ilişkileri bu ID'ler için sıfırdı. Gelen FK envanteri ayrıca saklandı; profil sahibine bağlı diğer kullanıcı verileri silme kapsamına alınmadı.

Geri alınabilir operasyon planı: staging şeması ve admin kabulü → taze ID/FK/envanter → provider ve yayın incelemesi snapshot yedeği → kullanıcının production UPDATE onayı → gerekçeli `mark_test`/`unpublish` → ayrı transaction sonrası durum okuması, audit ve anonim liste/doğrudan profil/offer/slot kontrolü. Geri dönüş gerekiyorsa güncel sürüm ve önceki snapshot incelenerek gerekçeli admin kararı verilir; otomatik yeniden yayın veya hesap silme yapılmaz. Önceki temizlik aracı varsayılan envanter/ROLLBACK planı olarak korundu; burada çalıştırılmadı.

## 5. Usta başvuru deneyimi

| Kabul | Durum | Kapsam |
| --- | --- | --- |
| İlk adım dört bilgi | PASS | Ad soyad, doğrulanacak telefon, kategori, ilçe; ilk aşamada dosya/deneyim/fotoğraf zorunlu değil |
| Profil/hizmet/fiyat/takvim hazırlığı | PASS | Mevcut partner akışları korundu; yerel UI ve sahiplik SQL kabulü |
| Belge durumu ve yeniden deneme | PASS | Teknik hata yokluk sayılmıyor; yükleme doğrulama değil; başarısız form seçimleri korunuyor |
| Kendi doğrulamasını/yayınını açamama | PASS | İzole PostgreSQL/RLS ve server boundary regresyonları |
| Gerçek SMS teslimi ve yeni telefon E2E | BLOCKED | Staging Auth/SMS sağlayıcı kabulü yok |
| Gerçek Google dönüşünde oturum/form sürekliliği | BLOCKED | Hosted Google test oturumu çalıştırılmadı |

Başvuru ve profil hazırlama birbirinden ayrı kaldı. Belge kuralları yalnızca meslek/kapsam ve incelenmiş etkin kurala göre değerlendirilir; ödeme kuruluşu KYC belgeleri ilk başvuruya zorunlu kılınmadı.

## 6. Admin işlem testleri

**PASS — yerel SQL:** yetki, en az 10 karakter gerekçe, beklenen sürüm, idempotency receipt, transaction içi audit, audit hatasında rollback ve iki admin yarışması doğrulandı. Onay, ret, yayından kaldırma, pasifleştirme, doğrulama kaldırma, test sınıflandırması ve düzeltme kararları mevcut ortak backend sözleşmesini kullanıyor.

**PASS — UI fixture:** “İşler kontrol altında.” ana ekranı, ayrı usta dosyası, hizmetler/belgeler/geçmiş, onay penceresi, çift tıklamada tek sentetik RPC, tekrar okunan durum rozeti ve hata ekranı. Belge kararı onaydan önce hiçbir sentetik mutasyon göndermedi. Eksik şema boş veri sayılmadı.

**BLOCKED — gerçek Supabase admin kabulü:** mevcut production'da ilgili RPC'ler yok. Hosted DB değişimi + anonim görünürlük + audit üçlüsü bu oturumda gerçek Supabase üzerinde çalıştırılmadı. Hazır kabul testi `e2e/provider-control.spec.ts`.

Kanıtlar: [104 ekran/boyut](../artifacts/final-readiness/control-ui/responsive.json), [gerçek PostgreSQL kontrol listesi](../artifacts/security-testing/migration-chain.json).

## 7. Google OAuth ve Storage testleri

| Kontrol | Durum | Gerçek sınır |
| --- | --- | --- |
| Production Google provider ayarı | PASS | `/auth/v1/settings` gerçek GET: `google_enabled:true` |
| Gerçek Google redirect/PKCE/session dönüşü | BLOCKED | Provider'ın açık olması E2E kabulü değil; staging redirect allowlist/Google hesabı doğrulanmadı |
| Private belge bucket metadata | PASS | `public:false`, 5 MiB, PDF/JPEG/PNG; production'da 0 belge nesnesi |
| Belge Storage RLS/GRANT | PASS | Gerçek izole PostgreSQL; Storage HTTP hizmeti yerine geçmez |
| Gerçek upload/download/signed URL/audit | BLOCKED | Staging yok; yerel Docker daemon/Auth servisi erişilemiyor |
| Ayrı owner/admin/yabancı kullanıcı testi | BLOCKED | Yeni `e2e/storage-documents.spec.ts` hazır, gerçek Supabase koşusu yapılmadı |
| Malware taraması | BLOCKED | Upload metadata `scan_status=unavailable`; tarandı veya temizlendi iddiası yok |

Yeni gerçek Storage testi, sentetik PDF yüklemesini, DB SHA-256 kaydını, yükleme sonrası onaysız durumu, owner/admin imzalı indirmeyi, yabancı kullanıcı reddini ve erişim audit'ini kontrol eder. Testte mock servis yok; test ortamı olmadan çalıştırıcı yazma testini başlatmadan BLOCKED döner.

## 8. FUWU Güvence testleri

**PASS — izole PostgreSQL:** mevcut kod sistemi korunarak hash/süre/atanmış usta/tek kullanımlılık, hatalı kod sınırı, iki bağlantıda eşzamanlı kod tüketimi, audit kesintisinde rollback, müşteri rızası, şikâyet/itiraz ve ek iş/fiyat değişikliği kabulü doğrulandı.

**PASS — fixture UI:** müşteri kapı kodunu ister → atanmış usta başlatır → usta tamamlandı bildirir, sipariş `IN_PROGRESS` kalır → müşteri açık onay verince `COMPLETED` olur. GPS izni alınmadı; zorunlu Face ID veya sürekli konum takibi eklenmedi.

**BLOCKED — gerçek staging uçtan uca:** sentetik `CONFIRMED` randevu ve ayrı gerçek Auth kimlikleriyle `e2e/trust-flow.spec.ts` henüz çalışmadı. Production siparişi oluşturulmadı veya tamamlanmadı; canlı ödeme tetiklenmedi.

Kanıt: [belge/Güvence UI](../artifacts/final-readiness/trust-ui/responsive.json), [SQL testleri](../artifacts/security-testing/migration-chain.json).

## 9. Mobil performans ve müşteri/usta kazanımı

| Kontrol | Durum | Sonuç |
| --- | --- | --- |
| Turuncu-beyaz marka, logo, gerçek hizmet fotoğrafları | PASS | Mevcut sistem korundu; fotoğraf [kaynak/lisans kaydı](service-photo-licenses.md) mevcut |
| İstenen ana metinler ve doğrudan hizmet modeli | PASS | “Evinin işi, FUWU'nun işi.” / “Hizmetini seç. Ustanı belirle. Zamanını planla.” / “Ustalığın işe dönüşsün.” korundu |
| Bütün aktif kategorilere erişim | PASS | Gerçekte 11 kategori; fixture production testinde 11 kategori bağlantısı, anasayfada ilk 8 kart |
| Dürüst usta/yorum/puan boş durumu | PASS | Yeni sahte profil/yorum/işlem/gelir garantisi eklenmedi; test ID'leri ayrıca bloke |
| 320–1440 px responsive | PASS | 56 public/ön kayıt, 104 admin/partner, 49 belge/Güvence ekran-boyut yürütmesi; tekrar eden sayfalar var, 209 ayrı özellik demek değil |
| Mobil dokunma/landscape/metin | PASS | Partner alt sekmeleri ≥44 px, reduced-motion, %125 metin ve 844×390 landscape yerel kabulü |
| axe erişilebilirlik | PASS | Denetlenen 26 mobil ekran yürütmesinde ciddi/kritik bulgu yok; tam WCAG sertifikasyonu değil |
| Gerçek cihaz, VoiceOver/TalkBack ve saha Web Vitals | BLOCKED | Fiziksel iOS/Android ve gerçek kullanıcı ölçümü yok |

Public sayfalar ayrıca gerçek **production build** ile yerel fixture backend'e karşı test edildi. Isınmış localhost ana sayfa örneği: DOMContentLoaded **235 ms**, load **495 ms**. Ağ/CPU yavaşlatması uygulanmadı; bunlar production saha performansı, LCP/INP/CLS veya gerçek mobil ağ ölçümü değildir.

Kanıtlar: [public production UI](../artifacts/final-readiness/public-ui/responsive.json), [admin/partner](../artifacts/final-readiness/control-ui/responsive.json), [belge/Güvence](../artifacts/final-readiness/trust-ui/responsive.json). Gerçek hizmet kaydı ve müşteri ön kayıt hosted kabulü migration/staging engellerine bağlıdır.

## 10. Test sonuçları

| Test | Durum | Sonuç / kanıt |
| --- | --- | --- |
| ESLint | PASS | [sonuç](../artifacts/security-testing/lint-result.json) |
| TypeScript | PASS | [sonuç](../artifacts/security-testing/typecheck-result.json) |
| Production build | PASS | İzole public production build geçti; bağımsız sonuç [build-result.json](../artifacts/security-testing/build-result.json) |
| Vitest unit | PASS | 153 test; [coverage koşusu](../artifacts/security-testing/coverage-result.json) |
| Coverage | PASS | Seçili altı kritik modülde %100 statement/branch/function/line; bütün uygulama coverage'ı değil |
| Güvenlik boundary testleri | PASS | 59 test; 458 source dosyasında statik sınır kontrolü |
| npm dependency audit | PASS | 0 bilinen advisory; [audit](../artifacts/security-testing/dependency-audit.json) |
| PostgreSQL clean/upgrade + commerce | PASS | 26 + 27 + 108 + 109 = 270 kontrol; [sonuç](../artifacts/security-testing/integration-result.json) |
| 46 production sürümünün ledger replay'i | PASS | 27 kontrol; gerçek şema yükseltmesi değildir |
| Gözlenen eski orders kolonlarıyla yükseltme | FAIL | `42P07`; [kanıt](../artifacts/final-readiness/production-overlay/migration-production-upgrade.json) |
| Offline Auth/ödeme protokolü | PASS | 77 mock/protokol kontrolü; gerçek Google/iyzico kabulü değil |
| Gerçek localhost HTTP korumaları | PASS | 20 production HTTP yetki/CSRF/hata kontrolü; [sonuç](../artifacts/security-testing/http-result.json) |
| Public production UI | PASS | 56 ekran/boyut; 6 mobil axe yürütmesi |
| Admin/partner UI | PASS | 104 ekran/boyut; 13 mobil axe yürütmesi |
| Belge/Güvence UI | PASS | 49 ekran/boyut; 7 mobil axe yürütmesi |
| Gerçek Supabase commerce E2E | BLOCKED | [sonuç](../artifacts/security-testing/commerce-e2e-result.json); Auth hazır değil, yazma testi başlamadı |
| Gerçek Supabase prelaunch/Storage E2E | BLOCKED | [sonuç](../artifacts/security-testing/prelaunch-e2e-result.json); Auth hazır değil, yazma testi başlamadı |
| GitHub Actions | BLOCKED | YAML ve strict rapor kontrolü hazır; commit/push/run yapılmadı, yeşil hosted CI iddiası yok |

İlk sandbox koşusunda loopback erişimi `EACCES`, npm advisory ağı DNS hatası verdi. Aynı yerel testler izinli çalıştırıcıda başarılı tekrarlandı. UI koşuları gerçek bir etiket ve hydration yarışını ortaya çıkardı; ikisi düzeltildi ve son koşu geçti. [İlk etiket hatası](../artifacts/final-readiness/trust-ui/first-run-failure.json) ve [hydration regresyonu](../artifacts/final-readiness/trust-ui/hydration-regression.json) ayrı tutuldu.

Nihai bağımsız build, lint, TypeScript, unit/coverage, güvenlik, SQL ve HTTP sonuçları aynı kaynak hash'iyle kaydedildi: `9d8c2319d38ae36325617124f762a5f650de4c7fea985481cbbeecf3ee224987`. İzole test PostgreSQL sürümü 18.4; production 17.6 olduğundan hosted PG17 kabulü ayrıca açık. [Release gate](../artifacts/security-testing/release-gate.json), bilinen P0 nedeniyle FAIL; gerçek dış entegrasyon kapıları BLOCKED kalır.

## 11. Kalan eksikler

| İş | Durum | Gerekçe |
| --- | --- | --- |
| Bağımsız `fuwu-staging` | BLOCKED | Aynı organizasyonda yok. Kullanıcı $0 oluşturmayı onayladı; Supabase iki aktif Free proje limitiyle reddetti. Başka proje durdurulmadı/silinmedi veya ücretli plana geçirilmedi. |
| Gerçek production şemasını koruyan bridge tasarımı | FAIL | Legacy orders/bağımlı ödeme tabloları ve yeni commerce ayrımı çözülmeli |
| Hosted clean ve mevcut şemadan upgrade | BLOCKED | Staging projesi yok; production yazma yasağı korunuyor |
| Hosted Auth/Storage/admin/rol/Güvence kabulü | BLOCKED | Gerçek staging ve sentetik fixture kurulumu gerekli |
| Google OAuth/SMS/oturum sürekliliği | BLOCKED | Staging redirect ve gerçek sağlayıcı kabulü yok |
| Production test profillerinin geri alınabilir gizlenmesi | BLOCKED | Ayrı UPDATE onayı ve doğrulanmış şema/operasyon gerekli |
| Gerçek ön kayıt backend'i | BLOCKED | Consent/interest migration ve hosted kabulü gerekli |
| Gerçek cihaz erişilebilirlik/saha performansı | BLOCKED | Cihaz ve saha kanıtı yok |

## 12. Production öncesi riskler

**P0 / FAIL:** mevcut şemaya kör `db push` güvenli değil. Eski orders ve bağlı `order_payments`, `payouts`, `disputes`, `webhook_events`, fonksiyon/politikalar birlikte incelenmeli. Tabloyu düşürmek veya yalnızca CREATE'i koşullu yapmak bu çalışmanın çözümü değildir.

**P1 / BLOCKED:** gerçek Auth/Storage kabulü, kaynak sınıflandırması, admin mutation/readback/public görünürlük ve müşteri ön kayıtları production'da hazır değil. Dört test profili remote DB'de halen aktif.

**P1 / BLOCKED — Supabase security advisor incelemesi:**

- 3 mutable `search_path`: `set_updated_at`, `enforce_payout_preconditions`, `set_service_request_assigned_at`. Gövdeler ve bütün tablo referansları incelenerek staging'de sabit path ve fonksiyonel regresyon gerekir. [Remediation](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable).
- 9 anon ve 11 authenticated SECURITY DEFINER erişim bulgusu. Bu sayılar otomatik olarak 20 istismar kanıtı değildir. Örneğin gerçek `current_user_is_admin` DB rolünü kullanır; gerçek signup trigger'ı yalnızca `customer` üretir; bildirim RPC'si auth/istek sahipliği denetler. Trigger yardımcıları ve politika yardımcıları ayrı değerlendirilmeden toplu REVOKE veya yeni geniş GRANT yapılmadı. [Anon erişim](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated erişim](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- Leaked password protection kapalı. Parola kullanılacaksa plan/ayar desteğiyle etkinleştirme staging'de doğrulanmalı. [Supabase açıklaması](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Kanıtlar: [advisor](../artifacts/final-readiness/security-advisors.json), [gerçek Auth yardımcılarının gövde incelemesi](../artifacts/final-readiness/auth-function-review.json). Uyarı kapatmak için yetki genişletilmedi. Yeni trust RPC'lerinin boş search_path/anon reddi izole SQL'de ayrıca sınandı; bu, eski production fonksiyonlarının otomatik onarıldığı anlamına gelmez.

**BLOCKED:** Malware tarama hizmeti, belge saklama/hukuki kural onayları, gerçek cihaz ve saha ölçümleri tamamlanmadı. Python runtime bulunmadığından UX skill veritabanı araması çalışmadı; mevcut tasarım, skill'in genel erişilebilirlik/dokunma kuralları ve gerçek tarayıcı ölçümleri kullanıldı.

## 13. Yayın için gerekli manuel işlemler

1. **BLOCKED:** Kullanıcı staging kotasını çözmeli: kendi kararıyla Free kontenjanı boşaltma veya ayrı onaylanmış ücretli seçenek. Bu çalışma başka projeyi durdurmaz/silmez. Yeni ücret teklifinde açık maliyet onayı gerekir.
2. **FAIL → PASS gerekli:** Sadece şema metadata'sı/DDL ile legacy orders ve bütün bağımlılıkları staging'de kurun. PII, belge ve secret kopyalamayın. Ayrı commerce tablo adlandırması veya veri koruyan bridge kararını bütün RPC/FK/trigger/policy sözleşmeleriyle inceleyin; üretim geçmişini yok sayarak ledger düzeltmeyin.
3. **BLOCKED:** Kategori kapatan migration ve mevcut app_settings/reassignment farklarını insan incelemesinden geçirin. Temiz zinciri ve gözlenen şemadan dolu sentetik upgrade'i ayrı çalıştırın; tüm eski kolonlar, tutarlar, FK'ler ve audit korunmalı.
4. **BLOCKED:** Yalnızca staging URL/anahtarlarını test allowlist'ine ekleyin. Production ref engeli kalmalı. Ayrı müşteri, usta, admin hesaplarını ve sentetik randevu/mağaza fixture'larını hazırlayın. [E2E hazırlığı](../e2e/README.md).
5. **BLOCKED:** Google/Supabase callback allowlist, SMS ve Storage hizmetini staging'de doğrulayın; `npm run test:e2e:prelaunch` ve commerce/Güvence kabulünü skip olmadan geçirin. Canlı ödeme kapalı kalmalı.
6. **BLOCKED:** Security advisor'ları fonksiyon bazında çözün/değerlendirin; admin audit/rollback, rol yükseltme, private Storage ve rate limit testlerini tekrarlayın.
7. **BLOCKED:** Production backup/rollback ve tam migration planını kullanıcıya inceletin. **Production migration/UPDATE, dört test profilini gizleme ve deployment için ayrı açık onay alın.** Manifest kimlik teyididir; production yazma onayı değildir.
8. **BLOCKED:** Onaylı rollout sonrası anonim public liste/doğrudan profil/offer/slot, gerçek ön kayıt ve admin audit'i tekrar okuyun. Satış aktifleştirme şirketleşme, hukuk, mali müşavir ve ödeme kuruluşu süreçleri tamamlandıktan sonra ayrı kapsamda yapılmalı.

Yerel tekrar: `npm run audit:migrations:readonly`, `npm run check:lint`, `npm run typecheck`, `npm run test:unit:coverage`, `npm run test:security`, `npm run test:integration`, `npm run check:build`, `npm run test:http`, `npm run test:e2e:prelaunch`. Migration denetiminin FAIL ve gerçek Supabase koşusunun BLOCKED dönmesi mevcut engellerin doğru yansıtılmasıdır; başarıya çevrilmemelidir.
