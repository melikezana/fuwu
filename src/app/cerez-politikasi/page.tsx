<<<<<<< HEAD
import type { Metadata } from "next";
import { PolicyPage, type PolicySection } from "@/app/_policy/PolicyPage";

export const metadata: Metadata = {
  title: "Çerez Politikası",
  description: "Fuwu çerez kullanımı ve tarayıcı tercihleri hakkında bilgilendirme.",
};

const sections: PolicySection[] = [
  {
    title: "Çerez nedir?",
    body: [
      "Çerezler, bir web sitesini ziyaret ettiğinizde tarayıcınıza kaydedilebilen küçük metin dosyalarıdır.",
      "Fuwu, site deneyimini güvenli ve anlaşılır tutmak için zorunlu veya işlevsel çerezlerden yararlanabilir.",
    ],
  },
  {
    title: "Kullanım amaçları",
    body: [
      "Çerezler; oturum güvenliği, tercihlerin hatırlanması, performansın anlaşılması ve hata ayıklama gibi amaçlarla kullanılabilir.",
      "Gelecekte analitik veya pazarlama çerezleri kullanılacaksa, kullanıcıya daha açık tercih seçenekleri sunulması hedeflenir.",
    ],
  },
  {
    title: "Tarayıcı ayarları",
    body: [
      "Çerez tercihlerinizi tarayıcı ayarlarınızdan silebilir veya sınırlandırabilirsiniz.",
      "Bazı çerezlerin kapatılması, giriş, form gönderimi veya güvenlik kontrolleri gibi özelliklerin beklenen şekilde çalışmasını etkileyebilir.",
    ],
  },
  {
    title: "İletişim",
    body: [
      "Çerez kullanımı hakkında sorularınız için fuwuhizmet@gmail.com adresinden Fuwu ekibine ulaşabilirsiniz.",
    ],
  },
];

export default function CookiePolicyPage() {
  return (
    <PolicyPage
      description="Fuwu’nun çerezleri hangi amaçlarla kullanabileceğine dair bilgilendirme."
      descriptionKey="policy.cookies.description"
      sections={sections}
      title="Çerez Politikası"
      titleKey="policy.cookies.title"
      updatedAt="15 Mayıs 2026"
    />
=======
import Navbar from "@/components/layout/Navbar";

export default function CerezPolitikasiPage() {
  return (
    <main className="min-h-screen bg-[#F5F6F8] flex flex-col">
      <Navbar />
      <div className="flex-1 p-6 lg:px-12 max-w-4xl mx-auto w-full py-12">
        <h1 className="text-3xl font-bold text-[#0D1424] mb-6">Çerez Politikası</h1>
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 prose prose-gray max-w-none">
          <p>Web sitemiz size daha iyi bir deneyim sunabilmek için çerezleri kullanmaktadır.</p>
          <h3>Çerez Nedir?</h3>
          <p>Çerezler, web sitemizi ziyaret ettiğinizde tarayıcınız aracılığıyla cihazınıza kaydedilen küçük metin dosyalarıdır.</p>
          <h3>Hangi Çerezleri Kullanıyoruz?</h3>
          <ul>
            <li><strong>Zorunlu Çerezler:</strong> Sitenin temel fonksiyonlarının çalışması için gereklidir.</li>
            <li><strong>İşlevsel Çerezler:</strong> Dil seçimi gibi tercihlerinizi (örn. localStorage) hatırlamamızı sağlar.</li>
            <li><strong>Analitik Çerezler:</strong> Sitemizi nasıl kullandığınızı anlayıp geliştirmemize yardımcı olur (anonimleştirilmiş).</li>
          </ul>
        </div>
      </div>
    </main>
>>>>>>> 41e55ab (Full marketplace backend auth and production update)
  );
}
