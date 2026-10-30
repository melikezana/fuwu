# FUWU provider güvenlik ve QA raporu

Tarih: 30 Ekim 2026. Kullanıcı tercihiyle yerel doğrulama yapıldı. Production'a hiçbir mutation uygulanmadı.

## Ortam ve kanıt sınırı

Production: Supabase PostgreSQL 17.6; sadece metadata, ilişki sayıları ve loglar okundu. Yerel migration/entegrasyon testleri geçici PostgreSQL 18.4 üzerinde Supabase platform DDL shim'iyle çalışır. Gerçek Postgres transaction, rol, GRANT, RLS ve trigger'lar yürütülür; hosted Supabase, PostgREST, Auth ve Storage servislerinin yerini tuttuğu iddia edilmez.

Yerel Next/Edge testleri gerçek React ve Server Action çalıştırır, Auth/REST sentetiktir. `.env.local` servis değerleri test runner'da boşaltılır. DB runner hiçbir env URL okumaz, geçici cluster'ı yalnızca loopback'e bağlar ve kendi cluster'ını kapatır. Testler production'a yönlendirilemez.

## Şema farkı

Canlıda 20 public tablo, 16 public fonksiyon ve 81 politika okundu. Karşılaştırma 23 eksik migration, 21 eksik yerel tablo, mevcut tablolarda 55 eksik kolon ve 120 eksik fonksiyon imzası buldu. Fonksiyon hash farkı semantik eşdeğerlik kanıtı değildir; gözden geçirme işaretidir. Canlıda bulunup repo modelinde bulunmayan ek tablolar için bu sayılar birebir toplam fark olarak yorumlanmamalıdır.

`provider_publication_reviews`, kalite/gate RPC'leri ve atomik hız sınırlama RPC'si eksik. Yeni Control Center RPC'leri de ek migration gerektirir. Ayrıntılı ve yeniden üretilebilir çıktı: [schema-comparison.json](../artifacts/backend-reliability/schema-comparison.json).

## Güvenlik sözleşmeleri

- Her yönetim fonksiyonunda `auth.uid()` ve DB profiles rolü kontrol edilir. User metadata'dan admin yetkisi çıkarılmaz.
- Yeni SECURITY DEFINER fonksiyonlarında boş `search_path`, şema ile nitelenmiş nesneler ve açık EXECUTE grant/revoke kullanılır. RLS ve nesne GRANT'leri ayrı kontrol edilir.
- Receipt tablosu RLS ile korunur; anon/authenticated doğrudan okuyamaz veya yazamaz. İşlem kimliği aktör ve payload hash'i ile bağlanır.
- Provider kilidi → yayın incelemesi kilidi sırası tutarlıdır. İki yönetici eski sürümle aynı kaydı değiştiremez.
- Audit/receipt aynı transaction'dadır. Başarısız audit kararın uygulanmasına izin vermez.
- Belge path'i browser'a veya public provider projeksiyonuna açılmaz. Usta sadece kendi Storage prefix'inde bulunan dosyayı kendi başvurusuna bağlayabilir.
- Normal kullanıcı başka usta hazırlığını okuyamaz, mağazasını değiştiremez, kendini doğrulayamaz, admin olamaz veya audit satırını değiştiremez.
- Yayın kaldırma `DELETE` içermez. Kayıt türü `test` public gate'i kapatır. Onaylı gerçek kayıtlar otomatik test olarak sınıflandırılmaz.
- Canlı checkout kapalı kaldı; yeni kod hiçbir iyzico canlı tahsilat anahtarı veya ödeme etkinleştirme ayarı eklemez.

Supabase'ın güncel [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) ve [Data API güvenliği](https://supabase.com/docs/guides/api/securing-your-api) belgeleri incelendi. Yeni nesnelerde eski otomatik grant davranışına güvenilmedi.

## Çalıştırılan testler

| Katman | Gerçek sonuç | Kanıt |
| --- | --- | --- |
| Birim | 118/118 geçti, skip yok; yeni 25 test dahil | `artifacts/security-testing/unit.json` |
| TypeScript | Geçti | `artifacts/security-testing/typecheck-result.json` |
| Production build | Geçti; son çalışmada compile 9,2 sn | `artifacts/security-testing/build-result.json` |
| Temiz DB | 69 migration, 17 kontrol grubu | `artifacts/backend-reliability/migration-chain.json` |
| Dolu commerce şeması yükseltmesi | 69 migration, 18 kontrol grubu; geçmiş veriler byte-for-byte | `artifacts/backend-reliability/migration-upgrade.json` |
| Gözlenen production sürümlerinden yükseltme | 46 başlangıç sürümü + 23 eksik migration; mevcut kolonlar korunur | `artifacts/backend-reliability/migration-production-upgrade.json` |
| UI fixture | 42 ekran/boyut birleşimi, taşma/exception yok | `artifacts/control-center/after/responsive.json` |
| Gerçek Supabase Auth/Storage E2E | Çalıştırılmadı: local Auth `ECONNREFUSED` | `artifacts/control-center/hosted-e2e-precondition.json` |
| Google OAuth gerçek giriş | Çalıştırılmadı | İzole OAuth test ortamı yok |

