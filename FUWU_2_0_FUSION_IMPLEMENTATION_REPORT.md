# FUWU 2.0 — FUSION IMPLEMENTATION REPORT

**Tarih:** 22 Ekim 2026, Europe/Istanbul. **Başlangıç commit’i:** `aa24dd0` — `Complete FUWU service purchasing and marketplace UX redesign`.

Çalışma ağacı başlangıçta temizdi. Mevcut Next.js / Supabase / iyzico modelleri üzerine geliştirme yapıldı. Commit, push, deployment, production migration, canlı tahsilat veya uzak veritabanında test kaydı oluşturulmadı. Önceki `artifacts/direct-commerce` kanıtları korundu; bu çalışmanın sonuçları `artifacts/fusion/` klasöründedir.

**Teslim durumu:** Yerel uygulama ve izole testlerde doğrulandı. Gerçek Google OAuth, tam Supabase Auth/PostgREST E2E ve iyzico sandbox kabulü tamamlanmadığından production’a hazır olduğu iddia edilmez. Aşağıdaki dış ortam engelleri açıkça ayrılmıştır.

## 1. Başlangıç sistem denetimi

Önce kaynak kod, Git durumu, scriptler ve migration’lar okundu. Önceki raporlar tek başına kanıt kabul edilmedi.

| Soru | Kod ve bu oturumdaki testlerden sonuç |
| --- | --- |
| Gerçekten tamamlanan özellikler | Katalog / varyant / usta teklifi, sunucuda fiyat snapshot’ı, 10 dakikalık rezervasyon, Türkiye saatinde slot hesaplama, provider satır kilidi, RLS, ödeme claim’i, tutar doğrulama, teslim kodu ve yorum RPC’leri zaten vardı. Başlangıçtaki 25 izole PostgreSQL testi ve 20 mock ödeme testi geçti. |
| Sadece arayüz veya eksik entegrasyon | Eski admin ödemeleri ve gelir raporları `payments/service_requests` okuyordu; yeni `orders/payment_transactions` işletme raporlarına bağlı değildi. Müşteri ana panelleri talep merkezliydi. Gerçek iyzico ve Google kabulü kanıtlanmamıştı. Eski usta aylık grafik alanı boş durum olarak kalıyor; sahte grafik eklenmedi. |
| Gerçek Supabase bağlantıları | Usta listesi / profilleri / yorumlar, başvurular ve mevcut paneller Supabase sorguları kullanıyor. Yeni katalog `service_catalog`, teklifler `commerce_offers`, slotlar `commerce_slots`, satın alma `commerce_hold_order` ile çalışıyor. Veri hatasında fiyat, usta veya yorum üretilmiyor. |
| Gerçek sandbox ödeme kanıtı | Bulunamadı. Bu çalışma da gerçek sandbox tahsilatı yapmadı. Ödeme testleri kontrollü HTTP yanıtları kullanır. |
| Migration gereksinimi | `20261021000100_direct_service_commerce.sql` ve yeni `20261022000100_fusion_operations.sql`, önce tam şemalı izole/staging ortamda uygulanmalı. Hedef projeye uygulanmadı. |
| OAuth/session riskleri | Callback başarısızlığı açıklamasız devam edebiliyordu. Yenilenen cookie downstream isteğe ve redirect yanıtına taşınmıyordu. Genel sayfalarda session yenileme atlanıyordu. Middleware kullanıcı tarafından değiştirilen `user_metadata` içindeki rolü okuyordu. Kontrol karakterli redirect yolları yeterince süzülmüyordu. Düzeltildi ve yerel test edildi. |
| Sipariş / ödeme / admin tutarsızlıkları | Eski ve yeni ödeme modelleri ayrıydı; eski kayıtların ortam bilgisi yoktu. Hak ediş güncellemesi finans tarihini kaydırabiliyordu. Eski manuel ödeme onayı iyzico kaydını da etkileyebiliyordu. Eski refund/release yollarında işlem kimliği ve tekrar çağrı korumaları eksikti. Düzeltmeler aşağıdadır. |
| Mobil durum | Önceki ekran görüntüleri güncel kabul edilmedi. Yeni kontrollerde 320, 375, 390, 430, 768, 1024, 1440 px kullanıldı. Koyu süreç bölümündeki düşük kontrastlı başlık görsel incelemede bulundu ve düzeltildi. Oturum gerektiren tam müşteri/admin ekranlarının gerçek session ile testi ayrıca gerekli. |

