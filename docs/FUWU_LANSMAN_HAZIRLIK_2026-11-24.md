# Lansman hazırlık turu · 24 Kasım 2026

Dal: `feat/lansman-hazirlik-2026-11-23`. **Migration yok**, üretim veritabanına ve canlı siteye yazma yapılmadı. Renk token'ları, servis katmanı ve RLS kuralları değişmedi.

## 1 · Backend akışları

Mevcut test zincirinin tamamı bu ortamda yeniden koşuldu:

| Kontrol | Sonuç |
|---|---|
| TypeScript, ESLint, build | PASS |
| Birim testleri | 297 PASS (önce 286) |
| Güvenlik test paketi | 117 PASS (önce 103) |
| İzole PostgreSQL 16: 88 migration temiz kurulum, dolu yükseltme, üretim sırası tekrarı | 392 kontrol PASS |
| Hata enjeksiyonu (mock) | 77 PASS |
| Gerçek HTTP korumaları (`next start`) | 20 PASS |
| Sızma testi (`test:pentest`, yerel) | 54/54 PASS (önce 50/54) |

Bulunan ve düzeltilen sorunlar:

- **Cron uçları** (`emergency-sla-sweep`, `ai-assistant-health-check`): `CRON_SECRET` tanımlı değilken yetkisiz isteğe 500 dönüp yapılandırma durumunu ele veriyordu. Tek ortak kontrol (`getCronAuthorizationError`) eklendi: her durumda 401, eksik anahtar sunucu günlüğüne yazılır. Service role yoksa 503.
- **Fuwi önbelleği kullanıcılar arası veri taşıyordu**: aynı mesajı yazan ikinci kişi, ilk kişinin konuşma kimliğini ve görsel referansını alıyordu; ikinci kişinin konuşması da kaydedilmiyordu. Önbellek artık yalnızca kullanıcıdan bağımsız değerlendirmeyi tutar; konuşma her kullanıcı için ayrı kaydedilir.
- **Asistan süre aşımı**: iki sağlayıcı tanımlıyken deneme süreleri toplamı (2×25 sn + 25 sn) Vercel'in 60 sn sınırını aşabiliyordu. İstek başına 45 sn bütçe eklendi; süre azalınca yeni model çağrısı başlatılmaz, kural tabanlı değerlendirmeye geçilir.

Doğrulanamayan: gerçek Supabase üzerinde uçtan uca (Playwright) akışlar bu ortamda koşulamadı (Docker yok, tarayıcı indirmesi ağ politikasınca kapalı). CI'daki `e2e.yml` bunları koşar; Fuwi adıyla değişen iki seçici güncellendi.

## 2 · Güvenlik

- **Next.js 16.4.3 → 16.4.6**: üretim bağımlılıklarındaki 7 orta seviye uyarı kapandı (HttpOnly çerez sızıntısı, önbellek zehirleme vb.). `npm audit --omit=dev` = 0. Kalan 11 orta uyarı yalnızca geliştirme araçlarında (Storybook, typescript-eslint) ve henüz düzeltmesi yayınlanmamış.
- **Yapay zekâ (OWASP LLM Top 10 2025)** — `src/lib/ai/guardrails.ts`:
  - LLM01: kullanıcı verisi `<kullanici_verisi>` etiketli blokta gider, etiketi taklit ederek bloktan çıkamaz; Türkçe/İngilizce enjeksiyon kalıpları işaretlenir ve kaydedilir (içerik kaydedilmez).
  - LLM02/LLM05: model çıktısından telefon, e-posta, bağlantı, alan adı, kart benzeri sayı, HTML ve görünmez/yön değiştiren karakterler silinir. Fotoğrafa gizlenmiş "şu numarayı ara" türü oltalama kullanıcıya ulaşmaz. 112/155/187 gibi acil numaralar korunur.
  - LLM10: istek başına süre bütçesi + site geneli saatlik yapay zekâ bütçesi (`AI_ASSISTANT_HOURLY_BUDGET`, varsayılan 300). Bütçe dolarsa asistan kapanmaz, kural tabanlı moda geçer.
  - Talimat seti: kapsam dışı istekler (ödev, kod, sağlık, siyaset) reddedilir; asistan yapay zekâ olduğunu gizlemez, fiyat/garanti sözü vermez, kişisel veri istemez.
  - Koordinatlar ve konuşma kimliği doğrulanır.

## 3 · Yapay zekâ asistanı: adı **Fuwi**, küçük maskotlu

| Seçenek | Artı | Eksi |
|---|---|---|
| **Fuwi** (seçilen) | Türkiye'de başarılı asistanların kalıbı: kısa, markadan türeyen, -i ile biten (Garanti BBVA **Ugi**, VakıfBank **Vibi**, İş Bankası **Maxi**). Her anılışta FUWU'yu hatırlatır, ayrı marka gibi tescil edilebilir, maskota uygun. | Tek başına işlevi anlatmaz → "FUWU'nun yapay zekâ ev asistanı" alt yazısıyla birlikte kullanılır. |
| Kalfa | Ustanın yardımcısı; işlevi kültürel olarak anlatır. | Genel kelime, tescil edilemez; "kapıma kalfa mı gelecek" karışıklığı. |
| FUWU Akıllı Asistan (eski) | Açık. | Akılda kalmaz; her rakipte aynı ifade. |

