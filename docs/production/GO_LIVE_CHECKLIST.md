# FUWU Go-Live Kontrol Listesi

Tarih: 21 Haziran 2026

## Sonuç

**Production yayını: ❌ NO-GO**

Domain ve SSL Vercel üzerinde çalışıyor; ancak production Supabase katalog
migration'ları eksik görünüyor ve yetkili production health/env/dry-run
kontrolleri için gerekli kimlik bilgileri bu çalışma ortamında yok.

## Domain, DNS ve SSL

- ✅ `fuwu.com.tr` A kaydı `76.76.21.21` adresine, yani Vercel'e işaret ediyor.
- ✅ `www.fuwu.com.tr` CNAME kaydı `cname.vercel-dns.com`.
- ✅ `https://fuwu.com.tr` HTTP 307 ile `https://www.fuwu.com.tr/` adresine
  yönleniyor.
- ✅ Yanıtta `Server: Vercel` ve HSTS başlığı var; HTTPS/SSL aktif.
- ❌ Domainin bağlı olduğu Vercel proje adı/kimliği doğrulanamadı.
  `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` ve gerekirse `VERCEL_ORG_ID` gerekli.

## Production Supabase

- ✅ Anon/read-only sorguyla şu tablolar API üzerinden erişilebilir:
  `profiles`, `providers`, `provider_applications`, `service_requests`,
  `service_categories`, `districts`, `audit_logs`, `rate_limits`, `payments`,
  `notifications`.
- ❌ Public kategori kataloğunda beklenen `cilingir`, `bahce-bakimi` ve
  `havuz-bakimi` kayıtları yok.
- ❌ RLS policy kataloğu service-role olmadan tam doğrulanamadı.
- ❌ `provider-images` ve `provider-verification-documents` bucket'ları
  service-role olmadan kesin doğrulanamadı. Anon `listBuckets` sonucu boştu.
- ❌ `npm run check:backend:db` çalıştırılamadı:
  `SUPABASE_SERVICE_ROLE_KEY` eksik.

## Vercel production environment

- ❌ `npm run check:vercel-env` çalıştırılamadı: `VERCEL_TOKEN` ve
  `VERCEL_PROJECT_ID` sağlanmadı.
- ⚠️ Bu nedenle aşağıdaki production değişkenlerinin gerçek Vercel projesinde
  tanımlı olup olmadığı kanıtlanamadı:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
  - `NEXT_PUBLIC_SENTRY_DSN` (opsiyonel)

## Build ve font güvenilirliği

- ✅ Inter 4.1, 400/500/600/700/800 ağırlıklarıyla projede self-hosted.
- ✅ `next/font/google` kaldırıldı; `next/font/local` kullanılıyor.
- ✅ HTTP, HTTPS ve ALL proxy geçersiz bir adrese yönlendirilmişken production
  build başarıyla tamamlandı.
- ✅ Tasarım ailesi ve kullanılan ağırlıklar değişmedi; altyapı düzeltmesi.

## Production dry-run ve temizlik

- ❌ Production A/B/C dry-run yapılmadı. Yetkili test kullanıcıları,
  service-role ve Vercel production erişimi yok.
- ✅ `scripts/cleanup-test-data.mjs` eklendi.
- ✅ Script yalnızca e-postasında `+launchtest@` bulunan kullanıcıları hedefler.
- ✅ `--confirm` olmadan çalışmayı reddeder.
- ❌ Production'da çalıştırılmadı; silinecek test verisi oluşturulmadı.

## Yayına geçmeden önce zorunlu işlemler

1. Eksik migration/seed'leri production Supabase'e uygula.
2. `cilingir`, `bahce-bakimi`, `havuz-bakimi` kategorilerini doğrula.
3. İki storage bucket'ını ve policy'lerini doğrula.
4. Service-role ile `npm run check:backend:db` çalıştır.
5. Vercel token/proje kimliğiyle `npm run check:vercel-env` çalıştır.
6. `+launchtest@` kullanıcılarıyla production A/B/C dry-run yap.
7. `npm run cleanup:launch-test-data` ile yalnızca test kayıtlarını temizle.
8. Tüm maddeler ✅ olmadan production trafiğini açma.
