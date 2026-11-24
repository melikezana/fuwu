# Ön Bilgilendirme Formu ve Mesafeli Hizmet Sözleşmesi (24 Kasım 2026)

Dayanak: 6502 s. TKHK m.48, 73/A · Mesafeli Sözleşmeler Yönetmeliği (son değişiklikler: RG 23.08.2022/31932, RG 24.05.2025/32909; m.12 değişikliği 01.01.2026'dan beri yürürlükte).

## Ne yapıldı

| Yönetmelik | Uygulama |
| --- | --- |
| m.5/1-a…k ön bilgilendirme içeriği | `src/lib/legal/distance-contract.ts` tek kaynak: hizmet, kapsam, dahil olmayanlar, ekstralar, toplam (vergiler dahil), ödeme yöntemi, ifa, cayma (14 gün, usul, bildirim adresi), m.15/1-h istisnası, teminat yok, hakem heyeti / 73/A arabuluculuk. Usta **ve** FUWU için ad/unvan, VKN/TCKN (veya MERSİS), açık adres, telefon. |
| m.5/7, m.6/6 aracı hizmet sağlayıcı müteselsil sorumluluğu | FUWU kimliği metinde; usta veya FUWU kimliği eksikse sipariş veritabanında reddedilir (`legal_identity_incomplete`), eksik usta satışta görünmez. |
| m.6/1 en az 12 punto | `.legal-doc` 16 px (baskıda 12 pt). |
| m.6/2 ödeme yükümlülüğünden hemen önce (a)(d)(g)(h) | Son adımda kapsam + toplam + "14 gün cayma hakkın var" kutusu + istisna metni bir arada; ödeme yöntemleri önceki kartta. |
| m.7 teyit | "Ön Bilgilendirme Formu'nu okudum, Mesafeli Hizmet Sözleşmesi'ni kabul ediyorum" kutusu; API ve veritabanı onaysız / eski sürümle sipariş almaz. |
| m.8 ödeme yükümlülüğü bildirimi | Onay düğmesinin hemen üstünde ve mobil alt çubukta. |
| m.9/2 hizmette cayma sözleşme günü başlar | Metinde. |
| m.11/2, 11/5 web üzerinden cayma ve derhâl teyit | "Siparişi İptal Et" (onay penceresiyle); iptal sonrası "bildirimin … alındı ve ustaya iletildi". Model cayma formu (Ek) sözleşmenin sonunda. |
| m.15/1-h onayla ifasına başlanan hizmet | 14 gün içindeki randevuda ayrı ve zorunlu onay kutusu; onay zamanı siparişe yazılır. |
| Cayma hizmete başlanana kadar | Müşteri "usta yolda" iken de ücretsiz iptal edebilir (önceden engelliydi). |
| m.5/6 ispat yükü | Siparişe değiştirilemez: metin sürümü, onay zamanı, erken ifa onayı, iki tarafın o anki kimlik bilgileri. |
| Kalıcı erişim | `/orders/[id]/belgeler`: siparişe özel form + sözleşme + cayma formu, "Yazdır / PDF olarak kaydet". Örnek metinler: `/on-bilgilendirme-formu`, `/mesafeli-hizmet-sozlesmesi` (altbilgide). |

## Kimin ne girmesi gerekiyor

- **FUWU (admin → Ayarlar → "Yasal ·" alanları):** ad/unvan, vergi kimlik no (şahısta T.C. kimlik no) veya MERSİS, açık adres, telefon, e-posta. Bunlar girilmeden **hiçbir sipariş alınmaz**; bilgiler herkese açık örnek metinde ve her sözleşmede görünür.
- **Her usta (usta paneli → Ödeme Bilgileri):** yasal ad, TCKN/VKN, (varsa) vergi dairesi, açık adres. IBAN artık isteğe bağlı (yalnızca online kart için). Eksik ustaya panelde uyarı çıkar; tamamlayana kadar hizmetleri satışta görünmez.

## Kanıt

typecheck, lint, unit (309), security (122), mock (77), build, http (20) geçti; integration 448 kontrol (5 yeni "Distance contract" veritabanı kontrolü); pentest 54/54; `scripts/verify-direct-purchase-ui.mjs` 390/1440 px uçtan uca (form 16 px, bağlantı formu açar, erken ifa onayı olmadan sipariş verilemez).

## Hâlâ açık (hukukçuya)

- Metinler mevzuata göre hazırlandı ama avukat incelemesinden geçmedi.
- Sözleşmenin e-postayla da gönderilmesi (kalıcı veri saklayıcısı) için işlemsel e-posta altyapısı yok; şu an sipariş sayfasından erişim ve PDF kaydı var.
- ETBİS kaydı, şirketleşme sonrası MERSİS ve fatura düzeni.
