# Phase 3 — Onaylanan finansal veri erişimi düzeltmesi

Tespit: `providers` tablosundaki genel SELECT izni ve herkese açık profil RLS politikası, satır içindeki IBAN/vergi kimliği/iyzico alt üye alanlarını kolon düzeyinde ayırmıyor. Arayüzün bu alanları göstermemesi doğrudan API erişimini engellemez. Gerçek kişisel veri okunmadı; tespit repository şema ve grant incelemesine dayanıyor.

İkinci tespit: `provider-dashboard/payment-info/actions.ts` ödeme kuruluşu durumunu ve alt üye anahtarını kullanıcının cookie istemcisiyle yazıyor. Mevcut `fusion_protect_provider_fields` trigger'ı bu yazıları engeller. Dolayısıyla mevcut onboarding akışı ayrıca staging üzerinde düzeltilip test edilmelidir.

Önerilen kesin kapsam:

1. Yeni, yalnızca kaynak dosyası olarak hazırlanacak migration ile genel provider SELECT iznini açık profil kolonlarıyla sınırlandırmak. IBAN, vergi kimliği/ofisi, yasal ad, ödeme adresi, iyzico alt üye anahtarı ve conversation kimliğini genel okuma dışında tutmak.
2. Yalnızca ilgili usta ve admin'in kendi finansal kimlik bilgilerini okuyabildiği dar bir RPC eklemek; ödeme kuruluşu anahtarını RPC çıktısına dahil etmemek.
3. Usta panelinin özel bilgileri bu RPC'den okuması. Finansal alanların doğrudan kullanıcı güncellemelerini kapatmak.
4. Mevcut onboarding server action'ında oturum ve usta sahipliği doğrulandıktan sonra yalnızca o ustanın ödeme bilgileri için sunucu yetkili istemcisini kullanmak. İstekten alınan başka bir provider id'sine güvenmemek.
5. Misafir, müşteri, başka usta, ilgili usta ve admin ile izole PostgreSQL testleri; profil ve onboarding regresyonları.

Bu onay production veritabanında migration çalıştırma, deployment, commit veya push izni değildir. Kaynak dosyası değişikliği ve izole yerel testlerle sınırlıdır. Geri dönüşte özel alanlara genel erişim tekrar açılmamalı; sorunlu onboarding geçici kapalı tutulmalıdır.

Kullanıcı 26 Ekim 2026 tarihinde kaynak düzeltmesini ve yerel testleri açıkça onayladı. Production uygulaması onaylanmadı.

İlk otomatik onay incelemesi bu değişikliği kolon yetkileri ve hassas finansal veri için service-role yazma sınırını değiştirdiği gerekçesiyle durdurdu. Kullanıcı onayı sonrasında kaynak düzeltmesi hazırlandı; izole SQL testleri geçti. Gerçek onboarding entegrasyonu staging testi bekliyor.
