# FUWU Yayın Öncesi Akış Doğrulaması

Tarih: 21 Haziran 2026

## Karar

**Yayın kararı: ❌ Henüz hazır değil.**

Kod, build ve misafir form koruma akışları doğrulandı. Ancak bu çalışma
ortamında Docker/local Supabase bulunmadığı, bağlı uzak Supabase için
service-role anahtarı olmadığı ve test kullanıcıları sağlanmadığı için müşteri,
usta ve admin rollerini kapsayan gerçek A/B/C veri akışları tamamlanamadı.

## Senaryo A — Müşteri talep akışı

- ✅ `/request` formu girişsiz kullanıcıya açılıyor.
- ✅ Geçerli form gönderiminde `auth-required` sonucu yapısal kodla yakalanıyor.
- ✅ Form `fuwu:pending-request-form` anahtarıyla `sessionStorage` içine yazılıyor.
- ✅ Kullanıcı `/login?next=/request&restore=1` adresine yönlendiriliyor.
- ✅ Playwright: misafir talep formu yönlendirme ve saklama testi geçti.
- ✅ Standart ve acil talep servisleri artık gerçek
  `matchAndNotifyEligibleProviders` sonucunu kullanıyor.
- ✅ Sıfır eşleşmede dürüst admin değerlendirme mesajı dönüyor.
- ❌ Temiz local kullanıcıyla gerçek `service_requests` insert, tekrar talep
  engeli, acil fiyat/ödeme ve SQL bildirim doğrulaması çalıştırılamadı.

## Senaryo B — Usta ağına katılma

- ✅ `/provider-application` formu girişsiz kullanıcıya açılıyor.
- ✅ Metin alanları `fuwu:pending-provider-application` anahtarıyla korunuyor.
- ✅ Dosya nesneleri ve yükleme yolları `sessionStorage` içine yazılmıyor.
- ✅ Dosya seçilmişse dönüşte tekrar seçilmesi gerektiğini bildiren mesaj var.
- ✅ Playwright: misafir başvuru formu yönlendirme ve hassas dosya alanlarını
  saklamama testi geçti.
- ✅ Onaylı provider için servis seviyesinde ikinci başvuru engeli eklendi.
- ❌ Gerçek belge yükleme, signed URL, admin onayı ve provider kaydı oluşumu
  local Supabase/test admin hesabı olmadığı için çalıştırılamadı.

## Senaryo C — Admin atama ve usta kabul/red

- ✅ Mevcut `assignAdminServiceRequest`,
  `respondToProviderAssignedRequest` ve müşteri durum ekranı kodları build/lint
  kontrolünden geçti.
- ❌ Admin atama → usta kabul → müşteri hesabı durum güncellemesi gerçek roller
  ve yazılabilir test veritabanı olmadan uçtan uca çalıştırılamadı.

## Bulunan ve düzeltilen hatalar

1. Uygun usta sayısı hesaplanıyor ancak ustalara bildirim yazılmıyordu.
   Gerçek provider sorgusu ve provider başına notification insert eklendi.
2. Eski acil eşleştirme başka ilçedeki aynı kategori ustalarını da sayıyordu.
   Eşleşme kategori + aynı ilçe + aktif + onaylı şartlarına sıkılaştırıldı.
3. Sıfır eşleşmede iyimser “ustalara gönderildi” metni vardı. Dürüst admin
   değerlendirme mesajıyla değiştirildi.
4. NotificationBell eşleşme bildirimini yalnızca okundu işaretliyordu.
   `new_service_request_match` tıklaması provider talepleri ekranına yönleniyor.
5. Form action sonuçlarında auth hatası için yapısal sinyal yoktu.
   `auth-required | validation | rate-limit | server` kodları eklendi.
6. Misafir kullanıcılar formları dolduramadan login kartında kalıyordu.
   Formlar misafire açıldı; gönderimde koru-login ol-devam et akışı eklendi.
7. Onaylı provider servis çağrısıyla ikinci başvuru yapabiliyordu.
   `providers` tablosu üzerinden servis seviyesi engel eklendi.
8. E2E helper, ilçe alanını eski `<select>` yapısıyla arıyordu ve standart
   talepte aciliyet seçmiyordu. Test yardımcıları güncellendi.
9. Google Fonts build ağına bağımlıydı. Inter 4.1 statik WOFF2 dosyaları
   self-hosted hale getirildi.

## Çalıştırılan kanıtlar

- ✅ `npm run lint`
- ✅ `npm run check:backend`
- ✅ `npm run build`
- ✅ Geçersiz HTTP/HTTPS proxy ile izole `npm run build`
- ✅ Playwright misafir `/request` koruma/yönlendirme testi
- ✅ Playwright misafir `/provider-application` koruma/yönlendirme testi
- ❌ `npm run test:provider-matching`: güvenlik kontrolü uzak Supabase seed
  işlemini reddetti; local Supabase ve service-role gerekli.

## Tam doğrulama için gerekenler

1. Docker Desktop veya ayrı bir local Supabase test projesi.
2. Local `SUPABASE_SERVICE_ROLE_KEY`.
3. Müşteri, provider ve admin test kullanıcıları.
4. Migration ve seed sonrası `npm run test:provider-matching`.
5. A/B/C tarayıcı akışlarının tekrar çalıştırılması.
