# TÜBİTAK 1. aşama gerekçeleri → eylem planı · 12 Kasım 2026

Kaynak: PRODİS'teki 1. aşama değerlendirme ekranı (puanlar 3,0 / 2,0 / 4,0 / 5,0). Bu belge her gerekçeyi "kodla kapanan", "kanıt gerektiren" ve "kodla kapanmayan" olarak ayırır. Dal: `feat/sorununu-anlat`.

## Gerekçe 1 (3,0) · "Özü klasik bir pazaryeri; yapay zekâ kategori önerisiyle sınırlı, teknolojik doğrulama düzeyi düşük"

| Ne | Durum |
|---|---|
| Yapay zekâ kategori önerisinden ibaret değil: ilk değerlendirme, aciliyet, güvenli adımlar, takip soruları, **ustaya gidecek iş özeti**, hizmet + kapsam + usta paketi karşılaştırması | Kodda (PR #3 ve bu dal) |
| "Sorununu anlat. Çözümü FUWU bulsun." akışı ana sayfada birinci yol | Kodda (bu dal) |
| **Teknolojik doğrulama: ölçüm düzeneği.** `npm run eval:assistant` aynı 74 soruluk kümeyi kural tabanlı yedeğe ve (anahtar varsa) yapay zekâya sorar; kategori doğruluğu, acil durum yakalama ve yanlış alarm sayısını yan yana yazar | Kodda (bu dal) |
| Kural tabanlı taban ölçümü | Ölçüldü: aşağıda |
| Yapay zekâ ölçümü | **Ölçülmedi.** Sağlayıcı anahtarı yok. Anahtar eklenince tek komutla ölçülür |

Taban ölçümü (kural tabanlı yedek, 74 soru):

| | İlk ölçüm | Düzeltmeden sonra |
|---|---|---|
| Kategori doğruluğu | 52/62 (%83,9) | 58/62 (%93,5) |
| Acil durum yakalama | 8/12 (%66,7) | 12/12 (%100) |
| Yanlış acil alarmı | 0 | 0 |

Bu sayılar nasıl okunmalı: küme elle yazılmış sentetik sorulardır, gerçek kullanıcı verisi değildir; düzeltme aynı kümeye bakılarak yapıldığı için ikinci sütun genellenebilir bir başarı oranı değildir. Başvuruda kullanılabilecek asıl kanıt, **gerçek müşteri mesajlarından** oluşan ayrı bir kümede yapay zekâ ile taban arasındaki farktır. İlk ölçümde kaçan dört acil durum ("ocağın oradan doğalgaz kokuyor", "çocuğum odada kilitli kaldı", "kombiden gaz kaçağı", "sigorta kutusu yanıyor") gerçek bir güvenlik açığıydı ve kapatıldı; yapay zekâ kapalıyken canlıda çalışan yol budur.

## Gerekçe 2 (2,0) · "Yerleşik oyunculara karşı belirgin farklılaşma yok; ilk yıl işlem hacmi pilot veriyle desteklenmiyor"

- Farklılaşma anlatısı (kodda karşılığı olanlar): teklif beklemeden kapsamı ve fiyatı belli hizmet; sorunu anlatınca ustaya hazır iş özeti; kapıda doğrulama kodu + müşteri onayıyla iki taraflı güven. Yerleşik Türkiye oyuncusunun modeli teklif toplamadır.
- **Pilot veri kodla üretilemez.** Bugün yayında gerçek usta 0, sipariş 0. Yeniden başvurudan önce gereken en küçük pilot: tek ilçe, tek kategori, 3–5 doğrulanmış usta, ödemesiz (kapıda ödeme ya da ücretsiz deneme) 20–30 tamamlanmış iş. Admin › Yatırımcı Görünümü ve haftalık ölçümler bu sayıları kendiliğinden gösterir.
- İşlem hacmi öngörüsü pilot dönüşüm oranına dayandırılmalı; Yatırımcı Görünümü'ndeki hesaplayıcı varsayım üretir, kanıt üretmez.

## Gerekçe 3 (4,0) · "Ekipte yapay zekâ modeli geliştirme, pazaryeri büyütme ve saha operasyonu deneyimi yok"

Kodla kapanmaz. Seçenekler: bir yapay zekâ / veri danışmanı (üniversiteden akademik danışman bu programlarda kabul görür), saha operasyonu için yarı zamanlı bir usta ilişkileri sorumlusu. Başvuruda "model geliştirme" yerine dürüst çerçeve: FUWU hazır büyük dil modellerini kendi şeması, güvenlik kuralları ve ölçüm düzeneğiyle **uyguluyor ve doğruluyor**; kendi modelini eğitmiyor.

## Gerekçe 4 (5,0) · "Yapay zekâ modülü henüz geliştirilmemiş; gerçek kullanıcı, usta ağı, tamamlanmış işlem verisi yok"

- Yapay zekâ modülü artık kodda ve testli; canlıda çalışması için bir sağlayıcı anahtarı ve modeli gerekir (Vercel ortam değişkenleri). Anahtar yokken kural tabanlı yedek çalışır.
- Gerçek kullanıcı / usta / işlem verisi: Gerekçe 2'deki pilotla aynı iş.

## Yeniden başvurudan önce sıra

1. Yapay zekâ anahtarını ekle, `npm run eval:assistant` çalıştır, sonucu sakla.
2. İlk gerçek ustaları yayına al (PR #2 sonrası admin adımları).
3. Pilotu yürüt; gerçek müşteri mesajlarından (izinle, kişisel veri ayıklanarak) ikinci bir değerlendirme kümesi oluştur ve ölçümü tekrarla.
4. Başvuru metnini bu üç kanıtla yeniden yaz.
