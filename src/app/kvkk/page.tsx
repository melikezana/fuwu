<<<<<<< HEAD
import type { Metadata } from "next";
import { PolicyPage, type PolicySection } from "@/app/_policy/PolicyPage";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni",
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
=======
import Navbar from "@/components/layout/Navbar";

export default function KVKKPage() {
  return (
    <main className="min-h-screen bg-[#F5F6F8] flex flex-col">
      <Navbar />
      <div className="flex-1 p-6 lg:px-12 max-w-4xl mx-auto w-full py-12">
        <h1 className="text-3xl font-bold text-[#0D1424] mb-6">KVKK Aydınlatma Metni</h1>
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 prose prose-gray max-w-none">
          <p>Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, Fuwu platformu olarak kişisel verilerinizin işlenmesi ve korunması ile ilgili sizi bilgilendirmek isteriz.</p>
          <h3>1. Veri Sorumlusu</h3>
          <p>Fuwu Bilişim Hizmetleri olarak, KVKK uyarınca "Veri Sorumlusu" sıfatıyla kişisel verilerinizi işliyoruz.</p>
          <h3>2. İşlenen Kişisel Veriler</h3>
          <p>Platformumuzu kullanırken sağladığınız ad, soyad, telefon numarası, e-posta adresi, konum bilgileri ve hizmet talebi detayları işlenmektedir.</p>
          <h3>3. Kişisel Verilerin İşlenme Amacı</h3>
          <p>Verileriniz, hizmet taleplerinizin ustalara iletilmesi, kullanıcı güvenliğinin sağlanması ve platform hizmetlerinin iyileştirilmesi amaçlarıyla işlenmektedir.</p>
        </div>
      </div>
    </main>
>>>>>>> 41e55ab (Full marketplace backend auth and production update)
  );
}
