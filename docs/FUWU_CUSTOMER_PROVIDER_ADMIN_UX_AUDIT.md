# FUWU 3.0 — Müşteri / Usta / Admin UX denetimi

28 Ekim 2026. Mevcut Next.js uygulaması geliştirildi; ikinci uygulama oluşturulmadı. UI/UX Pro Max erişilebilirlik, dokunma hedefi, yükleme geri bildirimi ve responsive ilkeleri uygulandı. Orijinal logo, yerel Inter ve turuncu/beyaz marka sistemi korundu.

## İnceleme kapsamı ve öncelikler

Statik olarak **68 page/route dosyası** tarandı: 23 müşteri/kamu, 11 usta, 15 admin ve 19 API. [Dosya ve veri bağlantısı envanteri](../artifacts/fuwu3/route-inventory.json) import/sorgu ve inceleme sinyallerini gösterir; tüm rotaların oturumlu çalıştırıldığı anlamına gelmez.

| Seviye | Bulgu | Sonuç |
| --- | --- | --- |
| P0 | Canlı commerce tablo/RPC eksik | Gerçek anon backend ile doğrulandı; canlı kurulum onay bekliyor. |
| P1 | Tek sorgu hatası 11 kategoriyi dört önizlemeye düşürüyor | Gerçek kategori verisi korunuyor; bağlantı hatası satıştan ayrıldı. |
| P1 | Sabit kategori adları kullanıcı adlarını eziyor | Veritabanı adı/slug öncelikli. Bahçe/Havuz/Halı korunuyor. |
| P1 | Checkout “Ek ücretler 0” varsayımı | Sunucu quote, ayrı ücret satırı, toplam ve açık onay eklendi. |
| P1 | %1 komisyonun eski yorumunda %100 olabilmesi | Yüzde → bps semantiği netleşti, sınırlar iki katmanda doğrulandı. |
| P1 | Günlük iş adedi sınırı yok | Sahibe özel kapasite ayarı ve kilit altında rezervasyon kontrolü eklendi. |
| P1 | Masraf/net kazanç ve müşteri ücreti ayrımı | Brüt satış, iki ücret ve bilinmeyen masraf ayrı; net tutar uydurulmuyor. |
| P1 | Kullanım Şartları eski doğrudan iletişim modelini anlatıyor | Mevcut sandbox satın alma, ücret ve iptal/destek akışıyla eşleştirildi; hukuki onay açık. |
| P1 | Ayarlar okunamayınca varsayılan değerler kaydedilebilir | Okuma hatasında düzenleme formu gösterilmiyor. |
| P2 | Usta alt sekmelerinde profil yok, mağaza/takvim sırası tutarsız | Genel Bakış / Siparişler / Takvim / Kazançlar / Profil. Mağazaya panelden erişim korundu. |
| P2 | Geniş `overflow-wrap:anywhere` Türkçe akışı bozuyor | Commerce panellerinde normal kelime kırılımı, küçülen metrik tipi ve esnek özet satırları. |
| P2 | Admin ikon düğmeleri/alanlarında etiket ve hedef küçük | Katalogda erişilebilir isimler, 44px hedef ve görünür odak. |
| P2 | Lazy fotoğraflar tam sayfa ekran kaydında boş kalabilir | Kanıt kaydında görseller yüklenmeden ekran alınmıyor; uygulamadaki lazy yükleme korunuyor. |

## Müşteri

Ana başlık: “Evin için ne gerekiyorsa, FUWU’da.” Alt metin ve arama istenen dille güncellendi. Keşfet ve Usta Ol eylemleri korunuyor. İlk altı yönetilebilir kategori ve tüm kategori ekranı var. Satışa açık gerçek paketlerin üçle sınırlanması kaldırıldı. Usta karşılaştırması gerçek profillerden, yorum bölümü yalnızca mevcut backend değerlendirmelerinden gelir. Veri yoksa yorum/istatistik üretilmez.

Mevcut hizmet/paket → usta → gerçek gün/saat → adres → özet → hosted test ödeme → takip zinciri korundu. Giriş son adıma kadar zorunlu değil. Seçimler oturum taslağında kalır; adres URL'ye yazılmaz. OAuth dönüşü slotu yeniden kontrol eder. Depolama engelliyse girişe giderken taslağı kaybetmek yerine hata verir. Bu davranışlar fixture testlerinde doğrulandı; gerçek Google hesabıyla giriş henüz yapılmadı.

Mevcut sipariş durum geçmişi, teslim kodu, değerlendirme uygunluğu, destek/uyuşmazlık, iptal/tam iade ve güncel fiyatla tekrar satın alma korundu. Canlı harita eklenmedi. Müşteri toplamı ve platform ücreti siparişteki snapshot'tan okunur.

## FUWU Partner

Mevcut bugünkü/yeni/geciken siparişler, mağaza, fiyat/paket, bölge, takvim, izin ve belge/profil akışları korundu. Aynı provider kilidi çakışan siparişleri ve kapasite yarışını engeller. Usta günlük 1–30 iş sınırını kendi ayarlar; sınır henüz belirlenmediyse bu açıkça yazılır. Mevcut randevular sınır düşürülünce iptal edilmez.

