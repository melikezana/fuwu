# FUWU Production Go-Live Kontrol Listesi

Tarih: 28 Haziran 2026

## Nihai karar

**❌ NO-GO — açık P0 maddeleri tamamlanana kadar yayına çıkma.**

Tamamlanan P0 kontroller:

- ✅ Production Supabase migration history local ile eşitlendi.
- ✅ `20260628000100_add_missing_service_categories.sql` production'a uygulandı.
- ✅ Production aktif kategori sayısı **11**; `cilingir`, `bahce-bakimi` ve
  `havuz-bakimi` dahil.
- ✅ `profiles.avatar_url` kolonu production'da mevcut.
- ✅ `reviews` RLS politikaları production'da mevcut.
- ✅ `backend_health_catalog()` production DB'de CLI login role ile metadata döndürdü.

Açık P0 maddeleri:

- ❌ `SUPABASE_SERVICE_ROLE_KEY` bu ortamda yok; `scripts/check-backend-db.mjs`
  production service-role ile PASS çalıştırılamadı.
- ❌ `UPSTASH_REDIS_REST_URL` ve `UPSTASH_REDIS_REST_TOKEN` production ortamında
  zorunlu değişken olarak hâlâ tamamlanmalı.
- ❌ Production smoke testi service-role erişimiyle tamamlanmalı ve scoped test
  verisi temizlenmeli.

## 1. Domain, DNS, SSL ve deployment

| Kontrol | Sonuç | Kanıt |
|---|---:|---|
| `fuwu.com.tr` apex yönlendirmesi | ✅ | HTTPS üzerinden `www.fuwu.com.tr` |
| `www.fuwu.com.tr` canlı uygulama | ✅ | HTTPS 200, `Fuwu \| Ev Hizmetleri Platformu` |
| SSL/HSTS | ✅ | Vercel tarafından servis ediliyor |
| Vercel project | ✅ | `zanas-projects-3363fc13/fuwu` |
| Production domain assignment | ✅ | Vercel redeploy ekranında `www.fuwu.com.tr` atanmış |
| Application release commit | ✅ | `main` / `cb6e872521d828adc477d910e72867ab23706550` |
| Production deployment | ✅ | `GRt6MxJFC9tEcNs1p4mXeoLQ5ofr`, Ready, Production, Current |

## 2. Vercel production environment

Vercel dashboard kontrolü:

| Değişken | Durum | Not |
|---|---:|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Production and Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Production and Preview |
| `UPSTASH_REDIS_REST_URL` | ❌ | Upstash hesabına yetkili giriş bekleniyor |
| `UPSTASH_REDIS_REST_TOKEN` | ❌ | Upstash hesabına yetkili giriş bekleniyor |
| `NEXT_PUBLIC_SITE_URL` | ✅ | `https://www.fuwu.com.tr` eklendi; redeploy oluşturuldu |
| `NEXT_PUBLIC_SENTRY_DSN` | ⚠️ | Opsiyonel; tanımlı değil |

Gizli değerler bu dokümana veya repository dosyalarına yazılmamıştır.

## 3. Production Supabase

Public production kontrolü:

| Kontrol | Sonuç | Kanıt |
|---|---:|---|
| Project host | ✅ | `bjhyisomjadirdchruix.supabase.co` |
| Public kategori sorgusu | ✅ | REST erişilebilir |
| Production aktif kategori sayısı | ✅ | **11** |
| Beklenen aktif kategori sayısı | ✅ | Production katalogda **11** aktif slug |
| Eksik kategoriler | ✅ | Eksik yok; `cilingir`, `bahce-bakimi`, `havuz-bakimi` mevcut |

Yerel migration zinciri:

- ✅ 41 migration zinciri korunuyor; son production migration `20260628000100_add_missing_service_categories.sql`.
- ✅ `backend_health_catalog()` çağrıldı.
- ✅ Tablolar, RLS politikaları, foreign key kuralları, storage bucket'ları,
  realtime publication, indeksler ve status constraint kontrolleri PASS.
