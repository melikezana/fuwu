# Phase 3 migration ve geri dönüş planı

Bu çalışma production veritabanına uygulanmadı. Kaynak değişikliği onayı, production migration onayı değildir.

## Sıra ve ön koşullar

Gerçek migration ledger'ı ve yedek staging'de incelenmeli. Mevcut eski şemanın tüm migration'ları, özellikle profil/rol/RLS ve iyzico alanları hazır olmalı. Ardından sırasıyla:

1. `20261021000100_direct_service_commerce.sql`: sipariş, rezervasyon, ödeme, teslim kodu ve commerce RPC'leri.
2. `20261022000100_fusion_operations.sql`: adresler, finans, mutabakat ve audit altyapısı.
3. `20261022000200_fusion_quality_and_reviews.sql`: kaynak bazlı yorumlar, eski yorumların korunması, gerçek puan özeti.
4. `20261026000100_customer_favorites.sql`: müşteri favorileri; mevcut panel bağımlılığı.
5. `20261026000200_phase3_operations.sql`: usta paket sahipliği, mağaza bütünlüğü, teslim kodu kontrolü, sağlık kanıtları, mağaza audit kayıtları.
6. `20261026000300_provider_financial_privacy.sql`: finansal kolonlara genel erişimin kapatılması; sahip/admin için dar RPC. Güncellenen panel ve onboarding kaynağıyla birlikte yayınlanmalı.
7. `20261026000400_review_submission_receipts.sql`: moderasyonla yorum silinse bile aynı hizmetin tekrar değerlendirilememesi.

Şema sözleşmesi sağlık kontrolü ancak bütün set hazır olduğunda anlamlıdır. Yeni RPC'lerin varlığı tek başına migration ledger uyumu veya gerçek ödeme testi sayılmaz. Yerel SQL testleri minimal geçmiş şema fixture'ı üzerinde çalışır; gerçek staging'in eski policy/trigger/grant birleşimi ayrıca kontrol edilmelidir.

## Staging doğrulaması

- Kayıp olmadan eski yorum ID/metin/puanlarının, sipariş tutarlarının ve payment kimliklerinin korunması.
- Misafir, müşteri A/B, usta A/B, onay bekleyen usta, admin ve service principal ile RLS/kolon yetkileri.
- Yorum sipariş başına bir kez; farklı tamamlanan hizmet için yeni hak; moderasyon sonrası hak tekrar açılmaz.
- Ödeme sonucu sunucudan doğrulanır; yanlış teslim kodu, eksik kod kaydı, eksik doğrulanmış tahsilat ve başka ustanın durumu değiştirmesi reddedilir.
- %10 başlangıç komisyonu ve kuruş tutarları; GMV, komisyon, iade ve hak ediş farklı ölçümlerdir.
- İyzico sandbox gerçek alt üye, callback, başarısız/başarılı/geç ödeme, iade ve hak ediş onayı. Anahtarlar yalnızca sunucuda.
- Google sağlayıcı ayarı yanında gerçek müşteri/usta/admin girişleri; pending/approved usta; refresh, logout, süresi dolmuş session, checkout'a dönüş; fiziksel Chrome/Safari.
- Yetkili cron ve sağlık kayıtları. Sağlık kontrolü anahtar varlığını başarı olarak sunmamalı.
- İşlem ve audit kayıtlarında ödeme anahtarı/token, IBAN/TCKN/adres değeri bulunmaması.

## Geri dönüş

Kod geri dönüşü önceliklidir. Yeni satış/finans işlemlerini durdurup salt okunur takibi koruyun; işlemdeki ödeme/iade/hak edişleri kuruluşla mutabakata alın. `IN_FLIGHT` işlemleri yeniden göndermeyin.

Yeni tabloları, yorum kaynak kolonlarını, hak kullanım kayıtlarını, ödeme kimliklerini ve audit kanıtlarını silmeyin. Finansal kolonlara genel SELECT iznini yeniden açmayın. Eski, geniş `SELECT *` kullanan kodu eski izinlerle yayınlamak güvenli geri dönüş değildir; dar RPC ile uyumlu son güvenli sürümü kullanın.

İkinci yorum veya ustaya özel paket üretildiyse eski müşteri–usta unique sınırını / eski service-name unique sınırını geri getirmeyin; mevcut veri bu sınırları ihlal edebilir. Yeni paket ve review receipt kayıtları korunmalıdır. Gerekirse bağımlı yazma RPC'lerini geçici kapatıp ileri yönlü düzeltme migration'ı hazırlayın.

Her DDL geri dönüşü staging yedeğinde prova ve ayrıca production onayı gerektirir. Bu nedenle otomatik destructive down migration sağlanmadı. Restore ihtiyacında alınmış yedek ve ödeme kuruluşu işlem kimlikleriyle mutabakat esas alınmalıdır.
