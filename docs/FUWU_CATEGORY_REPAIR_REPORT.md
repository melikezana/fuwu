# FUWU 3.0 — Kategori onarım raporu

Tarih: 28 Ekim 2026. Dal: `main`. Başlangıç ve uzak main: `5faec2674964ebf6444a5078b53a6593bf886658`. Başlangıç çalışma ağacı temizdi. Commit, push, dağıtım ve production migration yapılmadı.

## Doğrulanan sorun

Canlı Supabase'e yalnızca **anon SELECT/RPC okuma** yapıldı. `service_categories` içinde **11 aktif kategori** var: Tesisat, Elektrik Hizmeti, Temizlik, Halı Yıkama, Klima & Beyaz Eşya, Mobilya Montaj, Boya Badana, Nakliye Yardımı, Çilingir, Bahçe Bakımı, Havuz Bakımı. Kategoriler silinmemiş.

Canlıda `service_catalog` sorgusu `PGRST205`, `commerce_offers` çağrısı `PGRST202` döndürüyor. Önceki uygulama, beş sorgudan herhangi biri hata verdiğinde tüm kataloğu dört sabit ürünle değiştiriyordu. Canlı Hizmetler ekranında dört önizleme kartı da tarayıcıyla doğrulandı. Ayrı bahçe/havuz kategorileri ve kullanıcı kategori adları bu yaklaşımla kayboluyordu.

Kanıt: [anon katalog okuması](../artifacts/fuwu3/live-catalog-readonly.json).

## Değişiklikler

| Dosya | Sonuç |
| --- | --- |
| `src/services/commerce/index.ts` | Aktif kategorileri 500'lük sayfalarla eksiksiz okur. Okunabilen gerçek kategoriler başka sorgunun hatasında korunur. Hata halinde fiyatlı satış kayıtları kapatılır. |
| `src/lib/commerce/catalog-navigation.ts` | Görünürlük ve satış durumu ayrıldı. Veritabanındaki ad/slug korunur. Sıra, öne çıkarma ve ikon kullanılır. Halı Yıkama ve ayrı Havuz kategorisi korunur. |
| `src/components/home/{MarketplaceHome,HeroSection,PopularServices,CategoryCard}.tsx` | Yönetilebilir ilk altı kategori, Tüm Hizmetleri Gör bağlantısı, kompakt mobil iki sütun. Üç hizmet paketine indiren kesme kaldırıldı. |
| `src/app/services/page.tsx` | Tüm gerçek kategoriler, kategori/ilçe bağlamını koruyan bağlantılar ve alias çözümleme. |
| `src/app/services/[slug]/page.tsx` | Veritabanı hatasında hayali ürün yerine bağlantı ekranı; okunabilen ürünün kapsamı korunur. |
| `src/components/commerce/ServiceCatalog.tsx` | Bağlantı hatası ile gerçek boş sonuç ayrıldı; hazırlanan kategoride doğru durum, sahte fiyat/usta/ödeme eylemi yok. |
| `src/components/admin/CategoryPresentationManager.tsx`, `src/app/admin/catalog/*`, `src/services/admin/catalog.ts` | Ad, slug, görünürlük, öne çıkarma, sıra ve ikon yönetimi. Mevcut ekleme/aktiflik ve hizmet/paket kapsamı-fotoğraf-fiyatlandırma yönetimi korunur. |
| `supabase/migrations/20261028000200_fuwu3_catalog_and_fees.sql` | Additive alanlar, admin RPC, kategori ve oran değişikliği audit kayıtları. |

`catalogPreviews` artık müşteri ana sayfasında, katalogda veya ürün sayfasında bir veritabanı yedeği olarak kullanılmaz. Dosyadaki eski tanımlar yalnızca test örneklerinde korunmuştur. Yeni kategori veya sahte usta seed edilmedi. Önceki kategori aktiflikleri değiştirilmedi.

Kategori = keşif başlığı; Catalog Service = kapsamı tanımlı ürün; Provider Offering = ustanın fiyatlı satış kaydı; Availability = süre, bölge, izin, mevcut sipariş ve günlük kapasiteye göre gerçek saat. Görünür kategori için usta gerekmez. Satın alma için aktif kayıt, doğrulanan sunucu fiyatı ve geçerli slot gerekir.

## Ekranlar

Önceki ekranlar **canlı eski sürüm**, sonraki ekranlar **yerel yeni sürüm + aynı herkese açık backend**. Yerel incelemede service-role anahtarı kullanılmadığı için canlı yönetici duyuru bandı aynı olmayabilir. Görüntülerdeki geliştirme göstergesi yalnızca ekran kaydı sırasında gizlendi; fiyat/veri değişikliği yapılmadı.

| Ekran | Önce | Sonra |
| --- | --- | --- |
| Hizmetler, 390px | [Canlı](../artifacts/fuwu3/before/live-services-390.png) | [11 kategori](../artifacts/fuwu3/after-public-backend/services-390.png) |
| Hizmetler, 1440px | [Canlı](../artifacts/fuwu3/before/live-services-1440.png) | [11 kategori](../artifacts/fuwu3/after-public-backend/services-1440.png) |
| Ana sayfa, 390px | [Canlı](../artifacts/fuwu3/before/live-home-390.png) | [Yerel](../artifacts/fuwu3/after-public-backend/home-390.png) |
| Ana sayfa, 1440px | [Canlı](../artifacts/fuwu3/before/live-home-1440.png) | [Yerel](../artifacts/fuwu3/after-public-backend/home-1440.png) |

## Test ve kalan kurulum

- Gerçek yerel Next uygulaması, gerçek anon backend ile **11 kategoriyi** gösterdi. Halı Yıkama filtresi ve mobil iki sütun doğrulandı. [Sonuç](../artifacts/fuwu3/after-public-backend/application-tests.json).
- Kategori, görünürlük, sunucu fiyatı, rol ve kapasite kontrolleri geçici PostgreSQL'de sınandı. Yükseltme dahil **87 kontrol** geçti. [Sonuç](../artifacts/fuwu3/upgrade/database-tests.json).
- Türkçe arama, boş katalogda kayıt uydurmama ve yönetici adını koruma birim testleri geçti. [Birim sonucu](../artifacts/fuwu3/unit-tests.json), `scripts/test-phase1-design.ts`.

**P0 açık:** Canlı commerce şeması eksik. Yeni admin alanları da migration uygulanana kadar kullanılamaz; arayüz bunu açıklar. Gerekli migration'lar önce staging'de, gerçek mevcut şema ve migration geçmişiyle karşılaştırılmalı. `supabase db push` ile tüm geçmişi körlemesine çalıştırmayın: `20260824000100_deactivate_hali_yikama.sql` mevcut aktif Halı Yıkama kategorisini pasifleştirir. Bu dosya bu çalışmada çalıştırılmadı. Üretimde hangi eski migration'ın uygulanacağı ayrı inceleme ve kullanıcı onayı gerektirir.

Sadece ürün tanımı açmak satış başlatmaz. Yönetici gerçek kapsamı ve paketleri oluşturmalı; doğrulanmış usta kendi fiyatını, bölgelerini ve saatlerini kaydetmeli; iyzico sandbox alt üye durumu doğrulanmalıdır.
