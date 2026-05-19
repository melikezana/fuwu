<<<<<<< HEAD
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
=======
import Navbar from "@/components/layout/Navbar";

export default function KullanimSartlariPage() {
  return (
    <main className="min-h-screen bg-[#F5F6F8] flex flex-col">
      <Navbar />
      <div className="flex-1 p-6 lg:px-12 max-w-4xl mx-auto w-full py-12">
        <h1 className="text-3xl font-bold text-[#0D1424] mb-6">Kullanım Şartları</h1>
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 prose prose-gray max-w-none">
          <p>Fuwu platformunu kullanarak aşağıdaki şartları kabul etmiş sayılırsınız.</p>
          <h3>1. Hizmet Tanımı</h3>
          <p>Fuwu, hizmet almak isteyen kullanıcılar ile bağımsız hizmet veren ustaları bir araya getiren bir aracı platformdur.</p>
          <h3>2. Kullanıcı Sorumlulukları</h3>
          <p>Kullanıcılar platforma doğru ve güncel bilgi vermekle yükümlüdür. Yanlış bilgi verilmesi durumunda hesap askıya alınabilir.</p>
          <h3>3. Uyuşmazlık Çözümü</h3>
          <p>Hizmet veren ile hizmet alan arasında çıkabilecek olası uyuşmazlıklarda Fuwu sadece arabulucu rolü üstlenebilir, hukuki sorumluluk kabul etmez.</p>
        </div>
      </div>
    </main>
>>>>>>> 41e55ab (Full marketplace backend auth and production update)
  );
}
