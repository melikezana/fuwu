# FUWU belge doğrulama matrisi

Tarih: 31 Ekim 2026, Europe/Istanbul. Araştırma ve canlı salt okunur denetim 30 Ekim gecesi başladı. Bu belge hukuki onay kaydı değildir. Eklenen araştırma kuralları **taslak ve kapalıdır**.

## Aşamalar

| Aşama | Veri / kanıt | Uygulama |
| --- | --- | --- |
| İlk başvuru | Ad soyad, SMS ile doğrulanmış telefon, kategori, ilçe | Dört temel alan; telefon Auth `phone_confirmed_at` ve aynı numarayla sunucuda ve INSERT trigger'ında doğrulanır. Dosya zorunlu değildir. |
| Kimlik ve iletişim | Gerektiğinde asgari kimlik kanıtı; Auth telefon doğrulaması | Kimlik fotoğrafı ilk formda istenmez. Yüklemek doğrulanmak değildir. Kimlik ve telefon ayrı durumlardır. |
| Yayın öncesi meslek | İlgili alt meslekte kabul edilen MYK / ustalık / diploma veya eşdeğer kanıt | Etkin, hukuken incelenmiş ve yürürlükteki kategori/usta kuralları uygulanır. |
| Ticari statü | Tacir/esnaf veya bireysel statüye uygun işletme kanıtları | `business` türü; faaliyete ve kişinin statüsüne göre insan incelemesi. Her bireyden vergi levhası istenmez. |
| Satış / ödeme | Ödeme kuruluşunun sözleşmeye dayalı KYC gereksinimleri | `payment` aşaması ayrı; satış kapalı. IBAN veya kimlik numarası ilk başvuruda toplanmaz. Bu aşama canlı kabulden önce ayrıca doğrulanmalı. |

## Kategori ve kaynaklar

| Faaliyet | İnceleme kararı | Kaynak / sınır |
| --- | --- | --- |
| Elektrik | İşin alt mesleğini ve yetki kapsamını belirle; uygun MYK, ustalık veya diploma/eşdeğerini değerlendir. Her elektrik işi için tek bir belge listesi varsayma. | MYK, zorunluluğu tebliğdeki mesleğe bağlar; ilgili dalın ustalık/diploma muafiyetlerini açıklar. [MYK çalışan/işveren SSS](https://www.myk.gov.tr/tr/page/135), [muafiyet açıklaması](https://www.myk.gov.tr/tr/haberler/yeterlilik/belge-zorunluluuna-ilikin-skca-sorulan-sorular). |
| Beyaz eşya / teknik servis | Teknik yeterlilik ve “yetkili servis” iddiası farklı kanıtlardır. Yetki iddiası üretici/ithalatçı yetkilendirmesi ve SERBİS üzerinden ayrıca kontrol edilmeli. | Bakanlık yetkili servis bilgilerini ayrı tanımlar. [Satış sonrası hizmet bilgilendirmesi](https://tuketici.ticaret.gov.tr/yayinlar/tuketici-bilgi-rehberi/satis-sonrasi-hizmetler-hakkinda-bilgilendirme), [SERBİS](https://tuketici.ticaret.gov.tr/haberler/servis-bilgi-sistemi-serbis-kullanima-acildi). |
| Tesisat, boya, montaj, tadilat | Geniş kategori adı yeterli değildir. Gerçek işin alt mesleğini, tebliğ kapsamını, kabul edilen eşdeğerleri ve muafiyetleri gerekçeli kaydet. | [MYK](https://www.myk.gov.tr/tr/page/135). Kişiye özgü kural `provider_id` ile atanabilir; aynı kapsam herkese otomatik uygulanmaz. |
| Temizlik / halı yıkama | Keyfî sertifika zorunluluğu yok. İşletme ve hijyen koşullarını gerçek faaliyet üzerinden değerlendir. | [Sağlık Bakanlığı yayımlı Hijyen Eğitimi Yönetmeliği](https://uzunkoprusm.saglik.gov.tr/TR-38602/hijyen-egitimi-yonetmeligi.html) belirli faaliyetleri sayar. Bunun bütün ev temizliği / halı yıkama işlerine otomatik belge yükümlülüğü doğurduğu sonucu çıkarılmadı. Güncel konsolide mevzuat ve yerel kapsam hukuk incelemesinde doğrulanmalı. |

Kaynak sayfalardaki örnek ceza tutarları veya eski tarihli parasal eşikler koda taşınmadı. Araştırma tarihi `effective_date` için hukuki yürürlük tarihi değildir. Taslakların tarihleri araştırma yer tutucusudur; admin etkinleştirmeden önce gerçek yürürlük tarihini ve sürümünü girmelidir.

## Yönetim ve durumlar

`provider_document_types`: ad, amaç, değerlendirme/saklama süresi, kullanılabilirlik. Admin ekrandaki formdan tür ekler veya adını/süresini günceller. Mevcut türün amacı sessizce değiştirilemez; başka amaç için yeni tür açılır.

`provider_document_rules`: kategori, isteğe bağlı tek usta, aşama, kapsam/eşdeğerler, `regulatory_rule_version`, resmî `source_url`, `effective_date`, `reviewed_at`, `reviewed_by`, hukuki durum, gereklilik ve etkinlik. Kod değiştirmeden düzenlenir. Kaynak için HTTPS `gov.tr` alanı gerekir. Taslak etkinleştirmek DB constraint'iyle reddedilir. İlk başvuru aşamasında dosya zorunluluğu açılamaz. Ödeme aşaması satış açılmadan uygulanabilir kabul edilmez.

Durumlar: **Yüklenmedi · Yüklendi · İncelemede · Onaylandı · Yeniden Yükle · Reddedildi · Teknik Hata**. Dosyanın süresi dolunca “Yeniden Yükle”; nesne eksikse “Teknik Hata”. Yanlış kategori, süresi dolmuş, eski sürüm veya dosyası eksik kanıt onaya uygun değildir. Onay/ret/yeniden yükleme kararında yetkili, zaman, gerekçe ve sürüm aynı transaction'da audit'e yazılır. Yeni yükleme ilgili türün eski sürümlerini geçersiz kılar; kimlik ve yeterlilik ayrı tutulur.

Eski `verification_document_path` / `verification_document_url` kayıtları kimlik kanıtı sayılmaz. Eski kayıttan otomatik onay veya yeni belge sürümü üretilmez. Kullanıcıya bağlı olmayan başvuru insan sahiplik incelemesi gerektirir.