Kazançlarda hizmet brüt satışı müşteri platform ücretinden ayrıldı. Komisyon, brüt hak ediş, iade edilen hizmet, bildirilen kuruluş maliyeti ve ustaya yansıtılması doğrulanan kesinti ayrı. Tamamlanmamış veya tahsilatı doğrulanmamış hizmet kazanılmış gelir değildir. Kuruluş onayı banka transferi tamamlandı diye sunulmaz. Gerçek banka mutabakatı ve sözleşmeye bağlı kesinti süreci henüz dış kuruluşla doğrulanmadı.

## Admin ve CEO

Gerçek `commerce_admin_summary` verisiyle Büyüme / Finans / Operasyon ve kalite görünümleri. GMV hizmet bedeli olarak, müşteri tahsilatı ayrıca gösterilir. Tamamlanan işlerde usta komisyonu + müşteri ücreti brüt platform geliridir. Sıfır payda “henüz ölçülemedi”, eksik maliyet “veri yok” durumundadır. Sandbox etiketi kalıcıdır.

`commerce_ceo_insights` kategoriye göre başarılı test satın alımları, aktif hizmet sunan usta sayısı, ilçe tamamlanma oranı ve hizmette tekrar satın alan müşteri sayısını döndürür. Hizmet ve ilçe gruplaması sabit ID kullanır; yeniden adlandırma geçmişi parçalamaz. Müşteri kimliği/adres/token açığa çıkarmaz ve yalnızca admin'e açıktır. Bu RPC gerçek izole PostgreSQL'de sınandı; canlıda henüz kurulmadığı için raporun hata durumu gösterilir.

**Açık kapsam:** Oturum/adım bazlı funnel, kanal CAC, kontrollü ücret deneyi, usta red nedeni analizi ve vergi/fatura defteri bu sürümde bağlanmış veri setine sahip değildir. Yönetim ekranı bunlar için sayı veya AI tahmini üretmez. Ödeme/OAuth/cron sağlığı mevcut operasyon sağlık kanıtlarına dayanır; güncel başarılı dış işlem yoksa sağlıklı ilan edilemez. İki aşamalı finans onayı örgütsel bir öneridir; işlevsiz bir onay ekranı eklenmedi.

## Görsel ve mobil doğrulama

- Gerçek altı sayfada 320, 375, 390, 430, 768, 1024 ve 1440px: yatay sayfa taşması yok.
- Müşteri alt sekmeleri beş adet ve en az 44px yüksekliğinde. Header ile çakışma yok. Safe-area ve mevcut klavye CSS'i korundu.
- Reduced motion, yatay ekran ve %200 kök yazı boyutu Chromium'da kontrol edildi. `visualViewport` olayıyla klavye senaryosu simüle edildi; gerçek iOS/Android cihaz/PWA klavye testi yapılmış sayılmaz.
- Fixture checkout 7 genişlikte tek görünür ödeme CTA'sı, doğru fiyat ve hata/boş/yükleme durumlarıyla sınandı. Tam WCAG 2.2 AA sertifikasyonu veya VoiceOver/TalkBack testi yapılmadı.
- Yeni fotoğraf indirilmedi. [Kaynak ve lisans kayıtları](service-photo-licenses.md) güncel; stok kişi FUWU ustası olarak sunulmaz. Fotoğrafı olmayan kategoride kategori ikonu var.

[Canlı önceki ekranlar](../artifacts/fuwu3/before/), [gerçek backend ile yerel sonraki ekranlar](../artifacts/fuwu3/after-public-backend/), [backend yokken üretim derlemesi](../artifacts/fuwu3/after-offline/), [TEST checkout ekranları](../artifacts/fuwu3/fixture-checkout/). Önce/sonra eşleştirmesi [kategori raporundadır](FUWU_CATEGORY_REPAIR_REPORT.md).

Ana değişen UX kaynakları: `src/components/home/*` içindeki dört etkin bileşen, `src/app/services/*`, `src/components/commerce/{ServiceBooking,ServiceCatalog,OrderView,ProviderStore,ProviderCapacity,ProviderCommerceSummary}.tsx`, `src/components/layout/MobileBottomNav.tsx`, `src/components/admin/{CategoryPresentationManager,MarketplaceMetrics,MarketplaceInsights,CommerceCatalogManager}.tsx`, `src/styles/premium.css`, `src/app/kullanim-sartlari/page.tsx`. Tam [değişiklik listesi](../artifacts/fuwu3/changed-files.json).

Admin Finans ve usta kapasite ekranları ayrıca fixture React ile doğrulandı: [test sonucu](../artifacts/fuwu3/fixture-panels/panel-tests.json), [390px admin Finans — TEST](../artifacts/fuwu3/fixture-panels/admin-finance-390-FIXTURE.png), [390px usta Mağaza — TEST](../artifacts/fuwu3/fixture-panels/provider-store-capacity-390-FIXTURE.png). Bunlar canlı admin oturumu veya dış ödeme kanıtı değildir.