ESLint ilgili değiştirilmiş TS/TSX dosyalarında hatasız ve uyarısız geçti: `artifacts/control-center/lint-result.json`. Profil metni sadeleştirildikten sonra 390 ve 1440 px görüntüleri ayrıca yenilendi: `artifacts/control-center/profile-copy/responsive.json`. UI öncesi/sonrası görselleri [UX raporundadır](FUWU_PROVIDER_PARTNER_UX.md).

## Admin test kapsamı

Gerçek PostgreSQL üzerinde: yayından kaldırma, yeniden yayın kalite onayı, pasifleştirme/aktifleştirme, doğrulama kaldırma ve belgeyle doğrulama, gerçek/test sınıflandırması, düzeltme/inceleme kararları, profil fiyat/saat düzenleme, yanlış rol, olmayan ID, geçersiz eylem, yanlış fingerprint, eski sürüm, aynı isteğin tekrar gönderilmesi, iki gerçek DB oturumunun eşzamanlı kararı ve aynı UUID ile eşzamanlı tekrar, gerçek hız sınırı, eksik RPC, audit insert hatası ve rollback test edildi.

Birim testlerinde eksik RPC, ağ hatası, hassas hata metninin gizlenmesi, commit sonrası SELECT hatası ve sonradan değişmiş receipt kontrol edildi. UI'da onay penceresi, usta adı, gerekçe, pending kilidi, çift tıklamada tek istek, güncellenmiş badge ve görünür başarı/şema hatası kontrol edildi.

Doğrulamayı kaldırmak yayını kapatmamalıdır. RPC, editoryal alanlar değişmediyse mevcut insan yayın kararını korur ve yalnızca doğrulama/fingerprint bakımını yapar. Gerçek DB testinde yayın açık kalması ayrıca doğrulanır. Gerçek içerik veya belge değişikliği yeniden incelemeye alınır.

## Partner test kapsamı

Gerçek DB: kendi ad/açıklamasını düzenleme; hizmet fiyatı, süre, kapsam, ilçe ve haftalık saati kaydetme; yeniden inceleme; başka usta için okuma/yazma engeli; identity/admin escalation engeli; özel Storage policy ve belge path spoof engeli; gerçek Storage metadata satırına belge eşleştirme; yeni belgeyle eski identity/mesleki doğrulamayı kaldırma ve başvuruyu pending yapma.

UI fixture: ana sayfa, hizmet, takvim, profil ve belge formu; takvim gerçek app POST'u ve fixture RPC başarı sonucu; dört mobil sekme. Gerçek HTTP dosya yükleme, gerçek Google oturumu ve hosted Auth/RLS turu bu sonuçlara dahil değildir.

## Altı koşullu yayın kapatma kabulü

Hazır test `e2e/provider-control.spec.ts` veritabanı durumu, admin badge'i, public liste, public profil 404, tek audit ve yetkisiz RPC reddini tek senaryoda kontrol eder. Bu senaryo gerçek izole Supabase hazır olmadığı için yürütülmedi. **Tam E2E kabulü PASS değildir.** SQL ve fixture UI parçaları geçti; bunlar birleştirilip gerçek E2E kanıtı gibi sunulmaz.

## Staging ve production sırası

1. Production snapshot/backup ve metadata farkı insan tarafından gözden geçirilir. Eksik eski migration'lar atlanmaz; mevcut drift için migration history körlemesine değiştirilmez.
2. Production ile aynı PostgreSQL ana sürümünde ayrı Supabase staging hazırlanır. Gerçek kişisel belgeler yerine sentetik dosyalar kullanılır.
3. `schema-comparison.json` içindeki 23 eksik dosya bağımlılık sırasıyla staging'de doğrulanır. Migration başına beklenen DDL/grant/trigger farkı incelenir; rating backfill'i kaldırılmış pending dosya değişikliği özellikle gözden geçirilir.
4. `.env.test` yalnızca izinli staging'i gösterir; `config/test-targets.json` production referansını korumalı hedef olarak tutar. Gerçek Auth/Mailpit, Storage ve iki E2E senaryosu yürütülür.
5. Google OAuth test redirect URL'leri ayrı doğrulanır. Altı yayın koşulu tek testte geçmeden kabul verilmez.
6. Release adımı somut migration diff, yedek, test kanıtı ve geri dönüş planıyla ayrıca kullanıcı onayına sunulur. Bu çalışma production'a migration/deployment uygulamaz.

Yeni şema additive'dir. Geri dönüşte audit/receipt/veri tablolarını DROP etmek yerine uygulama sürümü geri alınmalı, ödeme kapalı tutulmalı ve yayın kararı yetkili ters eylemle düzeltilmelidir. Tarihsel kullanıcı/siparişleri cascade silme geri dönüş planı değildir.

## Yeniden çalıştırma

```powershell
node scripts/run-check.mjs unit
node scripts/run-check.mjs typecheck
node scripts/run-check.mjs build
node scripts/test-backend-migrations.mjs
node scripts/test-backend-migrations.mjs --upgrade
node scripts/test-backend-migrations.mjs --production-upgrade
node scripts/verify-provider-control-ui.mjs
# Yalnızca izole Supabase Auth/Storage hazır olduğunda:
npx playwright test e2e/provider-control.spec.ts
```

Yerel sandbox loopback bağlantısını engelliyorsa izinli yerel test çalıştırıcısı gerekir. Bu durum production'a yönlendirmek için gerekçe değildir.
