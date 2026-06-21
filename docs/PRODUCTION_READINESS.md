# FUWU Production Readiness

Bu belge 21 Haziran 2026 tarihinde production hazırlığı için güncellenmiştir.

## Supabase backup stratejisi

Supabase'in güncel dokümantasyonuna göre Pro, Team ve Enterprise projeleri günlük
otomatik veritabanı yedeği alır. Pro plan son 7 günlük günlük yedeklere erişir.
Point-in-Time Recovery (PITR) Pro, Team ve Enterprise planlarında ücretli add-on
olarak etkinleştirilebilir ve en az Small compute add-on gerektirir. PITR açıkken
günlük backup yerine saniye hassasiyetine kadar geri dönüş noktaları kullanılır.

Kaynak: [Supabase Database Backups](https://supabase.com/docs/guides/platform/backups)

FUWU için öneri:

- İlk production yayını için en az Pro plan kullan.
- Düşük hacimli başlangıç döneminde 7 günlük günlük backup ve haftalık şifreli
  `supabase db dump` çıktısını ayrı bir bulut hesabında sakla.
- Sipariş/ödeme hacmi yükseldiğinde 7 günlük PITR add-on'u etkinleştir; RPO hedefini
  birkaç dakika, RTO hedefini veri boyutuna göre yazılı hale getir.
- Ayda bir staging üzerinde restore tatbikatı yap ve sonuçları operasyon kaydına ekle.
- Supabase veritabanı yedeklerinin Storage API içindeki gerçek dosya nesnelerini
  içermediğini unutma; yalnızca metadata veritabanında bulunur. `provider-images` ve
  `provider-verification-documents` için ayrı object-storage kopyalama/retention
  politikası tanımla.

## Migration uygulama süreci

1. Migration dosyasını timestamp sırasına uygun ve idempotent DDL ile oluştur.
2. Yerelde `supabase db reset` ile tüm migration zincirini sıfırdan doğrula.
3. Staging veritabanında `supabase db push` çalıştır; build, lint, backend health ve
   kritik kullanıcı akışlarını doğrula.
4. Production öncesinde güncel backup/restore noktası bulunduğunu kontrol et.
5. Bakım penceresinde production projesine bağlı CLI ile `supabase db push` uygula.
6. Deploy sonrası tablo, RLS, Storage policy, auth, başvuru ve talep akışlarına smoke
   test uygula.

Repo forward-only migration kullanıyor; eşleşen down migration dosyaları yok. Bu
nedenle otomatik rollback mümkün değildir. Geri dönüş için önceki kod sürümüne dönmek
tek başına yeterli olmayabilir. Riskli DDL değişikliklerinde:

- Önce geriye uyumlu kolon/policy ekle.
- Kod geçişi tamamlanmadan kolon silme veya veri tipini daraltma.
- Gerekirse ayrı bir telafi migration'ı hazırla.
- Veri kaybı riski varsa restore veya doğrulanmış dump kullan.

## Ortam değişkenleri envanteri

| Değişken | Local | Staging | Production | Açıklama |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Zorunlu | Zorunlu | Zorunlu | Supabase proje URL'i. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Zorunlu | Zorunlu | Zorunlu | Tarayıcı/server session istemcisi için anon key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Sağlık/admin scriptleri için zorunlu | Zorunlu | Zorunlu | Yalnızca server/CI secret; tarayıcıya verilmez. |
| `NEXT_PUBLIC_SITE_URL` | Opsiyonel | Önerilen | Zorunlu | Auth redirect ve canonical production origin. |
| `ADMIN_SEED_EMAIL` | Opsiyonel/önerilen | Opsiyonel | Kullanılmamalı | Yerel admin seed/promote hedefi. |
| `UPSTASH_REDIS_REST_URL` | Opsiyonel | Önerilen | Önerilen | Paylaşımlı rate limit; yoksa DB fallback kullanılır. |
| `UPSTASH_REDIS_REST_TOKEN` | Opsiyonel | Önerilen | Önerilen | URL ile birlikte tanımlanır. |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | Opsiyonel | Opsiyonel | Opsiyonel | Onay sonrası analytics açma bayrağı. |
| `NEXT_PUBLIC_ANALYTICS_DEBUG` | Opsiyonel | Opsiyonel | Kapalı/opsiyonel | Analytics debug logları. |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Opsiyonel | Opsiyonel | Analytics açıksa zorunlu | Google Analytics measurement ID. |
| `NEXT_PUBLIC_SENTRY_DSN` | Opsiyonel | Önerilen | Önerilen | Yoksa Sentry tamamen no-op olur. |
| `SENTRY_ORG` | Opsiyonel | Source map için önerilen | Source map için önerilen | Sentry organizasyonu. |
| `SENTRY_PROJECT` | Opsiyonel | Source map için önerilen | Source map için önerilen | Sentry projesi. |
| `SENTRY_AUTH_TOKEN` | Opsiyonel | Source map için önerilen | Source map için önerilen | Build secret; public değildir. |
| `SMS_PROVIDER` | `mock` | `mock` veya `netgsm` | İhtiyaca göre `netgsm` | SMS factory seçimi. Mevcut auth OTP Supabase üzerinden devam eder. |
| `NETGSM_USERCODE` | Opsiyonel | `netgsm` ise zorunlu | `netgsm` ise zorunlu | Netgsm server secret. |
| `NETGSM_PASSWORD` | Opsiyonel | `netgsm` ise zorunlu | `netgsm` ise zorunlu | Netgsm server secret. |
| `NETGSM_HEADER` | Opsiyonel | `netgsm` ise zorunlu | `netgsm` ise zorunlu | Onaylı gönderici başlığı. |

## Sentry hata izleme

`@sentry/nextjs`, client/server/edge config dosyaları ve `withSentryConfig`
entegrasyonu kullanılır. `NEXT_PUBLIC_SENTRY_DSN` boşsa SDK `enabled: false`
çalışır ve `errorHandler.ts` hiçbir exception göndermez. DSN varsa
`DatabaseError` ve HTTP 500+ seviyesindeki beklenmeyen `AppError` örnekleri
`captureException` ile raporlanır. Varsayılan PII gönderimi kapalıdır.

## Deploy öncesi preflight

```bash
npm run preflight
```

Komut kritik env envanterini, SMS/Upstash/Sentry tutarlılığını, lint, production
build, statik backend kontrolü ve service-role ile veritabanı sağlık kontrolünü
çalıştırır. Yerel ve bilinçli bir UI-only kontrolde DB adımı
`PREFLIGHT_SKIP_DB=true` ile atlanabilir; CI/CD production kapısında atlanmamalıdır.
# Font build güvenilirliği

Inter fontu `src/fonts/` altında resmî Inter 4.1 WOFF2 dosyalarıyla
self-hosted edilir. `src/app/layout.tsx` içinde `next/font/local` kullanıldığı
için production build sırasında Google Fonts ağına erişim gerekmez.
