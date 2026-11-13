import type { Metadata } from "next";
import { PolicyPage, type PolicySection } from "@/app/_policy/PolicyPage";
import { LAUNCH_INTEREST_NOTICE, LAUNCH_MARKETING_CONSENT, PROVIDER_APPLICATION_NOTICE, type LegalNotice } from "@/lib/legal/notices";

// Formlarda açılan metinle birebir aynı içerik; sürüm satırı hangi metnin okunduğunu belgelemek içindir.
function noticeSection(notice: LegalNotice): PolicySection {
  return {
    id: notice.id,
    title: notice.title,
    body: [...notice.sections.flatMap(section => section.body.map((paragraph, index) => index === 0 ? `${section.title}: ${paragraph}` : paragraph)), `Sürüm: ${notice.version} · Güncelleme: ${notice.updated}`],
  };
}

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni",
  description:
    "FUWU kullanıcıları ve usta başvuru sahipleri için KVKK kapsamında bilgilendirme metni.",
};

const sections: PolicySection[] = [
  noticeSection(LAUNCH_INTEREST_NOTICE),
  {
    id: "marketing-consent",
    title: LAUNCH_MARKETING_CONSENT.title,
    body: [...LAUNCH_MARKETING_CONSENT.body, `Onay beyanı: "${LAUNCH_MARKETING_CONSENT.statement}" Sürüm: ${LAUNCH_MARKETING_CONSENT.version}.`],
  },
  noticeSection(PROVIDER_APPLICATION_NOTICE),
  {
    title: "Veri sorumlusu ve kapsam",
    body: [
      "Bu metin, FUWU hizmet pazaryeri deneyimini kullanan müşteriler, ziyaretçiler ve usta başvuru sahipleri için kişisel verilerin hangi amaçlarla işlendiğini açıklar.",
      "FUWU; kullanıcıların hizmet arama, usta profillerini inceleme, randevu planlama ve hizmet satın alma ve usta başvurusu yapma süreçlerinde paylaştığı verileri yalnızca meşru ve sınırlı amaçlarla işlemeyi hedefler.",
    ],
  },
  {
    title: "İşlenen kişisel veriler",
    body: [
      "Ad soyad, telefon numarası, e-posta adresi, hizmet kategorisi, hizmet bölgesi, başvuru açıklamaları, talep detayları ve iletişim tercihleri işlenebilir.",
      "Usta başvurularında deneyim, ekipman bilgisi, çalışma uygunluğu, referans bağlantısı ve isteğe bağlı profil görseli gibi mesleki bilgiler de değerlendirilebilir.",
    ],
  },
  {
    title: "İşleme amaçları",
    body: [
      "Veriler; hizmet talebini anlamak, kullanıcıyı uygun profillerle buluşturmak, usta başvurularını değerlendirmek, güvenli iletişim akışı sağlamak ve kötüye kullanımı önlemek amacıyla işlenir.",
      "İletişim bilgileri, kullanıcının talebine yanıt vermek veya başvuru süreci hakkında bilgilendirme yapmak için kullanılabilir.",
    ],
  },
  {
    title: "Haklarınız",
    body: [
      "KVKK kapsamındaki haklarınızla ilgili bilgi almak, verilerinize erişim talep etmek veya düzeltme/silme taleplerinizi iletmek için fuwuhizmet@gmail.com adresinden FUWU ekibine ulaşabilirsiniz.",
      "Talepler, kimlik doğrulama ve yasal saklama yükümlülükleri dikkate alınarak değerlendirilir.",
    ],
  },
];

export default function KvkkPage() {
  return (
    <PolicyPage
      description="Kişisel verilerin işlenmesine dair temel bilgilendirme."
      descriptionKey="policy.kvkk.description"
      sections={sections}
      title="KVKK Aydınlatma Metni"
      titleKey="policy.kvkk.title"
      updatedAt="13 Kasım 2026"
    />
  );
}