- ✅ Local katalogda 11 beklenen kategori bulundu.

Production yetkili kontroller:

- ✅ `supabase link --project-ref bjhyisomjadirdchruix` tamamlandı.
- ✅ `supabase migration list` local/remote karşılaştırması yapıldı.
- ✅ `supabase db push --dry-run` yalnızca
  `20260628000100_add_missing_service_categories.sql` migration'ını gösterdi;
  `DROP TABLE` / `DROP COLUMN` yok.
- ✅ `supabase db push` uygulandı; production katalog 11 kategoriye çıktı.
- ✅ Production `backend_health_catalog()` CLI login role ile metadata döndürdü.
- ❌ Production `SUPABASE_SERVICE_ROLE_KEY` bu ortamda yok; zorunlu
  `scripts/check-backend-db.mjs` service-role çalıştırması tamamlanamadı.

Veri kaybı riski dry-run çıktısında DROP içermediği için güvenli görüldü.

## 4. GitHub Actions launch verification

Workflow: `.github/workflows/e2e.yml`

| Kontrol | Sonuç | Kanıt |
|---|---:|---|
| Local Supabase start/reset | ✅ | GitHub Actions run `27953622872` |
| Backend DB health check | ✅ | Tüm katalog kontrolleri PASS |
| Lint | ✅ | Workflow step success |
| Production build | ✅ | Workflow step success |
| Chromium kurulumu | ✅ | Workflow step success |
| Playwright launch suite | ✅ | **15 passed (1.3m)** |
| Supabase cleanup | ✅ | `supabase stop --no-backup` success |

Run URL:
`https://github.com/melikezana/fuwu/actions/runs/27953622872`

CI sırasında düzeltilen iki kök neden:

1. Magic-link helper uzun yaşayan bağlantılar nedeniyle `networkidle`
   bekliyordu; callback `domcontentloaded` + gerçek session kontrolüne geçirildi.
2. Session cookie oluşturulduktan sonra ilk korumalı istek `/login`e
   yarışabiliyordu; helper hedef sayfaya doğrulanmış ikinci navigasyon yapıyor.

Admin atama formu da hydration öncesi güvenilir çalışması için native Server
Action formuna geçirildi.

## 5. Production smoke test

| Adım | Sonuç | Kanıt / engel |
|---|---:|---|
| Customer smoke hesabı | ❌ | Production service-role erişimi bekleniyor |
| Çilingir talebi oluşturma | ❌ | Production service-role erişimiyle smoke akışı bekleniyor |
| `service_requests` kaydı | ❌ | Yetkili DB doğrulaması yapılamadı |
| Provider smoke hesabı | ❌ | Production service-role erişimi bekleniyor |
| Provider başvurusu | ❌ | Yetkili akış başlatılmadı |
| Admin onayı ve provider kaydı | ❌ | Admin/service-role doğrulaması bekleniyor |
| `+smoketest` scoped cleanup | ❌ | Smoke verisi oluşturulmadığı için çalıştırılmadı |

Gerçek kullanıcı verisine dokunulmamıştır. Cleanup script'i yalnızca izinli
`smoketest+`/`+smoketest` desenlerini ve ilişkili kayıtları hedefler.

## 6. Yayın kapısı

GO kararı için aşağıdakilerin tamamı zorunludur:

1. Production `SUPABASE_SERVICE_ROLE_KEY` ile `scripts/check-backend-db.mjs`
   kontrolünü PASS çalıştır.
2. Upstash Redis oluştur ve iki zorunlu Vercel değişkenini ekle.
3. Production smoke testini tamamla ve scoped test verisini temizle.

**❌ NO-GO — service-role backend health, zorunlu Upstash değişkenleri ve
production smoke testi tamamlanana kadar bekle.**
