# FUWU premium mobil satın alma dönüşümü

26 Ekim 2026. Başlangıç: `4fa88b0`; çalışma ağacı temizdi.

## Audit

- Next.js App Router, TypeScript, Tailwind, Supabase ve iyzico sandbox mevcut. Commerce tabloları, atomik rezervasyon, ödeme doğrulaması ve rol bazlı paneller daha önce eklenmiş.
- Aktif home fotoğraf kullanıyor; eski 3D bileşenler ve talep metinleri kaynakta kalmış. Home üzerinde satın alma mesajı zayıf; tekrar eden süreç bölümleri var.
- `/request` eski formu açıyor. Yeni satın alma girişi ile çelişiyor; eski bağlantılar katalog/profil akışına taşınmalı.
- Randevu formunda bütün alanlar aynı anda açık. Mobilde tek görev/adım, seçili özet ve geri dönüş gerekli.
- Usta kartında ortalama fiyat ile satın alınabilir fiyat ayrı önceliklerde. Kesin hizmet fiyatı öne alınmalı.
- Müşteri panelinde favoriler ve ödeme yöntemleri yok. Usta/admin eski kayıt menüleri yeni siparişlerden ayırt edilmeli.
- Giriş ekranında Supabase gibi uygulama içi teknik ayrıntılar var. OAuth callback güvenli `next` doğrulaması, PKCE ve kullanıcı doğrulaması içeriyor.

## Uygulama planı

1. Beyaz/gri yüzey, koyu metin, FUWU turuncusu, ortak radius ve erişilebilir dokunma/focus düzeni. Gerçek yerel WebP fotoğraflarıyla hero, kategori ikonları ve doğrulanabilir güven anlatımı.
2. Eski satın alma bağlantılarını yeni modele taşı. Liste/profil CTA ve gerçek fiyat gösterimini birleştir. Randevuyu seçim → gün/saat → adres → özet adımlarına böl.
3. Hesapta favori ustalar ve dürüst ödeme yöntemi bilgisi; usta/admin menü ve işlem tutarlılığı; giriş sayfasında müşteri odaklı metin.
4. Lint, tip, build, mevcut auth/ödeme/DB testleri; mobil/masaüstü gerçek sayfa taraması ve bileşen senaryoları. Sonuç, kanıt ve ortam sınırlarını teslim raporunda kaydet.

## Tasarım kararı

UI/UX Pro Max aramasının marketplace/directory ve düşük hareket önerisi kullanıldı. Otomatik üretilen siyah zemin/serif font önerisi yerine kullanıcının beyaz zemin, turuncu vurgu ve mevcut yerel Inter fontu talebi uygulanır. Stok fotoğraf ustanın kimliği veya tamamlanan işi gibi gösterilmez. Uydurma fiyat, puan, müsaitlik, yorum ve ödeme başarısı üretilmez.
