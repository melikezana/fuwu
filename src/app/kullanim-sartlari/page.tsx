import type { Metadata } from "next";
import { PolicyPage, type PolicySection } from "@/app/_policy/PolicyPage";

export const metadata: Metadata = {
  title: "Kullanım Şartları | Fuwu",
  description: "Fuwu hizmet pazaryeri kullanım şartları.",
};

const sections: PolicySection[] = [
  {
    title: "Hizmetin niteliği",
    body: [
      "Fuwu, müşterilerin yerel hizmet sağlayıcı profillerini incelemesine ve doğrudan iletişim kurmasına yardımcı olan bir hizmet pazaryeri deneyimi sunar.",
      "Usta profillerindeki fiyat aralıkları ve uygunluk bilgileri bilgilendirme amaçlıdır; nihai kapsam, fiyat ve randevu kullanıcı ile hizmet sağlayıcı arasında netleşir.",
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
    title: "Sorumluluk sınırları",
    body: [
      "Fuwu, kullanıcı ile hizmet sağlayıcı arasındaki doğrudan iletişim ve saha hizmeti sürecinde tarafların kendi beyan ve davranışlarından sorumlu olmadığını belirtir.",
      "Uyuşmazlıklarda kullanıcıların yazılı iletişim kayıtlarını ve hizmet kapsamını açık tutması önerilir.",
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
      updatedAt="15 Mayıs 2026"
    />
  );
}
