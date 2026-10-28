# FUWU 3.0 — Çift taraflı komisyon

28 Ekim 2026. Uygulanan model sandbox içindir. Canlı tahsilat etkinleştirilmedi.

## Hesaplama ve snapshot

Para alanları integer kuruştur. Oranlar basis point olarak saklanır: 100 bps = %1. Yönetici formu yüzdelik değer alır; `1` her zaman %1'dir. Varsayılan usta komisyonu %10, müşteri platform ücreti **%0**. Negatif, %100 üzeri, bilimsel gösterim, boş ve ikiden fazla ondalıklı oranlar reddedilir. Yarım kuruş yukarı yuvarlanır; platform ve usta payı hizmet bedeline eşit kalır.

| Alan | Formül | 2.000 TL / %10 / %5 örneği |
| --- | --- | --- |
| Hizmet bedeli | `service_price_minor` | 2.000 TL |
| Usta komisyonu | `round(service × provider_bps / 10000)` | 200 TL |
| Müşteri ücreti | `round(service × customer_bps / 10000)` | 100 TL |
| Müşteri toplamı | hizmet + müşteri ücreti | 2.100 TL |
| Usta brüt hak edişi | hizmet − usta komisyonu | 1.800 TL |
| Brüt platform geliri | usta komisyonu + müşteri ücreti | 300 TL |

Örnek tutarlar vergi ve işlem maliyetinin ayrıca muhasebeleştirilmesini gerektirir; net gelir veya net banka ödemesi değildir.

`commerce_quote` fiyatı aktif offering ve sunucu ayarından hesaplar. `commerce_hold_order_priced` provider kilidini alır; slotu ve fiyatı yeniden doğrular. İstemcinin beklediği hizmet/toplam tutarı değişmişse sipariş oluşturmaz. Ücretli sipariş için işaretlenmemiş ayrı onay kutusu, sunucuda `fee_consent_at` ve `fuwu-fees-v1` kaydı gerekir. Fiyat doğrulanamazsa ödeme kapalıdır. Oran değişikliği fiyatı yeniler ve istemci onayını temizler.

Yeni sipariş hizmet bedeli, müşteri ücreti, uygulanan iki oran ve toplamı saklar. Eski satırlara yeniden hesaplama/backfill yapılmaz; yeni alanlar geçmişte `NULL` kalır. Eski ekran tutarları mevcut snapshot'tan okunur. İstemci/usta/admin doğrudan fiyat değiştiremez; trigger snapshot değişimini engeller. Aynı idempotency anahtarı aynı siparişi döndürür, süreyi uzatmaz. Eski checkout istemcisi, ek ücreti göstermediği durumda ücretli sipariş oluşturamaz.

Kategoriye özel gelecekteki oranlar için `provider_commission_bps` / `customer_fee_bps` nullable alanları var. NULL, genel ayarı kullanır. Bu alanların değişimi de audit log'a girer; kategori bazlı oran düzenleyici UI bu sürümde yoktur.

Kupon/indirim henüz uygulanmadı. Şu an matrah doğrudan ustanın hizmet bedelidir. İstemci indirim veya sonradan ek ücret belirleyemez. İndirim eklenecekse hizmete mi platform ücretine mi uygulanacağı, vergi ve iade matrahı ayrı sürümlü tasarımla onaylanmalıdır.

## iyzico tasarımı ve sınırı

Mevcut tek kırılımlı Marketplace yapısı korundu: `price = paidPrice = customerTotal`, tek basket item tutarı `customerTotal`, `subMerchantPrice = providerGrossPayout`. Böylece 2.100 TL tahsilat, 1.800 TL alt üye payı ve işlem masrafı/vergi öncesi 300 TL platform payı aritmetik olarak tutarlıdır. Callback sepet kimliği, para birimi, tam tutar, alt üye kimliği, alt üye payı ve işlem kimliğini doğrular. Kart verisi uygulamaya alınmaz.