**Ek güvenlik bulgusu:** `20260605002200_backend_hardening_status_audit_rls.sql` içindeki `profiles_insert_own`, önceki migration’daki `role='customer'` şartını kaldırıyordu. Profil satırının bulunmadığı durumda bu politika kendine ayrıcalıklı profil eklemeye izin verebilecek kadar genişti. Yeni migration varsayılan müşteri şartını geri getirir; doğrudan rol yükseltmeyi ayrıca trigger ile engeller. Bu bulgu koddan çıkarılmıştır; production üzerinde istismar denenmedi.

### Başlangıç kontrolleri

| Kontrol | Başlangıç sonucu |
| --- | --- |
| `npm run lint` | PASS; çıktı hata/uyarı içermiyor. Üretilmiş test runtime dosyalarının taranması yavaştı; `artifacts` ve `test-results` lint kapsamından çıkarıldı. |
| `npx tsc --noEmit` | PASS, exit 0. |
| `npm run build` | İlk deneme Windows sandbox içindeki SWC yol erişim hatasıyla engellendi. Sandbox dışı denemenin type-check aşaması kod değişiklikleriyle çakıştığından değişmemiş başlangıç build’i için temiz PASS iddia edilmez. Son kodun bağımsız build’i geçti. |
| `npm run test:commerce:db` | İlk sandbox denemesi localhost cluster’a bağlanamadı; aynı izole runner uygun yerel erişimle 25/25 geçti. Uzak DB kullanılmadı. |
| `npm run test:commerce:payment` | 20/20 PASS, mock HTTP. |
| Diğer entegrasyon scriptleri | Scriptler incelendi. Auth/PostgREST gerektiren gerçek kullanıcı/başvuru/yorum akışları için izole Supabase servisi bulunmuyor. Production’a yönlendirilmedi. |

Başlangıç logları: `artifacts/fusion/baseline-*.log`, `artifacts/baseline-fusion-tsc.log`.

## 2. Fazlara göre uygulama

| Faz | Yapılan değişiklik ve doğrulama |
| --- | --- |
| 0 — Denetim | Kaynaklar ve mevcut migration incelendi; başlangıç testleri tekrar çalıştırıldı. Mevcut commerce çekirdeği korundu. |
| 1 — Fusion tasarım | Orijinal logo, turuncu aksan, Inter ve mevcut lisanslı WebP fotoğraflar korundu. Yeni ortak `fusion.css`; sade kartlar, belirgin odak, 44px hedefler ve mobil sekmeler. Ana sayfada 3D kullanılmıyor. Koyu bölüm kontrastı düzeltildi. |
| 2 — Müşteri | İstenen ana başlık, açıklama ve iki CTA uygulandı. Gerçek teklif varsa ana sayfada hizmet kartları görünür. `/account` ve `/dashboard` satın alma merkezine bağlandı; sipariş ve müşteri listeleri sayfalı. Adres kaydetme/silme ve checkout’ta kayıtlı adres seçimi eklendi. |
| 3 — Usta | Mağaza / haftalık saatler / izinler mevcut altyapıyla korunuyor. Takvimden mağaza ayarlarına erişim eklendi; Türkiye günü hesapları düzeltildi. Yeni finans RPC’siyle satış, komisyon, kuruluş maliyeti, brüt pay ve onay durumu ayrıldı. Eski talep istatistikleri ayrı açılır bölümde. Sipariş sayfalaması ve tüm kayıtları kapsayan sayımlar eklendi. |
| 4 — Google/session | PKCE exchange → doğrulanmış kullanıcı → profil sıralaması; güvenli hata dönüşü; aynı `next` yolunda devam; SSR request/response cookie eşitleme; private/no-store; kullanıcı metadata’sından admin kontrolünün kaldırılması. Sadece `openid email profile` scope’ları istenir, Gmail izni yoktur. 25 yerel test geçti. |
| 5 — iyzico | Yeni callback, imzalı webhook ve admin sorgulaması aynı sunucu doğrulamasına bağlandı. Eski callback de kayıtlı token üzerinden kuruluş sorgusuyla doğrulanır. Sandbox dışında API ve ödeme URL’si engelleri korundu. Eski/yeni refund ve release yanıtlarında işlem ID’si, başarı, iade tutarı ve TRY kontrolü ortaklaştırıldı. Eski işlemlere de kalıcı claim eklendi. 23 mock test geçti. |
| 6 — Randevu | Provider kilidi / çakışan süre / izin / bölge / geçmiş saat / geç ödeme / hold süresi testleri tekrar geçti. Slot doğruluğu günlük cron’a bağlı değil. Siparişe kapsam dışı işler snapshot’ı eklendi; katalog değişikliği geçmiş sözleşmeyi değiştirmez. |
| 7 — Admin | `/admin/marketplace`: siparişler, ödemeler/mutabakat, iadeler, hak edişler, uyuşmazlıklar, sistem sağlığı. Gerçek SQL agregasyonları; GMV, komisyon ve iadeler ayrı. Ürün ve varyant yönetimi mevcut katalog sayfasına eklendi. Admin sipariş görüntüsü müşteri işlem butonlarını göstermez. |
| 8 — Güven/operasyon | Ödeme, sipariş, rol ve komisyon değişikliklerinde DB audit kayıtları. Sipariş geçişlerinde mevcut bildirim tablosu kullanılır. Kullanıcı sadece bildirim okundu durumunu değiştirebilir; sipariş bildirimi taklit edemez. Uygulanmamış sigorta/garanti vaadi eklenmedi; yanıltıcı emanet ödeme metni temizlendi. |
| 9 — Kabul testleri | 40 DB + 23 ödeme + 25 auth kontrolü; 7 mevcut Playwright testi; 9 gerçek uygulama kontrol grubu ve 10 bileşen kontrol grubu geçti. Gerçek dış servis akışları BLOCKED olarak ayrıldı. |
| 10 — Teslimat | Lint, TypeScript, build, commerce testleri, seçili Playwright, RLS testleri, responsive kontroller ve ekran kanıtları tamamlandı. Production’a geçilmedi. |

