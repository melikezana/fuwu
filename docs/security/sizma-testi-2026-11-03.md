# FUWU Sızma Testi ve Güvenlik Sertleştirme Raporu

**Tarih:** 3 Kasım 2026 · **Kapsam:** fuwu (Next.js 16.4.3, React 19.2.5, Supabase, iyzico sandbox) · **Yöntem:** kaynak kod ve migration incelemesi (beyaz kutu) + yerel üretim derlemesine karşı saldırı senaryoları (siyah kutu). Canlı siteye ve canlı veritabanına saldırı denemesi yapılmadı.

## Özet

| Seviye | Bulgu | Durum |
| --- | --- | --- |
| Orta | Usta telefon/WhatsApp numaraları giriş yapmadan API ile toplanabiliyordu | Kapatıldı |
| Orta | Usta olmayan her hesap herkese açık görsel klasörlerine doğrudan dosya yükleyebiliyordu | Kapatıldı |
| Orta | SMS pompalama (toll fraud): numara kontrolü yalnızca tarayıcıdaydı | Veritabanı kancası eklendi, panelden açılmalı |
| Düşük | Görsel optimize edici tüm `*.supabase.co` projelerinden görsel çekiyordu | Kendi depoyla sınırlandı |
| Düşük | İki cron ucunda anahtar sabit sürede karşılaştırılmıyordu | Düzeltildi |
| Düşük | Hız sınırı, istemcinin uydurduğu X-Forwarded-For başlığına güveniyordu | Vercel başlığı önceliklendi |
| Bilgi | `X-Powered-By: Next.js` başlığı sürüm parmak izi veriyordu | Kapatıldı |

Yerel saldırı paketi: **51 kontrol, 51 başarılı** (düzeltme öncesi 50/51).

## Gerçek vakalardan çıkarılan tehditler

1. **Supabase satır güvenliği (RLS) hataları:** CVE-2025-48757 kapsamında RLS'si eksik yüzlerce uygulamanın verisi anon anahtarla okundu. FUWU'da tüm tablolarda RLS açık; hassas finans kolonları (IBAN, vergi no, iyzico anahtarı) anon/authenticated için zaten kapalıydı. Telefon kolonları açık kalmıştı; kapatıldı.
2. **Next.js / React Server Components açıkları:** React2Shell (CVE-2025-55182), CVE-2026-23864 ve Ekim 2026 görsel optimize edici / `use cache` RCE'leri (16.4.1'de düzeltildi). Kurulu sürümler (16.4.3 / 19.2.5) yamalı; `npm audit --omit=dev` üretim bağımlılıklarında kritik/yüksek açık bulmadı.
3. **Middleware atlatma (CVE-2025-29927):** `x-middleware-subrequest` başlığıyla korumalı sayfalara erişim denendi; tüm denemeler giriş sayfasına yönlendirildi.
4. **SMS pompalama:** Saldırganlar pahalı yurt dışı numaralara doğrulama kodu isteterek SMS faturası şişirir. Kod isteği tarayıcıdan doğrudan Supabase'e gittiği için sitedeki kontrol yeterli değil; sunucu tarafı kanca eklendi.
5. **Ödeme manipülasyonu:** Fiyat sunucuda hesaplanıp siparişte değiştirilemez şekilde saklanıyor, iyzico imzası sabit sürede doğrulanıyor, iade/hak ediş işlemleri tekrar gönderime karşı kilitli (mevcut testler: 28 ödeme kontrolü geçti).

## Yapılan saldırı denemeleri (yerel)

| Alan | Denenen | Sonuç |
| --- | --- | --- |
| Güvenlik başlıkları | CSP (nonce + strict-dynamic), HSTS preload, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy | Geçti |
| Açık yönlendirme | `//evil`, `https://evil`, `/\evil`, `%2F%2F`, sekme karakteri, `javascript:`, Host başlığı zehirleme | Geçti |
| Yetki | 5 korumalı sayfa oturumsuz ve middleware-bypass başlığıyla; 4 özel API oturumsuz | Geçti |
| CSRF | 5 değiştirici API'ye yabancı origin'den POST | 403 |
| Cron | Anahtarsız ve yanlış anahtarla 3 cron ucu | 401 |
| Girdi | 2 MB gövde, SQL enjeksiyon, yol geçişi, bozuk JSON | Reddedildi, iç hata sızmadı |
| Dosya sızıntısı | `.env`, `.env.local`, `.git/config`, `package.json`, `supabase/config.toml` | 404 |
| Hız sınırı | Fiyat ucuna 130 istek | 429 döndü |

Tekrar çalıştırmak için: `npm run build && npm start`, ardından `PENTEST_TARGET=http://localhost:3000 npm run test:pentest`. Betik canlı siteye karşı çalışmayı reddeder.

## Senin yapman gereken panel ayarları (koddan yapılamaz)

1. **SMS kancasını aç:** Supabase › Authentication › Hooks › *Before User Created* → `public.hook_fuwu_before_user_created`. Ardından yabancı bir numarayla (ör. +44…) kod istemeyi dene; reddedilmeli.
2. **CAPTCHA:** Supabase › Authentication › Attack Protection › Cloudflare Turnstile. SMS ve e-posta kod isteklerini botlara kapatır.
3. **Admin hesaplarında iki adımlı doğrulama:** Admin olarak kullanılan Google hesabında 2FA açık olmalı.
4. **Gizli anahtarlar:** `SUPABASE_SERVICE_ROLE_KEY`, `IYZICO_SECRET_KEY`, `CRON_SECRET`, `OPENAI_API_KEY` yalnızca Vercel ortam değişkenlerinde dursun; repoda ve ekran görüntülerinde paylaşılmasın. `CRON_SECRET` en az 32 rastgele karakter olsun.
5. **Bağımlılıklar:** `@sentry/nextjs` derleme eklentilerindeki 5 orta seviye açık yalnızca derleme anında çalışır; bir sonraki bakımda Sentry sürümünü güncelle.

## Kalan riskler

- Canlı Supabase üzerinde RLS davranışı bu çalışmada canlı veriyle test edilmedi; bulgular migration kodundan ve izole PostgreSQL testinden çıkarıldı.
- Gerçek iyzico ve Google OAuth akışları sandbox/mock ile doğrulandı.
