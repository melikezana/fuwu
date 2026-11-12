# 9 Kasım 2026 CEO & CTO denetimi · Eylem kaydı

Kaynak rapor: "FUWU / CEO & CTO Raporu · Teknik, Ürün ve Güvenlik Denetimi" (9 Kasım 2026, main `8ebd8da`).
Bu kayıt rapordaki her bulguyu tek tek listeler: kodda ne değişti, kanıtı nerede, geriye ne kaldı.

Durum anahtarı:

- **Kodda tamam** — değişiklik bu dalda, testle kanıtlı.
- **Üretime uygulanacak** — kod/migration hazır; üretim veritabanına uygulanması sahibin onayını bekliyor.
- **Sahip işlemi** — kodla yapılamaz; panelden veya gerçek kişiyle yapılır. Adımı yazıldı.
- **Değişiklik gerekmedi** — bulgu incelendi, mevcut kod zaten karşılıyor; kanıtı belirtildi.

Bu çalışmada üretim veritabanına, Supabase paneline veya canlı siteye hiçbir yazma işlemi yapılmadı.

## Doğrulama özeti (bu dal)

| Kontrol | Önce | Sonra |
|---|---|---|
| TypeScript + ESLint + build | PASS | PASS |
| Birim testleri | 182 | 186 PASS |
| Güvenlik test paketi | 96 | 100 PASS |
| PostgreSQL entegrasyonu (4 senaryo) | 352 | 368 PASS |
| Hata enjeksiyonu (mock) | 77 | 77 PASS |
| Migration | 82 | 84 (2 yeni, üretime uygulanmadı) |
| Playwright E2E (39 × 2) | PASS | Bu ortamda çalıştırılamadı; CI'da koşacak |

Entegrasyon testleri yerelde PostgreSQL 16 ile koşuldu; CI PostgreSQL 17 kullanır.

## Önemli bulgular (rapor sayfa 1)

| # | Bulgu | Durum | Yapılan / kalan |
|---|---|---|---|
| 1 | P0 Operasyonel: 4 deneme profili active/approved, yayın incelemesi bekliyor; gerçek doğrulanmış usta yok | Sahip işlemi | Kod tarafı zaten kapalı: `provider_is_published` yalnızca `real + approved` kaydı yayımlar, 4 kimlik `docs/prelaunch-confirmed-test-providers.json` ile uygulama katmanında da engelli (`tests/unit/prelaunch.test.ts`). Kalan: Control Center → Ustalar → her profil için "Test kaydı olarak işaretle" ve "Yayından Kaldır". Ardından `npm run audit:public-visibility -- --site=https://www.fuwu.com.tr` ile anonim kabul testi. |
| 2 | P0 Dönüşüm: usta paketi 0, sipariş 0, ön kayıt 0; ön kayıt kapalı | Sahip işlemi | Ürün akışı hazır. Ön kayıt, #5 kabul testinden sonra Ayarlar'dan açılır. İlk gerçek usta senaryosu eylem planı #4. |
| 3 | P1 Güven: ana sayfa "doğrulanmış usta / öde" vaadi | Kodda tamam | Aşağıda "Frontend & UX" 1–3. |
| 4 | P1 Güvenlik: 16 anonim / 75 oturumlu SECURITY DEFINER uyarısı | Kodda tamam + üretime uygulanacak | Aşağıda "Güvenlik" 2. |
| 5 | P1 Kabul: gerçek Google OAuth, SMS, kimlik belgesi, fiziksel cihaz | Sahip işlemi | Kodla kanıtlanamaz. Adımlar "Sahip işlemleri" bölümünde. |

## 01 · Gerçek pazaryeri durumu

| Bulgu | Durum | Yapılan / kalan |
|---|---|---|
| 10 başvurunun 8'i kullanıcı hesabına bağlı değil; kaynağı sınıflandırılmalı | Kodda tamam (görünürlük) + sahip işlemi (karar) | Admin ana sayfasına "Haftalık lansman ölçümleri" paneli eklendi: bağlı/bağsız başvuru sayısı duruma göre gösterilir ve başvuru listesine bağlar. Her başvurunun gerçek/deneme/eksik kararı insan incelemesidir. |
| Deneme kayıtları gerçek ticari faaliyet sayılmamalı | Değişiklik gerekmedi | Admin metrikleri yalnızca `record_kind='real'` kayıtları sayar; yeni haftalık ölçümler de aynı kuralı uygular. |
| Gerçek/yayına onaylı usta 0, yayımlı paket 0 | Sahip işlemi | Eylem planı #4. |