## 3. Müşteri ekranları ve satın alma

`Hizmet → Usta → Gün/Saat → Adres → Sipariş Özeti → Ödeme → Sipariş Takibi`.

- Katalog mevcut kategori, ürün ve teklif kayıtlarını okur. Kesin fiyat, süre veya uygun satış verisi yoksa satın alma açılmaz. Katalog bağlantısı kısmen başarısızsa elde kalan tekliflerle satış yapılması engellendi.
- Usta kartlarında uygun gerçek teklif varsa fiyat ve “Bu Ustayı Seç” aynı checkout altyapısına gider. Profildeki paket bağlantısı seçilen varyantı da taşır.
- İlerleme göstergesi, gerçek slot sorgusu, mobil sabit devam/ödeme butonu, kapsam, adres, randevu, toplam ve iptal açıklaması bulunur.
- 30 dakikalık per-tab form taslağı giriş sırasında seçimleri saklar. Farklı usta/paket bağlantısına gidildiğinde başka rezervasyon taslağı seçimi ezmez. Çıkışta taslaklar temizlenir.
- Siparişler, yaklaşan randevular, geçmiş hizmetler, adresler, değerlendirmeler, destek ve hesap ayarları gerçek sorgulara bağlıdır. Eski talepler `/dashboard/requests` üzerinden korunur.
- Mevcut yorum kısıtı müşteri/usta başına tek değerlendirmedir. Yorum zaten varsa tekrar gönderim arayüzü açılmaz. Her siparişe ayrı yorum modeli bu çalışmada yeniden kurulmadı.

## 4. Usta ve finans ekranları

`/provider-dashboard/store`, `/calendar`, `/orders`, `/earnings`, `/profile`, `/notifications` korunup entegre edildi.

Finans toplamları PostgREST’in 1000 satır sınırına takılmadan PostgreSQL içinde hesaplanır. Brüt satış ve platform komisyonu ayrı alanlardır. Ödeme kuruluşunun bildirdiği maliyet ayrıca görünür; maliyetin taraflara dağılımı doğrulanmadan net banka kazancı üretilmez. `NONE`, `IN_FLIGHT`, `RELEASED` durumları ayrı gösterilir. **Kuruluş onayı, banka transferinin tamamlandığı anlamına gelmez.**

Onaysız/pasif veya aktif sandbox alt üye işyeri bulunmayan usta satışa açılamaz. Gerçek fiyat, süre, bölge ve takvim tanımları ustanın mağazasında yapılmalıdır.

## 5. Admin operasyon merkezi

