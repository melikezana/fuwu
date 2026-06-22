# FUWU Production Go-Live Kontrol Listesi

Tarih: 22 Haziran 2026

## Nihai karar

**❌ NO-GO — production Supabase migration drift'i, zorunlu Upstash
değişkenleri ve production smoke testi tamamlanana kadar bekle.**

Uygulama kodu, yerel backend sağlık kontrolleri, 15 Playwright testi, GitHub
Actions ve Vercel deployment yeşildir. Yayın kapısı yalnızca yetkili production
altyapı kontrolleri nedeniyle kapalıdır.

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
| Production aktif kategori sayısı | ❌ | **8** |
| Beklenen aktif kategori sayısı | ✅ | Local migration + seed sonrası **11** |
| Eksik kategoriler | ❌ | `cilingir`, `bahce-bakimi`, `havuz-bakimi` |

Yerel migration zinciri:

- ✅ 37 migration sıfırdan başarıyla uygulandı.
- ✅ `backend_health_catalog()` çağrıldı.
- ✅ Tablolar, RLS politikaları, foreign key kuralları, storage bucket'ları,
  realtime publication, indeksler ve status constraint kontrolleri PASS.
- ✅ Local katalogda 11 beklenen kategori bulundu.

Production yetkili kontroller:

- ❌ Supabase dashboard oturumu tamamlanmadı.
- ❌ `SUPABASE_ACCESS_TOKEN` mevcut değil.
- ❌ Production DB password mevcut değil.
- ❌ Production `SUPABASE_SERVICE_ROLE_KEY` mevcut değil.
- ❌ `supabase migration list` production ile karşılaştırılamadı.
- ❌ `supabase db push --dry-run` çalıştırılamadı.
- ❌ `supabase db push` uygulanmadı.
- ❌ Production `backend_health_catalog()` service-role ile doğrulanmadı.

Veri kaybı riski değerlendirmesi yalnızca production dry-run çıktısı
görüldükten sonra yapılacaktır. Dry-run olmadan otomatik push yapılmamıştır.

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
| Çilingir talebi oluşturma | ❌ | Production katalogda Çilingir eksik |
| `service_requests` kaydı | ❌ | Yetkili DB doğrulaması yapılamadı |
| Provider smoke hesabı | ❌ | Production service-role erişimi bekleniyor |
| Provider başvurusu | ❌ | Yetkili akış başlatılmadı |
| Admin onayı ve provider kaydı | ❌ | Admin/service-role doğrulaması bekleniyor |
| `+smoketest` scoped cleanup | ❌ | Smoke verisi oluşturulmadığı için çalıştırılmadı |

Gerçek kullanıcı verisine dokunulmamıştır. Cleanup script'i yalnızca izinli
`smoketest+`/`+smoketest` desenlerini ve ilişkili kayıtları hedefler.

## 6. Yayın kapısı

GO kararı için aşağıdakilerin tamamı zorunludur:

1. Supabase dashboard/CLI yetkili erişimini tamamla.
2. Production migration history'yi local 37 migration ile karşılaştır.
3. `supabase db push --dry-run` çıktısında beklenmedik DROP/veri kaybı
   olmadığını doğrula.
4. Güvenliyse production migration'larını uygula.
5. Production aktif kategori sayısını 11 olarak doğrula.
6. Production service-role ile backend health kontrolünü PASS et.
7. Upstash Redis oluştur ve iki zorunlu Vercel değişkenini ekle.
8. Production smoke testini tamamla ve scoped test verisini temizle.

**❌ NO-GO — production Supabase migration drift'i, zorunlu Upstash
değişkenleri ve production smoke testi tamamlanana kadar bekle.**
