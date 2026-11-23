import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Info, ShieldCheck } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { DemoProviderCard } from "@/components/demo/DemoProviderCard";
import { appRoutes } from "@/lib/constants/navigation";
import { DEMO_DISCLAIMER, demoProviders } from "@/lib/demo/providers";
import { createPageMetadata } from "@/lib/seo";

// Örnekler arama motorlarında gerçek usta gibi listelenmez.
export const metadata: Metadata = createPageMetadata({
  title: "Örnek usta profilleri | FUWU",
  description: "FUWU'da bir usta profilinde neleri göreceğini kategori kategori örneklerle incele.",
  path: "/ornek-profiller",
  noIndex: true,
});

export default function DemoProvidersPage() {
  return (
    <div className="premium-page-shell demo-page">
      <section className="market-directory-header">
        <Container className="max-w-7xl">
          <nav aria-label="İçerik yolu" className="market-breadcrumb"><Link href={appRoutes.providers}><ArrowLeft aria-hidden className="size-4" /> Usta Bul</Link><span>/</span><span>Örnek profiller</span></nav>
          <div className="market-directory-heading">
            <div>
              <p className="market-eyebrow">HER KATEGORİDEN BİR ÖRNEK</p>
              <h1>Usta profili böyle görünür.</h1>
              <p>Ustalarımız yayına girdiğinde profilinde deneyimini, iş fotoğraflarını ve FUWU ekibinin incelediği belgeleri göreceksin.</p>
            </div>
          </div>
          <p className="demo-notice" role="note"><Info aria-hidden size={18} /><span>{DEMO_DISCLAIMER}</span></p>
        </Container>
      </section>
      <Container className="max-w-7xl py-8 sm:py-10">
        <div className="demo-grid">{demoProviders.map((provider, index) => <DemoProviderCard key={provider.slug} provider={provider} priority={index < 2} />)}</div>
        <aside className="demo-real-note">
          <ShieldCheck aria-hidden size={22} />
          <div>
            <h2>Gerçek profillerde farkı ne?</h2>
            <p>Gerçek bir ustanın telefonu doğrulanır, kimliği ve mesleki belgeleri FUWU ekibi tarafından incelenir. Puan ve yorumları yalnızca o ustadan FUWU üzerinden hizmet alan müşteriler yazabilir.</p>
            <div className="demo-real-actions"><Link className="home-primary-link" href={appRoutes.services}>Hizmetleri İncele</Link><Link className="home-text-link" href={appRoutes.providerApplication}>Usta mısın? Profilini oluştur</Link></div>
          </div>
        </aside>
      </Container>
    </div>
  );
}