SQL özetinde tamamlanan sipariş, günlük/aylık GMV, tamamlanan ödenmiş hizmet komisyonu, bekleyen/başarısız ödeme, iadeler, bekleyen brüt hak ediş, aktif/onaylı usta, ay içi müşteri, iptal oranı, ortalama tutar ve tekrar satın alan müşteri oranı bulunur. Gün/ay sınırı `Europe/Istanbul` kullanır. Başarılı ödeme zamanı `paid_at` ile korunur; refund/release tarih değişikliği yeni satış oluşturmaz.

GMV başarılı tahsilatların brüt hacmidir; iadeler ayrıca raporlanır. Yeni işlemler sandbox olarak işaretlidir. **Eski `payments` kayıtlarının ortamı bilinmiyor; doğrulanmış şirket geliri kabul edilmez ve yeni sandbox toplamlarına karıştırılmaz.**

Admin kuruluş sorgusu başlatabilir; doğrulanmamış bir ödemeyi başarılı yapamaz. Eski manuel ödeme onayı iyzico kayıtlarını artık değiştiremez. İade talebi `REFUND_PENDING` olur; kuruluşun sonucu doğrulanmadan `REFUNDED` gösterilmez. `IN_FLIGHT` işlemler körlemesine tekrar gönderilmez. Yetkili ürün/varyant değişiklikleri audit kaydı oluşturur; mevcut teklifler varken kategori/fiyatlandırma türü değiştirilmesi reddedilir.

## 6. Migration ve erişim güvenliği

Yeni dosya: `supabase/migrations/20261022000100_fusion_operations.sql`.

- Tek yeni tablo: kullanıcıya ait kayıtlı adresler için `customer_addresses`. Sipariş ve ödeme modelleri yeniden oluşturulmadı.
- `orders.exclusions`, `payment_transactions.paid_at`, eski `payments.external_operation_state` alanları eklendi.
- Katılımcı finans RPC’si token, ödeme URL’si, dış işlem ID’si veya teslim kodu döndürmez.
- Admin ve provider finans RPC’lerinde sahiplik/rol kontrolü var. Müşteri adresleri RLS ile izole. Kritik dış ödeme RPC’leri sadece `service_role` tarafından çağrılabilir.
- Sipariş/ödeme audit kayıtları adres, teslim kodu ve token içermez. Profil rolü ve komisyon değişiklikleri ayrıca loglanır.
- Bildirimler siparişe güvenli bağlantı taşır; alıcı, metin ve metadata kullanıcı tarafından değiştirilemez.

**Doğrulama kapsamı:** Gerçek PostgreSQL 18.4 üzerinde bağımsız TCP bağlantıları; önceki kullanılan ilişkilerin sözleşme fixture’ı + commerce migration + Fusion migration. Bu, tüm tarihsel Supabase migration zincirinin, Auth/Storage/PostgREST servislerinin veya hedef PostgreSQL 17 ortamının geçtiği anlamına gelmez. Tam staging doğrulaması zorunlu açık adımdır.

Mevcut başarılı eski ödemeler için `paid_at`, varsa ilk ödeme durum olayından, yoksa mevcut transaction zamanından geri doldurulur. Olayı olmayan tarihsel kayıtların finans tarihi kuruluş kayıtlarıyla karşılaştırılmalıdır.

## 7. Test sonuçları ve kanıtlar

| Komut / kapsam | Sonuç | Kanıt |
| --- | --- | --- |
| `npm run lint` | PASS, 0 hata / 0 uyarı | `artifacts/fusion/final-lint.log` |
| `npx tsc --noEmit` | PASS | `artifacts/fusion/final-tsc.log` |
| `npm run build` | PASS, production bundle ve route üretimi | `artifacts/fusion/final-build.log` |
| `npm run test:commerce:db` | **40 PASS** | `artifacts/fusion/database-tests.json` |
| `npm run test:commerce:payment` | **23 PASS — mock** | `artifacts/fusion/payment-tests.json` |
| `npm run test:fusion:auth` | **25 PASS — yerel/mock Auth HTTP** | `artifacts/fusion/auth-tests.json` |
| Mevcut Playwright erişim/CSP testleri | **7 PASS** | `artifacts/fusion/playwright-final.log` |
| Gerçek Next.js misafir ekranları/API/OAuth hata dönüşü | **9 kontrol grubu PASS**, 0 JS hatası | `artifacts/fusion/app-browser-tests.json` |
| Gerçek React bileşenleri, kontrollü fixture API | **10 kontrol grubu PASS**, 0 JS hatası | `artifacts/fusion/components/browser-tests.json` |
| Mevcut provider validation ve veri yokluğu kontrolleri | PASS | `scripts/test-provider-validation.ts`, `scripts/test-marketplace-fallbacks.ts` |
| `git diff --check` | PASS | Son yerel kontrol |

