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
  );
}
