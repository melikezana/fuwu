import type { Metadata } from "next";
import { PolicyPage, type PolicySection } from "@/app/_policy/PolicyPage";

export const metadata: Metadata = {
  title: "Kullanım Şartları",
  description: "FUWU hizmet pazaryeri kullanım şartları.",
};

const sections: PolicySection[] = [
  {
    title: "Hizmetin niteliği",
    body: [
      "FUWU’da hizmetini ve paketini seç, ustaları karşılaştır, müsait gün ve saatini belirle. Satın aldığın hizmetin kapsamı, adresi ve toplam bedeli sipariş özetinde gösterilir.",
      "Bir kategorinin görünmesi, o kategoride satın alınabilir hizmet bulunduğu anlamına gelmez. Satın alma için aktif hizmet kaydı ve uygun randevu gerekir.",
    ],
  },
  {
    title: "Kullanıcı sorumlulukları",
    body: [
      "Kullanıcılar doğru, güncel ve yanıltıcı olmayan bilgi paylaşmalıdır.",
      "Platform; kötüye kullanım, sahte başvuru, taciz, spam veya güvenliği riske atan işlemler için erişimi sınırlama hakkını saklı tutar.",
    ],
  },
  {
    title: "Usta başvuruları",
    body: [
      "Usta başvuruları değerlendirme sürecine alınır. Başvuru yapılması, profilin otomatik olarak yayına alınacağı anlamına gelmez.",
      "FUWU, hizmet kalitesi, kategori uygunluğu, bölge bilgisi ve iletişim hazırlığı gibi kriterlere göre başvuruları inceleyebilir.",
    ],
  },
  {
    title: "FUWU Partner modeli",
    body: [
      "Başvuru ve teklif gönderme ücreti alınmaz. Standart hizmetler, kapsamı ve fiyatı belli paketler olarak sunulur. Usta hizmet fiyatını, çalışma bölgelerini ve takvimindeki müsait saatleri yönetir.",
      "Başlangıç usta komisyon ayarı %10, müşteri platform ücreti varsayılanı %0'dır. İşlemde geçerli oranlar, ödeme kuruluşu kesintileri ve net kazanç ilgili işlem kayıtlarında ayrı gösterilir. Başvuru veya onay, iş ve kazanç garantisi sağlamaz.",
    ],
  },
  {
    title: "Satın alma, ödeme ve ücretler",
    body: [
      "Hizmeti, paketini ve istersen ekstralarını seçip ustanın uygun saatini onayladığında siparişin oluşur. Seçtiğin ekstralar fiyatlarıyla birlikte siparişe sabitlenir.",
      "Kapıda ödemede toplam tutar, hizmet tamamlandığında doğrudan ustaya ödenir; usta hizmete başlamadan ödeme talep edemez ve sipariş tutarının üstünde ücret isteyemez. Kapsam dışı bir iş gerekirse önce senin onayın alınır.",
      "Online kartla ödeme yalnızca ödeme ekranında sunulduğunda kullanılabilir; şu anda yalnızca yetkili test oturumlarında iyzico sandbox ile çalışır ve gerçek tahsilat yapılmaz. Kart bilgileri iyzico’nun ödeme ekranına girilir; FUWU kart verisi saklamaz.",
      "Hizmet kartında ve ödeme ekranında gördüğün tutar, ödeyeceğin son tutardır; FUWU platform hizmeti bu fiyata dahildir ve sonradan ayrı ücret eklenmez. Ödeme öncesinde toplam tutarı onaylarsın. Usta komisyonu ustanın satış bedeli üzerinden hesaplanır ve müşteriden ayrıca alınmaz. Yeni ücret ayarları mevcut siparişin tutarını değiştirmez.",
    ],
  },
  {
    title: "İptal, iade ve destek",
    body: [
      "Hizmete başlanana kadar (usta yolda olsa bile) sipariş detayından ücretsiz iptal edebilirsin. Kapıda ödemeli siparişte ödeme yapılmadığı için iade gerekmez. Kartla ödenen siparişte tam iade müşteri platform ücretini de içerir ve ödeme kuruluşundan doğrulanmadan tamamlandı olarak gösterilmez.",
      "Devam eden veya tamamlanan hizmette sorun yaşarsan sipariş detayındaki destek eylemini kullan. Değerlendirme yalnızca tamamladığın ve doğrulanan hizmet için yapılabilir.",
      "Her siparişte, hizmeti sunan ustanın ve FUWU'nun kimlik bilgileriyle doldurulmuş Ön Bilgilendirme Formu ve Mesafeli Hizmet Sözleşmesi onayına sunulur; onayladığın metinlere sipariş sayfandaki \"Ön bilgilendirme formu ve sözleşme\" bağlantısından her zaman ulaşırsın. Örnek metinler: fuwu.com.tr/on-bilgilendirme-formu ve fuwu.com.tr/mesafeli-hizmet-sozlesmesi.",
      "Siparişten itibaren 14 gün içinde gerekçesiz cayma hakkın vardır. Randevun bu süre içindeyse ve hizmetin başlamasını onaylarsan, usta hizmete başladığı anda cayma hakkın sona erer; hizmete başlanana kadar ücretsiz iptal edebilirsin.",
    ],
  },
];

export default function TermsPage() {
  return (
    <PolicyPage
      description="FUWU hizmetlerini kullanırken geçerli temel kurallar ve sorumluluklar."
      descriptionKey="policy.terms.description"
      sections={sections}
      title="Kullanım Şartları"
      titleKey="policy.terms.title"
      updatedAt="30 Ekim 2026"
    />
  );
}
