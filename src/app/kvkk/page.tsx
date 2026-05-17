import type { Metadata } from "next";
import { PolicyPage, type PolicySection } from "@/app/_policy/PolicyPage";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni | Fuwu",
  description:
    "Fuwu kullanıcıları ve usta başvuru sahipleri için KVKK kapsamında bilgilendirme metni.",
};

const sections: PolicySection[] = [
  {
    title: "Veri sorumlusu ve kapsam",
    body: [
      "Bu metin, Fuwu hizmet pazaryeri deneyimini kullanan müşteriler, ziyaretçiler ve usta başvuru sahipleri için kişisel verilerin hangi amaçlarla işlendiğini açıklar.",
      "Fuwu; kullanıcıların hizmet arama, usta profillerini inceleme, talep oluşturma ve usta başvurusu yapma süreçlerinde paylaştığı verileri yalnızca meşru ve sınırlı amaçlarla işlemeyi hedefler.",
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
      "KVKK kapsamındaki haklarınızla ilgili bilgi almak, verilerinize erişim talep etmek veya düzeltme/silme taleplerinizi iletmek için fuwuhizmet@gmail.com adresinden Fuwu ekibine ulaşabilirsiniz.",
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
      updatedAt="15 Mayıs 2026"
    />
  );
}