Her yerel kontrolün beklenen ve gerçekleşen sonucu: [acceptance-tests.md](artifacts/fusion/acceptance-tests.md). Asıl SQL/HTTP assert’leri ilgili `scripts/test-*.{mjs,ts}` dosyalarındadır.

### İstenen negatif senaryolar

| Senaryo | Beklenen | Gerçekleşen |
| --- | --- | --- |
| Aynı slot iki bağımsız transaction ile alınır | Sadece biri rezervasyon alır | PASS — gerçek yerel DB |
| Kesişen farklı başlangıç saatleri | İkinci rezervasyon reddedilir; bitişe bitişik slot kalır | PASS — DB |
| İstemci fiyatı değiştirilir | `price_changed`, sipariş oluşturulmaz | PASS — DB |
| Yanlış bölge, geçmiş gün, izin, pasif/onaysız usta | Slot/satış açılmaz | PASS — DB |
| Başka müşteri siparişi/adresi okunur | Kayıt görünmez | PASS — RLS |
| Başka usta siparişi/finansı değiştirilir | Yetki reddi | PASS — DB |
| Müşteri admin finans RPC’sine gider | Yetki reddi | PASS — DB |
| Kullanıcı kendine admin profili ekler / rol değiştirir | Yetki reddi | PASS — DB |
| İstemci admin metadata’sı gönderir | Admin erişimi verilmez | PASS — gerçek SSR kodu, mock Auth HTTP |
| Callback tekrar gelir | Aynı ödeme/sipariş olayı yeniden yazılmaz | PASS — DB |
| Ödeme alanları/tutar/TRY/usta payı bozulur | Doğrulama reddi | PASS — mock ödeme |
| Ödeme başarılı, hold süresi dolmuş/slot yeniden satılmış | `REFUND_PENDING`; yeni rezervasyona dokunulmaz | PASS — DB |
| Başarısız ödeme / süresi dolan rezervasyon | Slot cron beklemeden kullanılabilir | PASS — DB + bileşen |
| İade/hak ediş tekrar çağrılır veya sonucu belirsizdir | Tek kalıcı claim; doğrulanmamış başarı yok | PASS — DB + mock yanıt kontrolü |
| OAuth reddi / geçersiz code / profile hatası | Açıklamalı hata; güvenli next | PASS — mock + gerçek misafir callback |
| Cookie refresh ve admin redirect | Yeni cookie request ve response üzerinde korunur | PASS — gerçek Supabase SSR, mock Auth HTTP |
| Google’dan gerçek giriş sonrası yenileme/çıkış | Gerçek oturumun korunması ve temizlenmesi | **BLOCKED — gerçek Google oturumu denenmedi** |

### Gerçek kullanıcı kabul senaryoları

| Senaryo | Gerçek uçtan uca durum |
| --- | --- |
| Müşteri Google → hizmet/usta → randevu → iyzico → sipariş → yorum | **BLOCKED**. Yerel adımlar ve DB kuralları testli; gerçek Google, Auth/PostgREST ve iyzico birleşik akışı çalıştırılmadı. |
| Usta başvurusu → admin onayı → mağaza/takvim → iş tamamlama → hak ediş | **BLOCKED**. Mevcut validation, sahiplik, mağaza, kod ve finance testleri geçti; gerçek staging hesap akışı yok. |
| Admin yeni sipariş → kuruluş doğrulaması → iade → audit/GMV | **BLOCKED**. RLS/RPC, audit ve UI kontrolleri geçti; dış kuruluş sonucu staging’de doğrulanmalı. |
| Chrome/Safari/iOS/Android gerçek OAuth | **BLOCKED**. Chromium headless responsive kontrolü fiziksel cihaz veya gerçek Google testi sayılmaz. |

## 8. Ekran görüntüleri

Gerçek yerel Next.js uygulaması, misafir oturumu:

