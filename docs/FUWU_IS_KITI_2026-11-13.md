# FUWU İş Kiti · 13 Kasım 2026

Dal: `feat/is-kiti`. Migration yok; üretim veritabanına yazma yok. Renk paleti, servis katmanı ve RLS değişmedi.

## Sorun → çözüm

| Sorun (Türkiye'de ev hizmetinin günlük derdi) | Çözüm | Kim için | Dosya |
|---|---|---|---|
| Usta geliyor, alan hazır değil; ödenen süre eşya kaldırmaya gidiyor, kapıda "bu kapsam dışı" tartışması çıkıyor. | **Usta gelmeden önce** — siparişin türüne göre (tesisat, elektrik, boya…) işaretlenebilir hazırlık listesi ve ilerleme çubuğu. İşaretler yalnızca cihazda tutulur. | Müşteri | `PrepChecklist.tsx` |
| "Malzeme almaya gittim, yarın gelirim": ikinci geliş hem müşteriyi hem ustayı yoruyor. | **Yola çıkmadan** — işe özel "çantana koy" listesi, kapıda sorulacaklar, güvenlik ve kapsam kuralı. | Usta | `ProviderJobKit.tsx` |
| Evde hangi işin ne zaman, kimle yapıldığı unutuluyor; iyi usta kayboluyor. | **Ev Karnesi** — tamamlanan işlerin türe göre geçmişi, ne kadar zaman geçtiği, düzenli bakım işlerinde önerilen sonraki tarih, "aynı ustadan yeniden al". | Müşteri | `HomeLedger.tsx` |
| Usta talebi ancak geldiğinde fark ediyor; sezon başında takvim ve paket hazır değil. | **Mevsim radarı** — müşterilerin ev bakım takviminde gördüğü hatırlatmaların ustanın kategorisine düşenleri, bu ay ve sonraki iki ay. | Usta | `SeasonRadar.tsx` |

Çekirdek mantık saf fonksiyonlarda: `src/lib/jobs/job-kit.ts`, `src/lib/jobs/season-signals.ts`. Tür tanıma önce hizmet adına, sonra pakete, en son kapsam metnine bakar (kapsamdaki "iş sonu kaba temizlik" boya işini temizlik saydırmasın diye).

Bu dört özellik bilinçli olarak yapay zekâ çağırmaz: anahtar olmadan da çalışır, maliyeti sıfırdır ve uydurma içerik üretemez. Yapay zekâ katmanı (asistan, sesle anlatma, iş özeti, usta açıklama taslağı) önceki turlarda eklendi ve aynen duruyor.

## Güvenlik

Oturumlu ama hız sınırı olmayan dört uca kullanıcı bazlı sınır eklendi (Redis yoksa mevcut ilke gereği açık kalır):

| Uç | Sınır |
|---|---|
| `POST /api/provider-documents/upload` | saatte 20 |
| `GET /api/provider-documents/[id]` | dakikada 30 |
| `POST /api/commerce/store/capacity` | dakikada 20 |
| `POST /api/payments/iyzico/checkout` | dakikada 10 |

Cron uçları sabit-zamanlı karşılaştırmalı gizli anahtarla, iyzico webhook imzayla korunuyor; değişiklik gerekmedi.

## Doğrulama

TypeScript, ESLint, build: PASS. Birim testleri 226 → 256 (30 yeni). Güvenlik paketi 99/99 (değişiklik öncesiyle aynı). Yeni kartlar gerçek CSS ile render edilip masaüstü (1280) ve mobil (390) ekran görüntüsüyle kontrol edildi; taşma yok, dokunma alanları 44 px.

Doğrulanamayanlar: kartlar gerçek oturum ve gerçek siparişle tarayıcıda görülmedi (tamamlanmış sipariş gerekiyor). Rehber içerikleri bir tesisatçı ya da elektrikçiyle gözden geçirilmedi.

## Hâlâ sahipte olan adımlar

1. 10 Kasım kaydındaki üç migration üretime uygulanmadıysa: `supabase db push` (`20261110000100`, `20261110000200`, `20261111000100`). Bu dal yeni migration eklemez.
2. Yapay zekâyı açmak için Vercel'de bir sağlayıcının anahtarı + modeli birlikte: `ANTHROPIC_API_KEY` + `ANTHROPIC_MODEL` ya da `OPENAI_API_KEY` + `OPENAI_VISION_MODEL` (OpenAI hesabında bakiye olmalı).
