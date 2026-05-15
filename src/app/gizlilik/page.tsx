import type { Metadata } from "next";
import { PolicyPage, type PolicySection } from "@/app/_policy/PolicyPage";

export const metadata: Metadata = {
  title: "Gizlilik Politikası | Fuwu",
  description: "Fuwu gizlilik politikası ve veri güvenliği yaklaşımı.",
};

const sections: PolicySection[] = [
  {
    title: "Gizlilik yaklaşımı",
    body: [
      "Fuwu, kullanıcıların ev hizmeti arama ve usta başvuru süreçlerinde paylaştığı bilgileri açık, sınırlı ve güvenli şekilde kullanmayı hedefler.",
      "Hizmet deneyimi için gerekli olmayan kişisel veriler talep edilmemeye çalışılır.",
    ],
  },
  {
    title: "Bilgilerin kullanımı",
    body: [
      "Paylaşılan bilgiler; talep oluşturma, usta profillerini listeleme, başvuruları değerlendirme, destek taleplerini yanıtlamak ve güvenlik kontrolleri yapmak için kullanılabilir.",
      "Fuwu, kullanıcı iletişim bilgilerini izinsiz pazarlama amacıyla üçüncü kişilerle paylaşmamayı hedefler.",
    ],
  },
  {
    title: "Saklama ve güvenlik",
    body: [
      "Veriler, hizmetin sağlanması ve yasal yükümlülükler için gerekli süre boyunca saklanabilir.",
      "Yetkisiz erişimi azaltmak için teknik ve idari güvenlik önlemleri uygulanır. Buna rağmen internet üzerinden veri aktarımında mutlak güvenlik garanti edilemez.",
    ],
  },
  {
    title: "İletişim",
    body: [
      "Gizlilik soruları, veri talepleri veya güvenlik bildirimleri için fuwuhizmet@gmail.com adresinden Fuwu ekibine ulaşabilirsiniz.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <PolicyPage
      description="Fuwu’da paylaşılan bilgilerin nasıl kullanıldığını anlatan genel gizlilik metni."
      sections={sections}
      title="Gizlilik Politikası"
      updatedAt="15 Mayıs 2026"
    />
  );
}
