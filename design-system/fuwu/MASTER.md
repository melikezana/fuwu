# FUWU tasarım sistemi

## Ürün

Gerçek hizmet, doğru usta, net kapsam ve güvenli satın alma. Kategori → hizmet/usta → gün ve saat → adres → sipariş özeti → ödeme → takip.

## Görsel temel

- Beyaz zemin `#FFFFFF`, açık gri yüzey `#F6F7F9`, ana metin `#182230`, ikincil metin `#626B78`.
- FUWU turuncusu `#FF6500`; turuncu düğmede koyu yazı. Küçük turuncu metinde daha koyu `#A94300`.
- Yerel Inter: gövde 400/500, başlık 700/800. Gövde mobilde 14–16px, formlarda 16px. Etiketler 11–13px; yalnızca ikincil içerik.
- Kontrol radius 12px; kart 18px; panel 20px. 4/8px ritmi. Gölgeler hafif; dekoratif hareket yok.
- Lucide ikonları. Fotoğraflar `public/images/services` altında WebP; stok görüntüler gerçek usta kimliği veya iş portföyü olarak sunulmaz.

## Bileşenler

| Amaç | Kaynak |
| --- | --- |
| Düğme varyantları | `src/components/ui/Button.tsx` |
| Panel, boş durum, metrik, badge | `src/components/ui/Premium.tsx` |
| Mobil modal / odak yönetimi | `src/components/ui/dialog.tsx` |
| Usta kartı / doğrulama / favori | `src/components/providers/` |
| Hizmet kartı / randevu / sipariş | `src/components/commerce/` |
| Renk, radius, responsive düzen | `src/styles/premium.css` (legacy katmanlarından sonra) |

## Etkileşim

En az 44px dokunma hedefi; görünür klavye odağı; seçili durumlarda metin ve `aria-pressed/aria-current`; form alanlarında kalıcı etiket. Mobil filtreler odak yöneten modal; panel menüleri yatay ray/açılır menü. Alt aksiyonlar alt navigasyon, klavye ve safe-area payını korur. Hızlı günler Türkiye saatine göre üretilir. Yükleme, boş veri ve bağlantı hatası ayrı durumlardır.

## Dil ve doğruluk

“Hizmet Satın Al”, “Randevu Planla”, “Ustayı İncele”, “Gün ve Saat Seç”, “Güvenli Ödeme”. Fiyat yoksa satış varmış gibi gösterme. Uydurma usta, yorum, puan ve müsaitlik üretme. Mevcut siparişler ile geçmiş `service_requests` kayıtlarının durumları ve finansal anlamları karıştırılmaz. Ödeme ortamı, sipariş özetinde ve ödeme ekranında açıkça belirtilir.