| Ekran | Mobil | Masaüstü |
| --- | --- | --- |
| Ana sayfa | [390px](artifacts/fusion/actual-home-390.png) | [1440px](artifacts/fusion/actual-home-1440.png) |
| Katalog | [390px](artifacts/fusion/actual-catalog-390.png) | [1440px](artifacts/fusion/actual-catalog-1440.png) |
| Hizmet detayı | [390px](artifacts/fusion/actual-service-390.png) | [1440px](artifacts/fusion/actual-service-1440.png) |
| Usta listesi | [390px](artifacts/fusion/actual-providers-390.png) | [1440px](artifacts/fusion/actual-providers-1440.png) |
| Giriş | [390px](artifacts/fusion/actual-login-390.png) | [1440px](artifacts/fusion/actual-login-1440.png) |

Fixture görüntülerinde sarı **YALNIZCA ARAYÜZ TESTİ** şeridi bulunur. Fiyat/usta/siparişler kurgusaldır; gerçek işlem kanıtı değildir:

- [Satın alma mobil](artifacts/fusion/components/fixture-booking-390.png), [masaüstü](artifacts/fusion/components/fixture-booking-1440.png).
- [Ödeme bekleyen sipariş](artifacts/fusion/components/fixture-pending-390.png), [onaylı sipariş](artifacts/fusion/components/fixture-confirmed-390.png).
- [Usta teslim kodu](artifacts/fusion/components/fixture-provider-390.png), [usta mağazası](artifacts/fusion/components/fixture-store-390.png).
- [Admin metrikleri mobil](artifacts/fusion/components/fixture-admin-390.png), [masaüstü](artifacts/fusion/components/fixture-admin-1440.png).

Gerçek müşteri hub’ı ve tam admin shell’iyle oturumlu görsel kabul staging engeline bağlıdır. Ana sayfa / katalog / hizmet / usta / giriş ile checkout / sipariş / usta mağazası / admin metrik bileşenleri yedi istenen genişlikte kontrol edildi. Fiziksel cihaz, tüm klavye/screen-reader kombinasyonları ve tam WCAG sertifikasyonu yapılmış sayılmaz.

## 9. Ortam engelleri ve manuel geçiş adımları

Yerel uygulamanın `.env.local` dosyasında Supabase URL/anon key mevcut. Service-role, iyzico sandbox API/secret ve cron anahtarı yapılandırılmamış. Değerler rapora veya istemciye yazılmadı. `.env.test` ayrı localhost Supabase tanımlarına sahip; bu oturumda `/auth/v1/health` erişilemedi. Google sağlayıcı ve Vercel dashboard ayarları bu çalışma alanından doğrulanamadı.

