# FUWU Güvence mimarisi

31 Ekim 2026 · `melikezana/fuwu`. Değişiklikler çalışma ağacındadır; production migration, canlı ödeme, push, deployment veya production veri yazımı yapılmadı.

## Faz 0: gözlenen mevcut durum

Canlı `bjhyisomjadirdchruix` projesi yalnızca SELECT ve security advisor ile incelendi. Kişilerin adı, telefonu, belge içeriği veya nesne yolu indirilmedi. Kanıt: [production-readonly.json](../artifacts/trust/production-readonly.json).

- 10 başvuru; belge yolu 0, eski URL 0, ilgili özel bucket nesnesi 0. Mevcut “Belge yok” kayıtlarının bu denetimdeki nedeni gerçekten yükleme olmaması. Kullanıcıya bağlanmamış başvuru sayısı 8; otomatik bağlama yapılmadı.
- Özel bucket `provider-verification-documents`, `public=false`, 5 MB, PDF/JPEG/PNG. Canlı eski politikalar owner upload/read ve admin read sağlıyor; hazırlanan migration bunları server transfer sınırına taşır. Henüz production politikası değiştirilmedi.
- Canlıda `provider_publication_reviews` ve `order_completion_codes` bulunmuyor. 46 migration sürümü var. Repo ile güncel karşılaştırmada 25 eksik migration var: [schema-comparison.json](../artifacts/backend-reliability/schema-comparison.json). Mevcut aynı isimli `orders` tablosu repo commerce sözleşmesiyle aynı kabul edilmez.
- Bağlı projede development branch yok; ayrı doğrulanmış staging yok. Önceki provider/backend/Marketplace 3 raporları ve şema farkı okundu. Hiçbir eksik migration otomatik uygulanmadı.
- Advisor: 3 mutable search_path fonksiyonu, anonim çağrılabilir 9 ve authenticated çağrılabilir 11 definer bildirimi; her biri otomatik açık kanıtı değildir, actor/ACL incelemesi gerekir. [Supabase remediation](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable). Leaked-password koruması kapalı: [Auth ayarı](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Canlı ayar değiştirilmedi.

## Mevcut panellere entegrasyon

Admin başvuru listesi altı sütundur: ad, meslek, ilçe, başvuru durumu, doğrulama, incele. Belge topluca imzalanmaz. `/admin/provider-applications/[id]` aynı başvurunun dosyasıdır: kimlik/telefon, mesleki/ticari belgeler, son geçerlilik, sürüm/karar gerekçesi, audit geçmişi ve mevcut usta yayın dosyasına geçiş. Başvuru onayı yeni veya var olan ustaya otomatik mesleki doğrulama vermez.

`/admin/verifications` mevcut doğrulama sayfası güvenlik kuyruğuna dönüştürüldü. Kimlik, mesleki inceleme, süresi dolan/reddedilen belgeler, yeniden inceleme isteyen ustalar, şikâyet/güvenlik/no-show/ulaşılamama ve ayrı usta itirazları burada takip edilir. Sahte bir “şüpheli hesap skoru” üretilmez; şüphe güvenlik bildirimiyle insan incelemesine alınır. Kuyruk 100 belge/100 vaka ile sınırlıdır; bunlar sistem toplamı olarak sunulmamalı, yüksek hacim öncesi sayfalama gerekir.

Partner profilinde belge türü ve varsa son geçerlilik tarihi seçilir. Gerekçe ve düzeltme yolu görünür. Bekleyen başvurular da kendi belge dosyasına ulaşabilir. İlk başvuru dört alanlıdır. Hazırlık sayacı gerçek profil/iletişim ve etkin belge gereksinimlerinden hesaplanır. Başvuru, profil, doğrulama, inceleme, yayına hazır, yayında, düzeltme ve askı durumları ayrı anlam taşır.

## Veri ve güven sınırları

Yeni migration: `20261030204829_trust_service_confirmation.sql`, Supabase CLI `migration new` ile oluşturuldu. Eski migration'lar değiştirilmedi. Yeni tablolar: belge türleri, kurallar, doğrulanmış upload makbuzu, belge sürümleri, güvenlik vakaları ve ek iş önerileri. Sipariş ve kod tabloları genişletildi. Tüm yeni public tablolarda RLS açık; metadata GRANT'leri ve RLS ayrı ele alındı. `fuwu_private` yardımcıları browser rollerine kapalı. Public trust RPC'leri auth.uid / DB admin rolü kontrolü, boş search_path ve açık EXECUTE grant/revoke kullanır. User metadata rol kaynağı değildir.

Belge upload sunucuda yeniden kimlik denetimi, hız sınırı, 5 MB sınırı, uzantı/MIME/magic-byte eşleştirmesi yapar. Server-only Storage client dosyayı rastgele owner prefix'ine yazar; SHA-256 makbuzu oluşmadan başvuruya bağlanamaz. Browser'ın özel bucket'a doğrudan SELECT/INSERT yetkisi kaldırılır. Server Action sahipliği tekrar doğrular. Kısa süreli erişim route'u owner/admin yetkisi ve audit commit'inden sonra 60 saniyelik indirme bağlantısı verir; `private, no-store` ve `no-referrer` kullanır. Admin dosyaları istemcide service-role ile çekmez.

Service-role anahtarı bu ortamda yoktur; gerçek upload/download bundan dolayı **BLOCKED**. Hiçbir anahtar eklenmedi veya istemciye açılmadı. Gerçek malware tarama servisi yapılandırılmadı: `scan_status=unavailable`; “temiz” iddiası verilmez. Magic-byte kontrolü malware taraması değildir. Otomatik onay yoktur. Tarayıcıda açılmak yerine indirme önerilir. Şüpheli dosya güvenlik ekibi incelemeden kullanılmamalı.

Audit metadata belge içeriği, görseli, kimlik numarası, imzalı URL veya açık kod içermez. Karar ID/sürüm, aktör, tarih ve gerekçeyi tutar. Erişim kayıtları ayrı `trust.document.access` olaylarıdır. Audit yazılamazsa yeni kod/karar uygulanmaz.

## Saklama ve silme

Tür başına `retention_days` süre dolunca inceleme için yapılandırma alanıdır; kanuni süre olarak ilan edilmez. Başlangıç 365 gün örnek operasyon değeridir; hukuk ve veri envanteri onayı olmadan otomatik silme cron'u yoktur. Önerilen işletim: eşleşmemiş upload'ları kısa aralıkla incele; kullanım amacı biten dosyada yasal saklama/uyuşmazlık engelini değerlendir; onaylı silmede önce dosyayı Storage API ile kaldır, ardından içeriksiz karar/erişim audit'ini ve silme makbuzunu sakla; backup ve dış tarayıcı kopyalarının sürelerini ayrıca yönet. Kullanıcı taleplerini kimliği doğrulanmış destek kaydıyla ele al. Toplu veri silinmedi. Gerçek kişisel belge toplanmadan önce bu süreler, aydınlatma metni, hukuki sebep ve yurtdışı aktarım süreci onaylanmalı. [KVKK veri minimizasyonu rehberi](https://www.kvkk.gov.tr/Icerik/7798/Turkiye-Cumhuriyeti-Kimlik-Numaralarinin-Islenmesi-Hakkinda-Rehber).

## Biyometri ve konum

Zorunlu Face ID / yüz tanıma, yüz şablonu veya biyometrik karşılaştırma eklenmedi. Google OAuth ve telefon doğrulaması korunur. Yüklü Auth SDK passkey API'si içerir; bu, projenin hosted Auth özelliğinin açık veya RP/origin/session kurtarma akışının doğrulanmış olduğu anlamına gelmez. Passkey isteğe bağlı cihaz anahtarıyla giriş için staging'de ayrıca değerlendirilmeli; FUWU'ya yüz/parmak izi verisi göndermek gerekmez. Üçüncü taraf biyometrik hizmet ayrı hukuki değerlendirme ve tasarım onayı olmadan eklenmemeli. [KVKK biyometri rehberi](https://www.kvkk.gov.tr/Icerik/7047/Biyometrik-Verilerin-Islenmesinde-Dikkat-Edilmesi-Gereken-Hususlara-Iliskin-Rehber).

Yeni akış GPS istemez; konumsuz kapı kodu ve destek çalışır. Gelecekte konum eklenecekse randevu amacı, açık izin, süre sonu ve veri minimizasyonu gerekir. PWA'nın arka plan konum kabiliyeti native uygulama gibi kabul edilmez; canlı rota veya hesaplanmamış ETA gösterilmez.

Eski tracking modülünün ilçe adına göre ürettiği 20–55 dakika aralıkları kaldırıldı. İlgili müşteri/usta/admin ekranları saklı eski ETA metnini de canlı takip sonucu olarak göstermez; varışın ustayla teyit edilmesini söyler. Şüpheli public profil, sipariş olmadan da kimliği doğrulanmış kullanıcı tarafından bildirilebilir; mevcut güvenlik vakası tablosuna kaydolur. Bu bildirim otomatik suçlama veya otomatik askıya alma değildir. Eski ödeme onayının browser INSERT/UPDATE ile `confirmed` yapılması yeni DB trigger'ıyla kapalıdır; service-role processor mutabakatı korunur.

## Release sırası

Production şema farkı insan tarafından çözülür; sonra gerçek Supabase staging'e bağımlı migration zinciri uygulanır, Auth/Storage/RLS/Google ve uçtan uca kabul tekrarlanır. Bu yerel patch'i yalnız yeni SQL'i production'a çalıştırarak yayınlamak güvenli değildir. Geri dönüşte mevcut veri/audit tablolarını DROP etmek yerine uygulama sürümü geri alınmalı ve ödeme kapalı tutulmalı. Production migration ve deployment için kullanıcıdan ayrıca somut diff/kanıt üzerinden onay alınmalıdır.
