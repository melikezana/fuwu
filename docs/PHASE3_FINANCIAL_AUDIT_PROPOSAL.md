# Finansal değişikliklerin atomik audit kaydı — ek onay kapsamı

Mevcut onboarding akışı uygulama katmanından audit kaydı yazıyor; bu kayıt yazımı finansal alan güncellemesiyle aynı veritabanı transaction'ında değil. Uygulama audit yazımı başarısız olursa değişiklik için eksik kanıt riski bulunur.

Önerilen kesin değişiklik: `providers` tablosundaki IBAN/vergi/yasal kimlik/iyzico hesap alanları değiştiğinde aynı transaction içinde `audit_logs` kaydı oluşturan bir AFTER UPDATE trigger'ı. Kayda yalnızca provider ID, değişen kolon isimleri ve actor context yazılacak; IBAN, TCKN, adres, ödeme token'ı, alt üye anahtarı ve conversation değeri yazılmayacak. Sunucu işlemi için actor bilinmiyorsa kullanıcı tahmin edilmeyecek.

Bu çalışma yalnızca migration kaynak dosyası ve izole yerel testtir; production uygulaması, deploy, commit veya push değildir. Otomatik onay incelemesi bu ek kalıcı trigger yan etkisini ilk onayın kapsamı dışında değerlendirdi. Henüz uygulanmadı; bu ek trigger için ayrı kullanıcı onayı bekleniyor.