1. **İzole staging:** Tam Supabase şema zincirini ve hedef PostgreSQL 17 sürümünü doğrula. Önce mevcut commerce, ardından Fusion migration’ını uygula. Tüm RLS/ACL/trigger’ları gerçek Auth/PostgREST üzerinde tekrar test et. Production’a otomatik uygulama yok.
2. **Veri hazırlığı:** Admin gerçek kategorilere hizmet kapsamı/paket tanımlarını eklesin. Onaylı ustalar kendi gerçek fiyat, süre, bölge, haftalık saat ve izinlerini tanımlasın. Sandbox alt üye işyeri durumları aktif olmalı. Migration uydurma fiyat veya müsaitlik üretmez.
3. **Supabase Google:** Sağlayıcıyı etkinleştir; Google OAuth client/secret’ını yalnızca dashboard’da sakla. Google authorized redirect URI Supabase’in `/auth/v1/callback` adresi olmalı. Uygulama dönüş URL’leri ayrıca Supabase allowlist’e eklenmeli. Gmail scope’u açılmamalı.
4. **Alan adları:** Canonical adresi `https://www.fuwu.com.tr` / apex kararına göre Vercel’de tekleştir. Giriş başlamadan domain yönlendirmesi yapılsın; PKCE başladıktan sonra cookie host’u değiştirilmesin. `NEXT_PUBLIC_SITE_URL` her ortamda doğru HTTPS adresi olsun. Güvenilen preview host’larını sınırlı allowlist ile ayrıca doğrula; sınırsız production wildcard kullanma.
5. **Gerçek OAuth matrisi:** www, apex ve izin verilen preview’de hesap seçimi, code exchange, doğru profil, aynı hizmet adımı, yenileme, tekrar giriş ve çıkış testlerini Chrome/Safari ve fiziksel mobil cihazlarda çalıştır. Başarısızlık, iptal ve kayıp cookie senaryolarını dahil et.
6. **iyzico sandbox:** API/secret ve service-role değerlerini sadece sunucu ortamına ekle. Callback dışarıdan erişilebilir HTTPS staging adresi olmalı. İmzalı webhook URL’sini `/api/payments/iyzico/webhook` olarak ayarla; V3 imza özelliğinin hesapta açık olduğunu iyzico’dan doğrula. Başarılı/başarısız/iptal, tekrar callback, gecikmiş başarı, refund ve Marketplace approve gerçek sandbox kayıtlarıyla karşılaştırılmalı.
7. **Mutabakat:** `IN_FLIGHT` işlemler otomatik yeniden gönderilmez. Kuruluş işlem kaydıyla inceleme ve yetkili düzeltme prosedürü oluştur. Otomatik dış işlem mutabakat işçisi bu teslimde yok; admin sorgusu ve kalıcı durumlar var. Refund/release kuruluş onayı, bankaya nakit aktarımı veya ödeme süresi garantisi değildir.
8. **Operasyon:** `CRON_SECRET` tanımla; günlük Vercel görevlerini staging’de doğrula. Sentry ve operasyon uyarılarının gerçekten ulaştığını test et. Veritabanı yedekleme politikasını doğrula; staging kopyasında geri yükleme tatbikatı yap. Geri dönüşte mevcut sipariş/finans kayıtlarını silen migration çalıştırma.
9. **Açık ürün sınırları:** Tek sipariş / tek hizmet / tek usta modeli korunur. Çoklu sepet, canlı harita, otomatik banka mutabakatı, her siparişe ayrı yorum ve uygulanmamış sigorta/garanti dahil değildir. Eski tarihsiz atamalar güvenli geçiş için günü kapatabilir; operasyonel temizlik gerekir. Eski talep aylık grafik alanı henüz bağlı değildir ve veri uydurulmaz.
10. **Yayın:** Bu kontroller tamamlanıp açık kullanıcı onayı alınmadan commit/push/production deploy veya production DB değişikliği yapılmamalı. Canlı ödeme ayrıca şirketleşme ve iyzico Marketplace onayı gerektirir; kodun sandbox engeli bu çalışmada kaldırılmadı.

### Yeniden üretme

PowerShell’de, sadece yerel çalışma alanında:

```powershell
npm run lint
npx tsc --noEmit
npm run build
$env:COMMERCE_OUTPUT_DIR='artifacts/fusion'
npm run test:commerce:db
npm run test:commerce:payment
npm run test:fusion:auth
npm run start -- --hostname 127.0.0.1 --port 3046
# Ayrı terminal:
node scripts/verify-fusion-app.mjs
$env:COMMERCE_FIXTURE_ONLY='true'
$env:COMMERCE_OUTPUT_DIR='artifacts/fusion/components'
node scripts/verify-direct-commerce.mjs
$env:PLAYWRIGHT_SKIP_WEBSERVER='true'
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3046'
npx playwright test e2e/middleware-redirect.spec.ts e2e/csp-nonce-smoke.spec.ts --grep 'unauthenticated user|home page loads|Google login entry|admin route does not'
```

DB runner bu makinedeki `artifacts/commerce-test-runtime` altında bulunan izole PostgreSQL ikililerini kullanır; `.env.local` veya uzak DB URL’sini okumaz. Windows sandbox, loopback veya SWC erişimini kısıtlarsa yalnızca yerel test/build komutu uygun erişimle çalıştırılmalıdır.

## 10. Kaynaklar

- [Supabase SSR client / cookie propagation](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [SSR advanced guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide), [Google login](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).
- [iyzico webhook V3](https://docs.iyzico.com/en/advanced/webhook), [Checkout Form retrieve](https://docs.iyzico.com/en/payment-methods/checkoutform/cf-implementation/cf-retrieve).
- [Pexels lisansı](https://www.pexels.com/license/) ve mevcut [fotoğraf kaynak kaydı](docs/service-photo-licenses.md). Yeni fotoğraf indirilmedi; stok görseller FUWU müşterisi veya ustası olarak sunulmaz.
- UI kararlarında `ui-ux-pro-max` tasarım becerisi kullanıldı; mevcut FUWU markası ve kullanıcının Fusion tercihleri esas alındı.