[iyzico Marketplace belgesi](https://docs.iyzico.com/urunler/pazaryeri/pazaryeri-entegrasyonu/pazaryeri-odemesi) kırılım tutarları toplamının sepet fiyatına eşit olmasını ve her kırılımda alt üye alanlarını tanımlar. Bu teknik uyum, FUWU'nun ayrı müşteri bedelini mevcut sözleşmesiyle tahsil etmeye yetkili olduğunu kanıtlamaz. Ayrı platform hizmeti için ayrı kırılım/alt üye/fatura gerekip gerekmediği iyzico ile yazılı doğrulanmalıdır. `LISTING` modeline otomatik geçilmedi.

`assertSandbox` tüm ortak iyzico istemcisinde canlı endpoint'i reddeder; yalnızca sandbox hosted checkout adreslerine yönlendirme yapılabilir. API anahtarı ve secret yerel ortamda **yok**; gerçek iyzico init, kartlı ödeme, callback ve dış mutabakat testi yapılamadı. Mock HTTP testleri gerçek sandbox entegrasyonu olarak sunulmaz.

## İade, maliyet ve hukuki doğrulama

Bu sürümde yalnızca **tam iade** var. Tam müşteri tutarı, platform ücreti dahil, kuruluşta doğrulanır. Zaman aşımı/kararsız sonuçta iade tamamlandı denmez. Kısmi iade ve platform ücreti tutma kuralı yoktur. Tamamlanmış hizmetin iadesi mevcut destek/uyuşmazlık ve admin akışından geçer.

`processor_fee_minor` kuruluşun bildirdiği masraftır. Yeni `provider_processor_fee_minor` sözleşmeyle ustaya yansıtılan doğrulanmış kesinti için ayrıdır; NULL bilinmiyor demektir. Kuruluş masrafı doğrudan ustadan düşülmez. Vergi/fatura defteri ve masrafın hangi tarafa ait olacağı doğrulanmadığından net katkı marjı hesaplanmaz. Bu muhasebe eksikleri canlı satış engelidir.

[Ticaret Bakanlığı Mesafeli Sözleşmeler Yönetmeliği metni](https://tuketici.ticaret.gov.tr/data/5e819a8e13b876a1b04c7a4a/Mesafeli%20S%C3%B6zle%C5%9Fmeler%20Y%C3%B6netmeli%C4%9Fi.pdf) ek ödeme onayı ve bilgilendirme hükümleri için incelendi. Uygulamadaki onay kaydı mevzuata bütünüyle uyum onayı değildir. Güncel uygulanabilir metin, cayma/erken ifa onayı, kalıcı veri saklayıcısıyla sözleşme teslimi, saklama süresi, KDV, belge düzeni, olası stopaj ve iyzico sözleşmesi uzmanlarla doğrulanmalıdır. Kullanım Şartları sayfası sandbox işleyişiyle eşleştirildi; canlı hukuki paket yerine geçmez.

## Kaynaklar ve test

Değişen ana kaynaklar: `src/lib/commerce/{pricing,types,finance,payment,display}.ts`, `src/app/api/commerce/{quote,orders}/route.ts`, `src/components/commerce/{ServiceBooking,OrderView,ProviderCommerceSummary,ProviderStore}.tsx`, `src/services/admin/settings.ts`, `src/app/admin/settings/*`, `src/components/admin/MarketplaceMetrics.tsx`, yeni migration.

- [87 gerçek yerel PostgreSQL kontrolü](../artifacts/fuwu3/upgrade/database-tests.json): %0/%1/%5, yanlış toplam/onay, immutable snapshot, tam iade, kategori oranı, rol, audit, yarış ve eski siparişlerin korunması.
- [Birim testleri](../artifacts/fuwu3/unit-tests.json): kuruş yuvarlaması, oran ayrıştırma, 2.100/1.800 TL callback eşleştirmesi; sentetik kuruluş yanıtı.
- [28 ödeme protokolü testi](../artifacts/fuwu3/payment-tests.json): mock HTTP/HMAC/tutar/host kontrolleri. Gerçek dış işlem yok.
- [13 arayüz kontrolü](../artifacts/fuwu3/fixture-checkout/browser-tests.json): ayrıca onay, toplam, ücret değişikliği, bağlantı hatası, taslak ve OAuth dönüşü. API ve OAuth gezinmesi fixture'dır.
- [Ücretli özet — 390px, TEST](../artifacts/fuwu3/fixture-checkout/customer-fee-consent-390-FIXTURE.png). Önceki sıfır ek ücretli canlı katalog [önceki ekran kaydında](../artifacts/fuwu3/before/live-services-390.png); canlıda gerçek checkout şeması bulunmadığından gerçek bir “önceki ücretli ödeme” ekranı üretilemez.
