# Doğrudan Satın Alma — Paket + Ekstra + Randevu + Kapıda Ödeme (24 Kasım 2026)

Talep bırakma kaldırıldı. Müşteri hizmeti Migros Hemen / Trendyol mantığıyla doğrudan satın alır:

1. **Paket ve ekstra** — ilçe → paket → isteğe bağlı ekstralar (tek seferlik "Ekle" ya da adet artır/azalt) → usta.
2. **Gün / saat** — ustanın gerçek takviminden boş saat; randevu bu saate göre oluşur.
3. **Adres ve ustaya not** — kayıtlı adres seçilebilir, not en fazla 500 karakter.
4. **Ödeme ve onay** — varsayılan **Kapıda öde** (iş bitince ustaya). "Online kartla öde" yalnızca iyzico açıkken görünür.
5. **Siparişi Onayla** → sipariş anında `CONFIRMED`, ustaya bildirim + (açıksa) SMS, müşteriye "Siparişin alındı" ekranı.

Farkımız: Armut gibi teklif toplamak yok; fiyat baştan belli, sepet sabit, randevu anında.

## Güvenlik ve doğruluk

| Konu | Uygulama |
| --- | --- |
| Fiyat | Sepet yalnızca veritabanında hesaplanır (`commerce_quote_basket`). İstemci aynı hesabı bağımsız yapar (`basketMatches`); tutmazsa onay verilemez. Sipariş anında toplam yeniden hesaplanır, farklıysa `price_changed`. |
| Ekstralar | Hizmete ait ve aktif olmalı; tekrar, adet üstü, bozuk biçim reddedilir (`invalid_addons`). Siparişe ad/fiyat/adet ile anlık kopya olarak yazılır ve değiştirilemez (tetikleyici). |
| Çifte sipariş | `idempotency_key`; aynı istek aynı siparişi döndürür, farklı seçimle `idempotency_conflict`. |
| Takvim kilitleme | Usta satırı `FOR UPDATE`; aynı saate iki sipariş yazılamaz. Kapıda ödemede müşteri başına en fazla 3 açık sipariş, saatte 10 sipariş denemesi. |
| Kart | Kapıda ödemeli siparişte `/api/commerce/checkout` 409 döner; kart akışı ayrı anahtarla (`FUWU_SANDBOX_CHECKOUT_ENABLED`). |
| Acil durdurma | Sunucu: `FUWU_DIRECT_PURCHASE_DISABLED=true`. Veritabanı: `app_settings.pay_at_door_enabled='false'` (deploy gerekmez). |
| Mutabakat | Kapıda ödeme kart işlemi beklemez; mutabakat alarmı üretmez. Müşteri "Ödedim, Hizmeti Onayla" deyince `PAID` + `door_payment_collected_at` bir kez yazılır. |
| FUWU payı | Her siparişte `commission_minor + customer_fee_minor` kayıtlı; usta kazanç ekranında ve admin finans özetinde "Ustalardan alınacak FUWU payı" olarak görünür. |
| SECURITY DEFINER | 3 yeni fonksiyon matriste: `commerce_quote_basket` (public), `commerce_place_order` (session), `commerce_admin_save_addon` (admin, audit). |

## Yönetim

- **Admin → Hizmet Kataloğu**: her hizmetin altında "Ekstralar" — ad, kısa kod, fiyat (TL), en fazla adet, sıra, görünürlük. Kaydetme audit kaydı bırakır; fiyat değişikliği yalnızca yeni siparişleri etkiler.
- 15 hizmet için 38 başlangıç ekstrası tohumlandı (ör. Fırın içi 350 TL, Cam silme/oda 150 TL, Ütü 1 saat 400 TL, Ek taşıyıcı 1.000 TL). Bunlar **varsayılan öneridir**; piyasa fiyatına göre admin panelinden güncellenmeli.

## Kaldırılanlar

"Bölgene Talep Bırak" CTA'ları (ana sayfa, katalog, hizmet sayfası, hesabım, SSS) ve site haritası kaydı. `/waitlist` artık yalnızca daha önce kayıt bırakmış kişiye tercih/geri çekme ekranı gösterir (KVKK), diğerlerini `/services`'e yönlendirir.

## Kanıt

- `npm run typecheck`, `check:lint`, `test:unit` (302), `test:security` (121), `test:mock` (77), `check:build`, `test:http` (20) — geçti.
- `TEST_POSTGRES_BIN=/opt/pgwrap npm run test:integration` — 428 kontrol geçti; temiz kurulum + yükseltme + üretim defteri tekrarında 9 "Direct purchase" veritabanı kontrolü.
- `node scripts/security/pentest.mjs` — 54 kontrol, 0 başarısız.
- `PLAYWRIGHT_CHANNEL=chrome node scripts/verify-direct-purchase-ui.mjs` — 390 px ve 1440 px'te uçtan uca satın alma arayüzü; ekran görüntüleri `artifacts/direct-purchase/`.

## Canlıya alma sırası

1. Üretim veritabanına migrasyonu uygula: `supabase db push` (`20261124000100_direct_purchase_extras_pay_at_door.sql`). Kod migrasyon yokken de çalışır (ekstrasız, eski fiyat fonksiyonu), ama kapıda ödeme migrasyonla açılır.
2. Deploy.
3. Yayımlı gerçek usta + aktif fiyat + takvim olmadan satın alınacak hizmet görünmez; katalog dürüst "takvimler açılıyor" mesajı gösterir.

## Açık riskler (karar sahibine)

- **Mevzuat**: Gerçek sipariş alınmaya başlandığında 6563 sayılı Kanun ve Mesafeli Sözleşmeler Yönetmeliği kapsamında ön bilgilendirme formu, mesafeli sözleşme ve aracı hizmet sağlayıcı bilgileri gerekir. Kullanım şartlarında bu metinlerin ayrıca yayımlanacağı yazıyor; şirketleşme öncesi hukukçuya danışılmalı.
- **Komisyon tahsili**: Kapıda ödemede para ustada kalır; FUWU payı kayıtlıdır ama tahsili şirketleşme ve usta sözleşmesiyle yapılmalı.
- `scripts/verify-direct-commerce.mjs` ve `verify-phase2-checkout.mjs` (CI dışı, eski kart akışı fikstürleri) yeni sepet biçimine güncellenmedi.
