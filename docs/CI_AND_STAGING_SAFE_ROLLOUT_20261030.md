# FUWU — staging migration güvenlik planı

**Durum:** Hazırlık planı; üretim veya staging veritabanında işlem yapılmadı. Gerçek iyzico ödeme kapalı kalmalı.

## Giriş koşulları
- Canlı Vercel projesindeki `NEXT_PUBLIC_SUPABASE_URL` değerinin hangi Supabase proje kimliğine işaret ettiğini yetkili panelden teyit et. GitHub, yerel `.env.local` ve production aynı proje kabul edilmez.
- Production veritabanı şema dökümünü, `supabase_migrations.schema_migrations` ledger'ını, FK/RLS/RPC/Storage nesnelerini ve gerçek tablo sürümlerini **salt okunur** yoldan dışa aktar. Gizli anahtarları veya kişisel verileri Git'e koyma.
- Production şemasının depo migration zincirinden farklı olduğu bilinmektedir: `service_catalog`, `service_variants`, yayın incelemesi ve yorum kaynak sütunları için farklılıklar raporlanmıştır. Tüm migration'ları production'a körlemesine çalıştırma.
- Mevcut deployment/production verisinin ayrı ve geri yüklenebilir yedeği, retention planı ve rollback tatbikatı sağlanmadan veri yapısını değiştirme.

## İzole staging kurulumu
1. Yeni, production'dan farklı Supabase **staging projesi** oluştur; staging URL/anahtarları yalnızca gizli CI/staging ayarlarında tut.
2. Şema farklarını `docs/FUWU_PRELAUNCH_MARKETPLACE_AUDIT.md` ile karşılaştır; beklenmeyen farkları engel olarak işaretle.
3. Tamamen yeni staging'e temiz migration zincirini uygula; ayrı bir kopyada ise mevcut üretim şemasından **yükseltme** yolunu dene.
4. Gerekirse production'dan anonimleştirilmiş ve hassas verileri çıkarılmış fixture'lar kullan. Gerçek müşteri, ödeme bilgisi, OAuth sırrı, belge veya adres taşınmasın.
5. Satın alma akışındaki mevcut tablo/RPC/trigger/RLS/Storage uyumluluğunu doğrula; eşzamanlı slot, komisyon, iade, OAuth callback, yayın kontrolü ve yorum testlerini çalıştır.
6. Sahte usta kaydı temizlik planını yalnızca doğrulanmış ID/ilişki dökümüyle hazırla. Silme veya karantina için ayrı açık onay iste.
7. Staging'de `npm run test:release`, ilgili entegrasyon ve Playwright testlerini çalıştır; gerçek Google OAuth ve iyzico sandbox testlerini PASS olarak ancak gerçek uçtan uca kanıt varsa işaretle.

## Yayın kapısı
- CI kalite ve E2E kontrolleri geçmeden, staging farkları kapanmadan, gerçek dış servis testleri bitmeden ve hukuki/şirketleşme hazırlığı tamamlanmadan **NO-GO**.
- Herhangi bir migration veya deployment production'a uygulanmadan önce değişiklik listesi, yedek/geri dönüş planı ve onay ayrı ayrı alınacak.
- `FUWU_SANDBOX_CHECKOUT_ENABLED` varsayılanı kapalı kalacak; canlı iyzico tahsilatı etkinleştirilmeyecek.

## CI hata kaynakları — 30 Ekim 2026
- `quality.yml`: `ubuntu-latest` üzerinde `postgresql-17` varsayılan apt depolarında yoktu (exit 100). PR, runner'ı `ubuntu-24.04` olarak sabitler ve resmî PostgreSQL PGDG kaynağından 17 kurar.
- `e2e.yml`: Node 22/npm ile `npm ci` `Missing: typescript@5.9.3 from lock file` hatasında durdu. PR, bu iş akışını kalite işindeki Node 24 sürümüyle eşitler. PR'daki gerçek CI temiz kurulum sonucu doğrulanmalıdır; geçmezse kilit dosyası deterministik şekilde yenilenmeli.
