# 10 Kasım 2026 denetimi · Eylem kaydı

Kaynak rapor: "FUWU / Denetim Raporu · CEO · CTO · Ürün ve Güvenlik İncelemesi" (10 Kasım 2026).
Önceki kayıt: `docs/FUWU_AUDIT_2026-11-09_ACTION_LOG.md`. Bu kayıt yalnızca 10 Kasım raporunun maddelerini ve o günden sonra yapılanları içerir.

Durum anahtarı:

- **Kodda tamam** — bu dalda (PR #2), testle kanıtlı.
- **Üretime uygulanacak** — migration hazır; üretime uygulanması sahibin onayını bekliyor.
- **Sahip işlemi** — kodla yapılamaz; adımı yazıldı.
- **Değişiklik gerekmedi** — incelendi, mevcut kod karşılıyor.

Bu çalışmada üretim veritabanına, Supabase paneline ve canlı siteye yazma yapılmadı. Ekran kontrolleri gerçek uygulama kodu ile sahte (mock) bir arka uç üzerinde yapıldı; canlı site, gerçek cihaz ve gerçek kullanıcı kabulü yerine geçmez.

## Doğrulama özeti (bu dal)

| Kontrol | 9 Kasım kaydı | Şimdi |
|---|---|---|
| TypeScript, ESLint, build | PASS | PASS |
| Birim testleri | 186 | 191 PASS |
| Güvenlik test paketi | 100 | 100 PASS |
| PostgreSQL entegrasyonu (4 senaryo, PG16) | 368 | 376 PASS |
| Hata enjeksiyonu (mock) | 77 | 77 PASS |
| Migration | 84 | 85 (3'ü üretime uygulanmadı) |
| Playwright E2E | çalıştırılamadı | CI: 39/39 seri + 39/39 paralel (commit `74ff5ff`, yeniden koşu) |

## 4 · CEO öncelik planı

| Sıra | İş | Durum | Yapılan / kalan |
|---|---|---|---|
| P0/1 | PR #2 başarısız E2E testini kök nedenle düzelt | Kısmen | Raporun gördüğü hata (38/39, zaman aşımı) kök nedeniyle düzeltildi: telefonu önceden doğrulanmış hesapta "Telefonumu doğrula" düğmesi kalkıyor, test ona koşulsuz tıklayıp bekliyordu (`74ff5ff`). Aynı commit'in ilk paralel koşusunda farklı bir test (usta takvimi, onay kutusu) bir kez düştü; kod değişmeden yeniden koşuda 39/39 geçti. Bu ikinci hatayı yerelde 25 denemede üretemedim, kök nedeni bulunmadı. Paralel koşuda aralıklı düşme riski sürüyor; tekrar ederse CI kaydıyla birlikte incelenmeli. |
| P0/2 | Dört demo profili test/unpublish işaretle | Sahip işlemi | Control Center → Ustalar → "Test kaydı olarak işaretle" + "Yayından Kaldır". Kabul: `npm run audit:public-visibility -- --site=https://www.fuwu.com.tr`. |
| P0/3 | 10 başvuruyu gerçek / demo / eksik sınıflandır; 8 bağsız kaydı araştır | Kodda tamam + üretime uygulanacak; karar sahipte | Admin başvuru listesine "Kaynak" sütunu, "Hesaba bağlı değil" ve "Kaynağı incelenmedi" filtreleri eklendi. Başvuru dosyasında kaynak kararı formu var: gerçek / deneme / eksik, gerekçe zorunlu, geri alınabilir, denetim kaydına düşer. Başvuru satırı, onay akışı ve usta profili değişmez. Migration: `20261111000100_application_source_review.sql`. |
| P0/4 | Bir gerçek usta ile telefon → belge → mağaza → takvim → yayın | Sahip işlemi | Akış kodda hazır; gerçek kişi gerekir. |
| P1/5 | Google, SMS, Storage ve admin işlemlerinin canlı kabulü | Sahip işlemi | Gerçek hesap ve panel erişimi gerekir. |
| P1/6 | İzinli ön kaydı kontrollü aç | Sahip işlemi | Kod kanıtlı (izin, geri çekme, hız sınırı). Açılınca ana sayfa, katalog ve müşteri panelindeki "Açılıştan haberdar ol" bağlantıları kendiliğinden görünür. |
| P1/7 | Advisor ve yedekleme / restore doğrulama | Kodda tamam (plan) + sahip işlemi (deneme) | `docs/production/ROLLBACK_AND_RESTORE.md`: yedek alma, geri yükleme denemesi, üç migration için belirti → geri alma komutları, Vercel geri dönüşü. Deneme yapılmadı; belge bir kanıt değil, prosedürdür. |
| P2/8 | iOS/Android UX ve Web Vitals saha kabulü | Sahip işlemi | Fiziksel cihaz gerekir. Mock arka uçla 320/390/1280 genişlikte incelenen ekranlarda yatay taşma görülmedi. |

## 1 · Backend ve veritabanı

| Bulgu | Durum | Yapılan / kalan |
|---|---|---|
| Hesaba bağlanmamış 8 başvuru | Kodda tamam (görünürlük ve karar aracı) | P0/3. Bağlantı, başvuru sahibi başvurudaki telefon ya da e-postayla giriş yaptığında kendiliğinden kurulur (`bind_provider_applications_to_current_user`). |
| 4 profilde eski aktif/onaylı bayrak | Sahip işlemi | P0/2. Yayın kapısı bu profilleri zaten döndürmüyor. |
| Yayımlı usta teklifi 0 | Sahip işlemi | P0/4. |
| Usta belge yüklemesi 0 | Sahip işlemi | Akış testlerde kanıtlı; gerçek belge P0/4 ile gelir. |

## 2 · Frontend ve mobil deneyim

| Alan | Durum | Yapılan |
|---|---|---|
| Ana sayfa metni | Kodda tamam (PR birleşince canlı) | 9 Kasım kaydı. |
| Katalog: satılabilir hizmet 0 iken boş durum ve CTA | Kodda tamam | Yayımlı teklif yokken sayfa başında "Hizmetler satışa hazırlanıyor. Fiyat ve randevu, ustalar yayına girdiğinde bu sayfada açılır." notu çıkar; alt başlık "Kapsamı ve dahil olmayanları şimdiden incele." olur. "Açılıştan haberdar ol" bağlantısı artık yalnızca ön kayıt açıkken görünür (önceden kapalı forma gidiyordu). |
| Usta listesi boş durumu | Kodda tamam | Usta arayan müşteriye tek seçenek olarak "Usta Ol" gösteriliyordu. Artık birincil eylem "Hizmetleri Keşfet", ikincil "Usta mısın? Başvur"; metin incelemenin sürdüğünü söylüyor. |
| Müşteri paneli | Kodda tamam | Mobilde "Takvimine ekle" bağlantısı "Detayı Gör" düğmesinin altında kalıyordu; düzeltildi. Hızlı işlem kutuları eklendi (Hizmet seç, Favori ustalarım, Adreslerim, Destek). Hiç siparişi olmayan müşteri sıfırlarla dolu pano yerine "şimdi ne yapabilirim" adımlarını görür. "MY FUWU" → "HESABIM", "Ustanız yola çıktı" → "Ustan yola çıktı" (uygulamanın geri kalanıyla aynı hitap). |
| Usta paneli | Kodda tamam | Yayındaki profilde "Yayına hazır olmak için 2 adım kaldı" çelişkisi giderildi. |
| Admin | Kodda tamam | Başvuru kaynak kararı (P0/3) ve haftalık ölçüm paneli (9 Kasım kaydı). Yayın kaldırma / doğrulama / belge kararının gerçek kullanıcıyla kabulü sahip işlemi. |
| PWA, gerçek cihaz, erişilebilirlik ölçümü | Sahip işlemi | — |
| "GELİŞTİRİYORUZ" duyurusu | Sahip işlemi | Ayarlar → "Eski Duyuruyu Temizle". |

Bu turda bilinçli olarak yapılmayanlar: renk paleti, servis katmanı ve mevcut RLS kuralları değişmedi. Yeni sayfa ya da yeni gezinme yapısı eklenmedi; mevcut ekranlar gerçek ön lansman durumuna (0 usta, 0 sipariş) göre düzeltildi.

## 3 · Güvenlik ve kalite

| Kontrol | Durum | Yapılan / kalan |
|---|---|---|
| Anonim / authenticated SECURITY DEFINER uyarıları | Kodda tamam + üretime uygulanacak | 9 Kasım kaydı. Matris 75 fonksiyona güncellendi (2 yeni admin RPC). |
| BOLA / IDOR kabulü (admin ve usta RPC'leri) | Kodda tamam | `scripts/bola-db-checks.mjs`: yabancı bir oturum, API'den çağrılabilen 75 fonksiyondan bilinçli olarak herkese açık 12'si dışındaki 63'ünü kurbanın usta ve başvuru kimlikleriyle dener. 59'u reddetti, 4'ü yalnızca boş ya da çağıranın kendi durumunu döndürdü; hiçbiri kurbanın verisini döndürmedi, kurban kayıtları değişmedi; doğrudan tablo güncelleme ve silme RLS ile engellendi. Her CI koşusunda çalışır. Kapsam dışı: sipariş kimliğiyle denemeler (gerçek sipariş yok) ve HTTP katmanı; bunlar mevcut `tests/security` paketinde ayrıca sınanıyor. |
| RLS initplan, indekssiz FK, çift indeks, politikasız 7 tablo | Kodda tamam + üretime uygulanacak | 9 Kasım kaydı. |
| Leaked-password protection | Değişiklik gerekmedi + sahip kararı | Uygulama parola ile giriş kullanmıyor. |
| npm audit 16 orta | Kodda tamam (sınıflandırma) | `docs/security/dependency-risk-classification.md`. |
| Private belgelerde owner–admin–yabancı erişimi | Değişiklik gerekmedi | DB ve API testlerinde kanıtlı; BOLA taraması belge fonksiyonlarını da kapsar. Zararlı dosya taraması sağlayıcı kararı bekliyor. |
| SMS hook, CAPTCHA / Turnstile, Google redirect | Sahip işlemi | Supabase paneli. |
| Yedekleme / geri yükleme ve geri dönüş planı | Plan kodda; deneme sahipte | P1/7. |

## Üretime uygulama sırası

1. `docs/production/ROLLBACK_AND_RESTORE.md` bölüm 1 ve 2: yedek al, geri yükleme denemesini yap.
2. PR #2'yi birleştir (Vercel dağıtır).
3. `supabase db push` ile üç migration'ı uygula: `20261110000100`, `20261110000200`, `20261111000100`.
4. Aynı belgenin 5. bölümündeki kontrolleri yap; Advisor sayılarını kaydet.
5. Admin → Başvurular: 10 başvuruyu sınıflandır. Admin → Ustalar: 4 deneme profilini işaretle ve yayından kaldır.
6. `npm run audit:public-visibility -- --site=https://www.fuwu.com.tr` → PASS.

Yayın kararları değişmedi: ödemesiz ön lansman koşullu NO-GO (canlı kabul bekliyor), gerçek satış NO-GO (şirketleşme ve ödeme kuruluşu).
