<<<<<<< HEAD
import type { Metadata } from "next";
import { PolicyPage, type PolicySection } from "@/app/_policy/PolicyPage";

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
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
      descriptionKey="policy.privacy.description"
      sections={sections}
      title="Gizlilik Politikası"
      titleKey="policy.privacy.title"
      updatedAt="15 Mayıs 2026"
    />
=======
import Navbar from "@/components/layout/Navbar";

export default function GizlilikPage() {
  return (
    <main className="min-h-screen bg-[#F5F6F8] flex flex-col">
      <Navbar />
      <div className="flex-1 p-6 lg:px-12 max-w-4xl mx-auto w-full py-12">
        <h1 className="text-3xl font-bold text-[#0D1424] mb-6">Gizlilik Politikası</h1>
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 prose prose-gray max-w-none">
          <p>Fuwu olarak gizliliğinize önem veriyoruz. Bu gizlilik politikası, platformumuzu kullanırken toplanan bilgilerin nasıl korunduğunu açıklar.</p>
          <h3>1. Bilgi Toplama</h3>
          <p>Hizmetlerimizden yararlanabilmeniz için gerekli olan asgari düzeydeki iletişim ve lokasyon bilgilerinizi toplamaktayız.</p>
          <h3>2. Bilgi Güvenliği</h3>
          <p>Toplanan bilgiler şifrelenerek güvenli sunucularda saklanmaktadır. Yetkisiz erişimlere karşı endüstri standardı güvenlik önlemleri alınmaktadır.</p>
          <h3>3. Üçüncü Taraflarla Paylaşım</h3>
          <p>Bilgileriniz sadece talep ettiğiniz hizmetin gerçekleştirilmesi amacıyla onaylı ustalarımızla paylaşılır. Reklam veya pazarlama amaçlı olarak asla satılmaz.</p>
        </div>
      </div>
    </main>
>>>>>>> 41e55ab (Full marketplace backend auth and production update)
  );
}
