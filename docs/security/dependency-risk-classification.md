# Bağımlılık risk sınıflandırması

Tarih: 10 Kasım 2026 · Kaynak: `npm audit` (npm 11, `package-lock.json` main `8ebd8da`).
9 Kasım 2026 denetimindeki "CI npm audit: 16 moderate; high/critical gate geçiyor" bulgusunun kullanım bağlamına göre incelemesi.

Sonuç: 0 critical, 0 high, 16 moderate. 16 kaydın tamamı iki kök uyarıdan türüyor ve hiçbiri canlı istek yolunda çalışmıyor.

## Kök uyarılar

| Paket | Uyarı | Uygulamada nerede çalışıyor |
|---|---|---|
| `glob` | GHSA-3g3m-2fjr-6pw4 — AbortSignal iptali sonrası dosya sistemi taraması | Yalnızca derleme ve geliştirme araçlarında |
| `minimatch` | GHSA-g3hv-75wg-m249 — desen genişletmede hizmet reddi | Yalnızca derleme ve geliştirme araçlarında |

## Etkilenen zincirler

| Zincir | Kayıt sayısı | Ortam | Değerlendirme |
|---|---|---|---|
| `@sentry/nextjs` → `@sentry/webpack-plugin` → `@sentry/bundler-plugins` → `glob` | 4 | Derleme (kaynak haritası yükleme) | Desenler repo içinde sabit; kullanıcı girdisi ulaşmaz. Sentry çalışma zamanı SDK'sı etkilenmiyor. |
| `eslint-config-next` → `typescript-eslint` → `@typescript-eslint/*` → `minimatch` | 7 | Lint (geliştirme, CI) | Yalnızca repo dosyaları üzerinde çalışır. |
| `@storybook/nextjs-vite` → `@storybook/react-vite` → `@joshwooding/vite-plugin-react-docgen-typescript` → `glob` | 3 | Storybook (geliştirme) | Üretim paketine girmez. |
| `eslint-plugin-storybook` → `@typescript-eslint/utils` | 1 | Lint | Yukarıdaki ile aynı. |
| `glob`, `minimatch` (kök) | 2 | — | — |

## Karar

- Kabul edilen risk: düşük. Saldırganın kontrol ettiği desen veya yol bu araçlara ulaşmıyor; canlı sunucu kodu bu paketleri yüklemiyor.
- `npm audit fix` uygulanmadı: önerdiği çözüm `@sentry/nextjs` sürümünü 10.78.0'dan 10.76.1'e düşürüyor. Hata izleme SDK'sını geri almak, derleme zamanındaki orta seviye bir uyarıdan daha büyük risk.
- `npm audit fix --force` uygulanmadı: `eslint-config-next` ve `eslint-plugin-storybook` için ana sürüm düşürür.
- CI kapısı aynı kalır: high veya critical bulgu derlemeyi düşürür (`scripts/run-check.mjs`).

## Yeniden değerlendirme

Aşağıdakilerden biri olduğunda bu belge güncellenir:

- Sentry, typescript-eslint veya Storybook düzeltilmiş `glob`/`minimatch` sürümüyle yayınlandığında (normal sürüm yükseltmesiyle kapanır).
- `npm audit` high veya critical bir kayıt gösterdiğinde.
- Etkilenen paketlerden biri canlı sunucu koduna taşındığında.