## 02 · Frontend & UX

| # | Bulgu | Durum | Yapılan |
|---|---|---|---|
| 1 | Ana sayfa ilk ekran: "ustası doğrulanmış / öde" gerçek duruma göre yazılmalı | Kodda tamam | Yeni metin: "Kapsamı ve fiyatı baştan belli ev hizmetleri. Hizmeti seç, ustayı tanı, zamanını planla." Altında aşama notu: "Usta ağımızı kuruyoruz. Online satın alma henüz açılmadı." Slogan "Evinin işi, FUWU'nun işi." korundu. `src/components/home/HeroSection.tsx` |
| 2 | Kısa metinler: "Hizmeti seç / Ustayı tanı / Zamanını planla" | Kodda tamam | "Seç. Planla. Satın al." ve "Tek fiyatla öde" adımı kaldırıldı. `src/components/home/HomePremiumPanels.tsx` |
| 3 | Birincil CTA "Hizmetleri Keşfet"; uygun yerde "Açılıştan Haberdar Ol" ve "Usta Ol" | Kodda tamam | İlk ikisi zaten vardı. "Açılıştan Haberdar Ol" bağlantısı yalnızca ön kayıt anahtarı açıkken görünür (kapalı forma yönlendirmez). `src/services/commerce/discovery.ts` |
| 4 | Güven taahhütleri ve Güven Merkezi satın alma varmış gibi okunmasın | Kodda tamam | İkisine de "Online satın alma henüz açılmadı…" notu eklendi. Hukuki metin ve doğrulama adımları kısaltılmadı. `TrustPromise.tsx`, `src/app/guven/page.tsx` |
| 5 | Arama motoru açıklaması "satın al" diyor | Kodda tamam | Varsayılan SEO açıklaması ön lansmana uyarlandı. `src/lib/seo.ts` |
| 6 | Katalog: gerçek usta eşleşmesi olmadan satın alınabilir izlenimi vermemeli | Değişiklik gerekmedi | Teklifi olmayan hizmet "Henüz satışa açılmadı" + "Kapsamı İncele" gösterir; fiyat ve "Usta ve Randevu Seç" yalnızca yayımlı gerçek teklif varsa çıkar. |
| 7 | Test profilleri URL/API/arama üzerinden sızmıyor mu, canlı anonim testle kanıtla | Kodda tamam (test aracı) + sahip işlemi (koşu) | `scripts/verify-public-provider-visibility.mjs`: yalnızca anonim anahtarla REST, RPC, site sayfaları ve sitemap'i tarar; service_role anahtarını reddeder. Bu ortamdan canlı siteye erişim olmadığı için koşu sahibe kaldı. |
| 8 | Duyuru: veritabanında "GELİŞTİRİYORUZ" değeri duruyor, kod gizliyor | Sahip işlemi | Rapor ayrı onay istiyor. Control Center → Ayarlar → "Eski Duyuruyu Temizle" düğmesi (`clear_legacy_announcement`, audit kaydı düşer). Otomatik silinmedi. |
| 9 | Görseller: bağlantı, lisans, meslek eşleşmesi | Değişiklik gerekmedi (repo) | Lisans kaydı `docs/service-photo-licenses.md`. Gerçek cihazda yüklenme kontrolü sahip işlemi. |
| 10 | Partner onboarding, admin butonu → DB → audit → public kabulü | Sahip işlemi | Akışlar E2E'de yerel Supabase ile yeşil; üretim kabulü gerçek usta ile yapılır (eylem planı #4). |
| 11 | PWA/mobil: gerçek cihaz, ekran okuyucu, saha LCP/INP/CLS | Sahip işlemi | Fiziksel cihaz gerekir. |

Tüm ön lansman metinleri tek kaynaktan gelir: `PRELAUNCH_COPY` (`src/lib/prelaunch.ts`). Satış açıldığında yalnızca bu sabitler güncellenir.
Regresyon testi: `tests/unit/prelaunch.test.ts` ilk ekran ve SEO metninde "doğrulanmış usta / öde / satın al" iddiası kalırsa düşer.