**Maskot: evet, küçük ve insan olmayan.** Çatılı ev biçiminde turuncu gövde, iki göz, gülümseme ve çatıda yapay zekâ kıvılcımı (`FuwiMascot.tsx`). Gerekçe: soğuk başlangıçtaki bir markada tanınırlığı artırır ve sosyal medyadaki karakter stratejinle (Lina, Şükriye Teyze) uyumludur. Sevimli maskotların güveni artırdığına dair çalışmalar var; aynı nedenle manipülasyon eleştirisi de var. Bu yüzden maskot insan taklidi yapmaz ve her ekranda "yapay zekâ asistanı" yazar. Gözler 5,5 sn'de bir kırpar; hareket azaltma tercihinde animasyon kapalıdır.

Önerilen sonraki adım: "Fuwi" adının 9, 35 ve 42. sınıflarda marka başvurusu (FUWU tescilinin yanında).

## 4 · Ön yüz

- **Tek slogan:** "Evinin işi, FUWU'nun işi." Diğer bölüm başlıkları slogan olmaktan çıkarıldı ("Sorununu anlat. Çözümü FUWU bulsun.", "Kapsamı belli. Fiyatı açık.", "Kapını açmadan önce…" kaldırıldı).
- **Sadeleşme:** İki ayrı "nasıl çalışır" bölümü (4 + 3 adım) tek Fuwi bandında birleşti (3 adım). Sıra: arama → popüler hizmetler → Fuwi → ustalar/örnekler → güven → SSS.
- **Aradığını bulma:**
  - Arama Türkçe ekleri tolere eder: "tesisatçı", "elektrikçi", "musluklar", "çilingire" artık sonuç verir (önce boştu).
  - Sorun anlatımından kategori çıkarılır: "lavabonun altından su damlatıyor" → Tesisat. Fuwi'nin kural tabanlı motoru yeniden kullanıldı.
  - Acil işaret varsa ("gaz kokusu", "prizden kıvılcım") katalogun üstünde 112/187 uyarısı çıkar.
  - Sonuç yoksa ziyaretçi kaybolmaz: aradığı metin Fuwi'ye hazır yazılmış olarak aktarılır.
  - Ana sayfa aramasının altında 5 hızlı ihtiyaç bağlantısı (Su kaçağı, Elektrik arızası, Ev temizliği, Kapıda kaldım, Boya badana).

## 5 · Örnek usta profilleri

`/ornek-profiller` ve `/ornek-profiller/[slug]`: 11 aktif kategorinin her birinde bir örnek. Her profilde portre, deneyim, hizmet bölgeleri, yapılan işler, 2 iş fotoğrafı, 2 belge türü ve "usta gelmeden önce" listesi var.

**"Demo" yerine "Örnek" seçildi:** Türkçede herkesin anladığı kelime; "demo" yazılım dilidir. Görsellerin içinde "ÖRNEK · Yapay zekâ görseli", kartlarda "Örnek profil" rozeti, her sayfada açıklama kutusu var.

Kurallar (testle kilitli, `tests/unit/demo-providers.test.ts`):
- **Puan, yorum, fiyat ve tamamlanan iş sayısı yok.** 1 Ağustos 2026'dan beri yalnızca hizmeti satın alan tüketici değerlendirme yapabilir; uydurma yorum, "örnek" etiketiyle bile risklidir.
- Veritabanına yazılmaz; eşleştirmeye, Fuwi önerilerine, sitemap'e ve aramaya girmez. Sayfalar `noindex`; randevu alınamaz.
- Belgeler yalnızca türünü gösterir (ör. "Elektrik Tesisatçısı (Seviye 3) Mesleki Yeterlilik Belgesi", "K3 Yetki Belgesi", "F-Gaz Sertifikası"); numara, kurum logosu, mühür yok. Belge küçük resmi koddan çizilir ve üzerinde çapraz "ÖRNEK" yazar.
- Gerçek usta olmadığı sürece ana sayfa ve `/providers` boş liste yerine örnekleri gösterir; ilk gerçek usta yayına girdiğinde örnekler kendiliğinden ana sayfadan çekilir.

Görsel kaynağı: `docs/ASSET_CREDITS.md` › "Örnek usta profilleri".

## 6 · Canlıya alma

1. Bu PR'ı Vercel önizlemesinde gözle kontrol et: ana sayfa (390 px ve masaüstü), `/services?q=tesisatçı`, `/services?q=gaz kokusu`, `/ornek-profiller`, bir örnek profil, sağ alttaki Fuwi.
2. Veritabanı adımı yok. Birleşince Vercel dağıtır.
3. İsteğe bağlı ortam değişkeni: `AI_ASSISTANT_HOURLY_BUDGET` (varsayılan 300).
4. `CRON_SECRET` Vercel'de tanımlı olmalı; değilse cron uçları artık 401 döner ve günlükte uyarı görünür.

Yayın kararları değişmedi: gerçek satış şirketleşme ve ödeme kuruluşu gelene kadar kapalı.
