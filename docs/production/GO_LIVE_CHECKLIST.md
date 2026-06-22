# FUWU Production Go-Live Kontrol Listesi

Tarih: 22 Haziran 2026

## Nihai karar

**❌ NO-GO — henüz production trafiği açılmamalı.**

Yerel sistem ve uçtan uca akış tamamen yeşil. Kalan blokajlar production
erişimi ve production Supabase drift'idir.

## 1. Domain, DNS ve SSL

| Kontrol | Sonuç | Kanıt |
|---|---:|---|
| `fuwu.com.tr` A kaydı | ✅ | `76.76.21.21` |
| `www.fuwu.com.tr` CNAME | ✅ | `cname.vercel-dns.com` |
| Apex → www yönlendirmesi | ✅ | HTTPS 307 |
| `www` ana sayfa | ✅ | HTTPS 200, FUWU içeriği |
| Vercel sunucusu | ✅ | `Server: Vercel` |
| SSL/HSTS | ✅ | `Strict-Transport-Security: max-age=63072000` |
| Beklenen uygulama içeriği | ✅ | FUWU ana sayfası canlı |
| Kesin Vercel project ID eşleşmesi | ❌ | Token/proje bağlantısı yok |

Public sinyaller domainin çalışan bir Vercel deployment'ına ve doğru FUWU
içeriğine gittiğini doğruluyor. Ancak bunun beklenen Vercel project ID'si
olduğu API üzerinden kanıtlanamadı.

## 2. Vercel production environment

`node scripts/check-vercel-env.mjs` sonucu:

```text
Missing VERCEL_TOKEN
```

Bu çalışma ortamında aşağıdakiler yok:

- ❌ `VERCEL_TOKEN`
- ❌ `VERCEL_PROJECT_ID`
- ❌ `VERCEL_ORG_ID` (gerekirse)
- ❌ `.vercel/project.json`

Bu nedenle Vercel projesinde yalnızca isim varlığı kontrolü yapılamadı:

- ❌ `NEXT_PUBLIC_SUPABASE_URL`
- ❌ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ❌ `UPSTASH_REDIS_REST_URL`
- ❌ `UPSTASH_REDIS_REST_TOKEN`
- ⚠️ `NEXT_PUBLIC_SENTRY_DSN` / Sentry değişkenleri

Değerler istenmiyor; yalnız production target için değişken adlarının varlığı
API üzerinden doğrulanmalıdır.

## 3. Production Supabase

Public production Supabase URL'si erişilebilir:

- ✅ Host: `bjhyisomjadirdchruix.supabase.co`
- ✅ Public `service_categories` sorgusu HTTP 200
- ❌ Production aktif kategori sayısı: **8**
- ✅ Local aktif kategori sayısı: **11**
- ❌ Local/production veri-migration sonucu birebir değil.

Eksik görünen katalog localde bulunan son üç genişletmeyle uyumlu değildir;
production migration/seed zinciri güncellenmeden yayın kararı verilmemelidir.

Yetkili kontroller:

- ❌ `SUPABASE_ACCESS_TOKEN` yok.
- ❌ `SUPABASE_DB_PASSWORD` yok.
- ❌ Production `SUPABASE_SERVICE_ROLE_KEY` yok.
- ❌ Supabase CLI oturumu yok:
  `Access token not provided`.
- ❌ `supabase db push` çalıştırılmadı.
- ❌ Production migration history birebir karşılaştırılamadı.
- ❌ Production `backend_health_catalog()` service-role ile çağrılamadı.
- ℹ️ Anon RPC çağrısı HTTP 404 döndü; fonksiyon service-role-only olduğu için bu
  sonuç varlık/yokluk kanıtı değildir.

## 4. Production'a çıkmadan önce zorunlu adımlar

1. Vercel API erişimini sağla:
   `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, gerekiyorsa `VERCEL_ORG_ID`.
2. `node scripts/check-vercel-env.mjs` çalıştır; dört zorunlu env adı PASS olsun.
3. Supabase CLI erişimini sağla:
   `SUPABASE_ACCESS_TOKEN`, DB password ve read-only doğrulama için service role.
4. Production migration history ile localdeki **37 migration**ı karşılaştır.
5. İncelenmiş migration planıyla `supabase db push` uygula.
6. Production katalogda 11 aktif kategoriyi doğrula.
7. Production service-role ile
   `node scripts/check-backend-db.mjs` çalıştır; tüm satırlar PASS olsun.
8. `backend_health_catalog()` JSON çıktısını bu dokümana ekle.
9. Vercel project ID ile `fuwu.com.tr` / `www.fuwu.com.tr` domain bağını API
   üzerinden kesinleştir.
10. Production üzerinde kontrollü test hesaplarıyla kısa smoke test yap ve test
    verisini temizle.

## Go-live kapısı

Yukarıdaki 2–9 numaralı maddeler ✅ olmadan yayın kararı değişmemelidir.

Yerel doğrulama sonucu güçlü biçimde olumlu olsa da, mevcut kanıtla nihai karar:

**❌ Yayına hazır değil — production Supabase drift'i ve yetkili environment
doğrulamaları açık.**
