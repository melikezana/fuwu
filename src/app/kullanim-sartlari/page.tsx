import type { Metadata } from "next";
import { PolicyPage, type PolicySection } from "@/app/_policy/PolicyPage";

export const metadata: Metadata = {
  title: "Kullanım Şartları",
  description: "Fuwu hizmet pazaryeri kullanım şartları.",
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
      "Fuwu, hizmet kalitesi, kategori uygunluğu, bölge bilgisi ve iletişim hazırlığı gibi kriterlere göre başvuruları inceleyebilir.",
    ],
  },
  {
    title: "Test ödemesi ve ücretler",
    body: [
      "Ödemeler şu anda yalnızca iyzico sandbox ortamında denenir. Gerçek tahsilat yapılmaz. Kart bilgileri iyzico’nun ödeme ekranına girilir; FUWU kart verisi saklamaz.",
      "Müşteri platform ücreti varsa hizmet bedelinden ayrı gösterilir. Toplam ödeme öncesinde açıklanır ve ek ücret için ayrıca onayın istenir. Usta komisyonu hizmet bedeli üzerinden hesaplanır. Yeni ücret ayarları mevcut siparişin tutarını değiştirmez.",
    ],
  },
  {
    title: "İptal, iade ve destek",
    body: [
      "Randevu başlamadan ve usta yola çıkmadan sipariş detayından iptal isteyebilirsin. Test ortamındaki tam iade, müşteri platform ücretini de içerir. Ödeme kuruluşundan doğrulanmadan iade tamamlandı olarak gösterilmez.",
      "Devam eden veya tamamlanan hizmette sorun yaşarsan sipariş detayındaki destek eylemini kullan. Değerlendirme yalnızca tamamladığın ve doğrulanan hizmet için yapılabilir.",
      "Canlı satışa geçilmeden önce şirket bilgileri, ön bilgilendirme, mesafeli sözleşme, cayma hakkı, vergi ve belge düzeni ayrıca tamamlanıp doğrulanmalıdır. Bu ekran test ortamındaki işleyişi açıklar.",
    ],
  },
];

export default function TermsPage() {
  return (
    <PolicyPage
      description="Fuwu hizmetlerini kullanırken geçerli temel kurallar ve sorumluluklar."
      descriptionKey="policy.terms.description"
      sections={sections}
      title="Kullanım Şartları"
      titleKey="policy.terms.title"
      updatedAt="28 Ekim 2026"
    />
  );
}
