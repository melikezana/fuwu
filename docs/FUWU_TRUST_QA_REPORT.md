# FUWU Güvence QA ve release gate

31 Ekim 2026 · Europe/Istanbul. Yerel uygulama ve migration hazırlığı. **Production release / gerçek Supabase E2E kabulü verilmedi.**

## Canlı salt okunur denetim

[Kanıt](../artifacts/trust/production-readonly.json): 10 başvuru, 0 belge yolu/URL, 0 özel belge nesnesi, 8 kullanıcıya bağlanmamış başvuru. Özel bucket 5 MB/PDF/JPEG/PNG ve private. Canlıda yeni yayın/kod tabloları yok. 46 uygulanmış sürüm ve repoda 25 eksik migration farkı var. Bu kayıtlar düzeltilmedi veya gerçek kişilere bağlanmadı. Ayrı development branch/staging bulunmadı.

## Test kanıtları

| Katman | Sonuç / kapsam | Kanıt |
| --- | --- | --- |
| Birim | 147/147, 0 skip; belge durum/kategori/aşama/süre, hata ayrımı, taslak kural, dört alanlı başvuru ve sahte ETA engeli dahil | [unit.json](../artifacts/security-testing/unit.json) |
| Güvenlik API testleri | 59/59, 0 skip; yetkisiz dosya erişimi, audit arızasında erişim reddi, MIME/magic-byte uyuşmazlığı, kapalı eski ödeme onayı dahil. Auth/RPC stub'lıdır. | [security.json](../artifacts/security-testing/security.json) |
| Lint | Değişen 59 kaynak/test/script dosyasında 0 hata, 0 uyarı | [lint-result.json](../artifacts/trust/lint-result.json) |
| Tür kontrolü | Son kaynak sürümünde geçti | [typecheck-result.json](../artifacts/security-testing/typecheck-result.json) |
| Production build | Yerel build geçti; deployment değildir | [build-result.json](../artifacts/security-testing/build-result.json) |
| Gerçek PostgreSQL temiz kurulum | 71 migration, 26 kontrol grubu. Belgeler, yayın kararı, kod kilitleri/yarışı, müşteri onayı, vakalar, audit rollback ve ACL | [migration-chain.json](../artifacts/backend-reliability/migration-chain.json) |
| Dolu şema yükseltmesi | 71 migration / 27 kontrol grubu geçti; tarihsel sipariş/profil/finans alanları korundu. Ortak rapor dosyasında Windows yazma hatası sonrası ayrı dizinde yeniden çalıştırıldı. | [migration-upgrade.json](../artifacts/trust/upgrade/migration-upgrade.json) |
| Gözlenen production sürümlerinden yerel yükseltme | 71 migration / 27 kontrol grubu geçti; 46 gözlenen başlangıç sürümü + 25 eksik dosya yerel sentetik veriyle test edildi. Uzaktan migration değildir. | [migration-production-upgrade.json](../artifacts/trust/production-upgrade/migration-production-upgrade.json) |
| Mobil/desktop UI | 49 ekran/genişlik birleşimi: 320,375,390,430,768,1024,1440 px. Taşma ve browser exception yok. 390 px'te 7 ekran/durumda ciddi/kritik axe ihlali yok. Gerçek React/Server Action/API, sentetik Auth/REST. | [UI raporu](../artifacts/trust/ui/responsive.json) |
| Gerçek Supabase/Auth/Storage E2E | **BLOCKED**, izole izinli Auth/DB hazır değil; hiçbir write test başlatılmadı | [E2E gate](../artifacts/security-testing/commerce-e2e-result.json) |
| Google OAuth gerçek tarayıcı girişi | **BLOCKED**, ayrı Google test oturumu/redirect kabulü yok | Önceki Auth testleri bunun yerine geçmez |
| Gerçek Storage upload/download / malware | **BLOCKED**, server-only anahtar ve gerçek staging Storage yok; malware servisi yapılandırılmadı | Kod statik/yerel testleri HTTP Storage kanıtı değildir |