## 03 · Backend & kalite

| Bulgu | Durum | Yapılan / kalan |
|---|---|---|
| Checkout şirketleşme öncesi açılmamalı | Değişiklik gerekmedi | Sunucu anahtarı kapalı; dokunulmadı. |
| 4 eski profil onaylı/aktif bayrak taşıyor ama `real + approved` yayın kaydı yok | Sahip işlemi | Önemli bulgu #1. |
| Ön kayıt: açılmadan önce consent / izin geri alma / anti-spam smoke testi | Değişiklik gerekmedi (kod) + sahip işlemi | İzin sürümü, geri çekme, saatlik hız sınırı ve honeypot DB ve API testlerinde kanıtlı (`scripts/prelaunch-db-checks.mjs`, `tests/security/waitlist.test.ts`). Üretimde açtıktan sonra kendi hesabınla bir kayıt + geri çekme dene. |
| Başvuru tutarlılığı (8/10 bağsız) | Kodda tamam (görünürlük) | "01" bölümü. |
| Operasyon: bildirim, SMS, hata takibi sağlayıcı tarafı izlenmeli | Sahip işlemi | Sağlayıcı panelleri. Haftalık panel destek alınan/çözülen sayısını gösterir. |

## 04 · Güvenlik ve performans

| # | Bulgu | Durum | Yapılan / kalan |
|---|---|---|---|
| 1 | RLS: 7 tabloda politika yok; server-only ise belgele ve Data API erişimini doğrula | Kodda tamam + üretime uygulanacak | 7 tabloya açık "yalnızca sunucu" kısıtlayıcı politikası ve açıklaması eklendi; erişim genişlemez. DB testi anon ve authenticated için 0 satır/ret doğrular. |
| 2 | SECURITY DEFINER: fonksiyon bazında auth.uid(), rol, EXECUTE, search_path kontrolü | Kodda tamam + üretime uygulanacak | 73 fonksiyonun tamamı incelendi: `docs/security/security-definer-matrix.md`. Yetki atlama bulunmadı. 4 gereksiz yetki kaldırıldı (anonim yüzey 13 → 9). CI artık incelenmemiş yeni fonksiyonu reddeder. |
| 3 | Sızmış parola koruması kapalı | Değişiklik gerekmedi (kod) + sahip işlemi | Uygulama parola ile giriş kullanmıyor (yalnızca tek kullanımlık kod ve Google); test bunu kilitler. Panelde Authentication → Providers → Email altında parola ile kaydı kapatmak ya da Pro planda korumayı açmak sahibin kararı. |
| 4 | Performans: 63 RLS initplan, 34 indekssiz FK, 2 çift indeks | Kodda tamam + üretime uygulanacak | Politikalardaki auth çağrıları `(select …)` içine alındı (kural aynı), indekssiz FK'lere indeks, çift indeksler tanım eşleşmesi doğrulanarak kaldırıldı. Yük testi yapılmadı; gerçek trafik oluşunca sorgu planı ayrıca ölçülmeli. |
| 5 | npm audit: 16 moderate | Kodda tamam (sınıflandırma) | `docs/security/dependency-risk-classification.md`. Tamamı derleme/lint/Storybook araç zinciri; canlı istek yolunda değil. Otomatik "fix" Sentry sürümünü düşürdüğü için uygulanmadı. |
| 6 | Belgeler: owner/admin/yabancı erişim, imzalı URL, audit, virüs tarama | Değişiklik gerekmedi (kod) + sahip kararı | Sahip/admin/yabancı erişim, tür/boyut/magic-byte ve sha256 kaydı testlerde kanıtlı. Virüs tarama sağlayıcısı yok (`scan_status='unavailable'` dürüstçe kaydediliyor); sağlayıcı seçimi sahibin kararı. |
| 7 | 23 unauthorized_action, hepsi 30 Ekim; sentetik/gerçek ayrımı | Kodda tamam (görünürlük) + sahip işlemi | Haftalık panel son 14 günü gün, kayıt türü, hesap sayısı ve oturumsuz deneme sayısıyla gösterir; IP veya kişisel veri içermez. 30 Ekim tarihli migration'lar repoda var, bu nedenle o günkü test koşusu olası kaynaktır; ancak bu bir varsayımdır, kesin hüküm panel üretimde açılınca verilir. |
| 8 | Panel/kanca aktivasyonu (SMS hook, Turnstile) ayrıca teyit | Sahip işlemi | Supabase paneli. |