PostgreSQL runner sadece kendi loopback cluster'ını açar; proje env URL/credential okumaz. PostgreSQL 18.4 + Supabase platform DDL shim'i kullanır. RLS, GRANT, transaction, trigger ve iki bağlantılı yarış gerçektir; PostgREST, Auth, Storage ve production PG17.6 yerine geçtiği iddia edilmez.

İlk TS denemesi eski test runtime kopyalarını da tarayarak timeout oldu; `tsconfig` üretilen `artifacts` dizinini hariç tutacak şekilde düzeltildi. Güvenlik testinin ilk denemesinde sandbox TEMP rename engeli oluştu; aynı testler çalışma alanındaki TEMP ile başarıyla tekrarlandı. UI form etiketi, hydration öncesi tıklayan test ve test fixture başvuru/iptal koşulları düzeltildi. Önceki başarılar güncel test gibi sunulmaz; final yeniden çalışma kanıtları esas alınır.

## Güvenlik kabulü ve engeller

Belge yüklemesi doğrulama değildir; admin onayı belge sürümü ve gerekçe ister. Normal kullanıcı kendi kimliğini onaylayamaz veya başkasının dosyasını açamaz. Yeni belge path'i doğrulanmış server makbuzuna bağlıdır. Süre dolumu/kayıp nesne yayın gereksinimini karşılamaz. Açık kod SELECT, tekrar kullanım, yanlış provider ve brute-force reddedilir. Audit outage code üretimini geri alır. Müşteri rızası olmadan hizmet tamamlanmaz; şikâyet finansal onay sayılmaz. Konum izni olmadan kod/onay/destek çalışır.

Gerçek E2E'nin tüm müşteri → hizmet → usta → randevu → kapı → tamamlama → müşteri onayı yolunu staging'de tamamlaması gerekir. `e2e/trust-flow.spec.ts` yalnız tahsis edilmiş sentetik randevu ve doğrulanmış test kimlikleriyle son aşamaları sınamak üzere eklendi; çalıştırılmadı. Yerel fixture UI kabulüdür, hosted E2E kabulü değildir. Canlı ödeme, şirketleşme ve ödeme kuruluşu KYC/ek bedel akışı ayrı release engelidir. Saklama, aydınlatma ve hukuki kategori kuralları ayrıca onaylanmalıdır. Yüksek hacim için admin kuyruk sayfalaması ve şüpheli hesap operasyonu genişletilmelidir.

## Yeniden üretim

```powershell
node scripts/run-check.mjs unit
node scripts/run-check.mjs typecheck
node scripts/run-check.mjs build
node scripts/test-backend-migrations.mjs
node scripts/test-backend-migrations.mjs --upgrade
node scripts/test-backend-migrations.mjs --production-upgrade
node scripts/verify-provider-control-ui.mjs --trust
node scripts/run-commerce-e2e.mjs
```

Loopback engellenen sandbox'ta yerel test çalıştırıcısı izni kullanıldı; production'a yönlendirme yapılmadı. Production migration, canlı ödeme, toplu silme, Git push veya deployment uygulanmadı.

Son salt okunur tekrar da production'da 10 başvuru, 0 belge nesnesi/yolu ve 46 migration gösterdi; yeni yayın/kod tabloları halen yok: [production-after-readonly.json](../artifacts/trust/production-after-readonly.json).

Nihai yerel sonuç **PASS**, hosted/production release gate **BLOCKED**: [release-gate.json](../artifacts/trust/release-gate.json). Birim, tür, build ve üç SQL koşusunun kaynak hash'i aynı son sürümdür: `34f02831ff94ceaf6b963787e28ff167650a7935d07ad50aea06413308be3446`. Windows rapor yazma hatasının ayrı kaydı [buradadır](../artifacts/trust/upgrade/report-write-failure.json); başarılı tekrar bu hatayı gizlemek için test sonucu uydurmamıştır.

İlgili tasarım raporları: [Belge matrisi](FUWU_DOCUMENT_VERIFICATION_MATRIX.md), [Trust & Safety mimarisi](FUWU_TRUST_AND_SAFETY_ARCHITECTURE.md), [Hizmet kodu güvenliği](FUWU_SERVICE_CODE_SECURITY.md).