Korunan eski finans tabloları (`orders`, `order_payments`, `payouts`, `disputes`, `webhook_events`) bilinçli olarak indeks/politika değişikliğinin dışında tutuldu; bu tablolardaki advisor uyarıları kalır.

## 05 · Öncelikli eylem planı

| # | Zaman | İş | Durum |
|---|---|---|---|
| 1 | İlk 7 gün · P0 | 4 deneme hesabı mark_test + unpublish; envanter, backup, audit | Sahip işlemi — araç hazır (Control Center + `scripts/prelaunch-provider-cleanup.mjs` + görünürlük testi) |
| 2 | İlk 7 gün · P0 | "Doğrulanmış usta / öde" iddiasını hizala | Kodda tamam |
| 3 | 1–2 hafta · P0 | Başvuruları sınıflandır; 8 bağsız başvuruyu araştır | Görünürlük kodda tamam; karar sahipte |
| 4 | 1–2 hafta · P0 | Bir gerçek ustayla profil → belge → paket → takvim → yayın onayı | Sahip işlemi |
| 5 | 2–3 hafta · P1 | Açılış bilgilendirmesini izin/KVKK/abuse testi sonrası aç | Kod kanıtlı; açma kararı sahipte |
| 6 | 2–3 hafta · P1 | Gerçek Google OAuth, telefon OTP, SMS kanca/Turnstile | Sahip işlemi |
| 7 | 3–4 hafta · P1 | SECURITY DEFINER/GRANT taraması, parola koruması, bağımlılık sınıflandırması | Kodda tamam; migration üretime uygulanacak |
| 8 | 3–4 hafta · P2 | Gerçek cihaz, kullanıcı oturumu, Web Vitals, erişilebilirlik | Sahip işlemi |
| — | İzleme | Haftalık usta doğrulama, yayımlı mağaza, izinli kayıt, konversiyon, çözülen destek | Kodda tamam; migration üretime uygulanacak |

Yayın kararları değişmedi: ödemesiz ön lansman koşullu NO-GO (canlı kabul bekliyor), gerçek satış NO-GO (şirketleşme ve ödeme kuruluşu).

## Üretime uygulama sırası

1. Bu dalı incele ve `main`'e al (Vercel dağıtır; metin değişiklikleri hemen yayına girer).
2. Migration'ları önce staging/izole ortamda, sonra üretimde uygula: `supabase db push`.
   - `20261110000100_audit_advisor_hardening.sql` — veri, kolon ve fonksiyon gövdesi değiştirmez; yeniden çalıştırılabilir.
   - `20261110000200_weekly_launch_metrics.sql` — yalnızca yeni bir admin RPC ekler.
3. Supabase Security ve Performance Advisor'ı yeniden çalıştır; sayıları bu kayda işle.
4. Admin ana sayfasında "Haftalık lansman ölçümleri" panelinin açıldığını doğrula.
5. `npm run audit:public-visibility -- --site=https://www.fuwu.com.tr` çalıştır; sonuç PASS olmalı.

## Sahip işlemleri (kodla yapılamayanlar)

- 4 deneme profilini Control Center'dan "Test kaydı olarak işaretle" ve "Yayından Kaldır".
- Eski "GELİŞTİRİYORUZ" duyurusunu Ayarlar'dan temizle.
- 10 başvuruyu gerçek / deneme / eksik olarak sınıflandır.
- Bir gerçek ustayla uçtan uca yayın senaryosunu tamamla.
- Gerçek Google hesabı ve gerçek telefonla giriş, SMS kodu ve belge yükleme kabulü.
- Supabase panelinde SMS hook, Turnstile ve parola ayarlarını teyit et.
- iPhone ve Android gerçek cihazda katalog, başvuru ve admin görevlerini dene.
- Virüs tarama sağlayıcısı kararı.
- Şirketleşme ve ödeme kuruluşu sözleşmesi (gerçek satışın ön koşulu).
