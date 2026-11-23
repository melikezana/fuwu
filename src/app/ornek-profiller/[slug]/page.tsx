import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, CalendarClock, ClipboardList, FileText, Info, MapPin, MessageSquareOff, ShieldCheck } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { OpenAssistantButton } from "@/components/home/OpenAssistantButton";
import { DemoBadge } from "@/components/demo/DemoBadge";
import { DemoDocumentThumb } from "@/components/demo/DemoDocumentThumb";
import { DemoProviderCard } from "@/components/demo/DemoProviderCard";
import { appRoutes } from "@/lib/constants/navigation";
import { DEMO_DISCLAIMER, DEMO_IMAGE_LABEL, demoProviders, getDemoProvider } from "@/lib/demo/providers";
import { createPageMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return demoProviders.map(provider => ({ slug: provider.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const provider = getDemoProvider(slug);
  return createPageMetadata({
    title: provider ? `Örnek ${provider.trade.toLocaleLowerCase("tr-TR")} profili | FUWU` : "Örnek profil | FUWU",
    description: "FUWU'da bir usta profilinin nasıl görüneceğini gösteren örnek. Gerçek bir usta değildir.",
    path: `/ornek-profiller/${slug}`,
    noIndex: true,
  });
}

export default async function DemoProviderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const provider = getDemoProvider(slug);
  if (!provider) notFound();
  const related = demoProviders.filter(item => item.slug !== provider.slug).slice(0, 3);
  const categoryHref = `${appRoutes.services}?${new URLSearchParams({ category: provider.categorySlug })}`;

  return (
    <div className="market-profile-page demo-profile-page">
      <Container className="max-w-7xl">
        <nav aria-label="İçerik yolu" className="market-breadcrumb"><Link href="/ornek-profiller"><ArrowLeft aria-hidden className="size-4" /> Örnek profiller</Link><span>/</span><span>{provider.categoryTitle}</span></nav>
        <p className="demo-notice is-strong" role="note"><Info aria-hidden size={18} /><span>{DEMO_DISCLAIMER}</span></p>
        <div className="market-profile-layout">
          <div className="min-w-0">
            <header className="market-profile-header">
              <div className="market-profile-person">
                <div className="demo-profile-portrait"><Image alt={provider.portraitAlt} className="object-cover" fill priority sizes="112px" src={provider.portrait} /></div>
                <div className="min-w-0">
                  <DemoBadge />
                  <p className="market-eyebrow mt-3">{provider.trade}</p>
                  <h1>{provider.name}</h1>
                  <p className="market-profile-location"><MapPin aria-hidden className="size-4 shrink-0" />{provider.district}, İstanbul</p>
                </div>
              </div>
              <p className="demo-profile-headline">{provider.headline}</p>
              <div className="market-profile-stats">
                <div><BriefcaseBusiness aria-hidden className="size-5" /><span><strong>{provider.experienceYears} yıl deneyim</strong><small>Örnek bilgi</small></span></div>
                <div><CalendarClock aria-hidden className="size-5" /><span><strong>{provider.workingHours}</strong><small>Çalışma saatleri</small></span></div>
                <div><MapPin aria-hidden className="size-5" /><span><strong>{provider.serviceAreas.join(", ")}</strong><small>Hizmet bölgeleri</small></span></div>
              </div>
            </header>

            <section className="market-profile-section">
              <h2>Usta hakkında</h2>
              <p className="market-long-copy">{provider.about}</p>
              <h3 className="demo-subtitle">Yaptığı işler</h3>
              <ul className="demo-chip-list">{provider.services.map(service => <li key={service}>{service}</li>)}</ul>
            </section>

            <section className="market-profile-section" id="portfolio">
              <p className="market-eyebrow">USTANIN PAYLAŞTIKLARI</p>
              <h2>İş fotoğrafları</h2>
              <div className="demo-work-grid">
                {provider.work.map(photo => (
                  <figure key={photo.src}>
                    <div className="demo-work-photo"><Image alt={`${photo.caption} (${DEMO_IMAGE_LABEL.toLocaleLowerCase("tr-TR")})`} className="object-cover" fill sizes="(max-width: 767px) 92vw, 420px" src={photo.src} /></div>
                    <figcaption>{photo.caption}<span>{DEMO_IMAGE_LABEL}</span></figcaption>
                  </figure>
                ))}
              </div>
            </section>

            <section className="market-profile-section" id="documents">
              <p className="market-eyebrow">BELGELER</p>
              <h2>Belgeler ve sertifikalar</h2>
              <p className="market-help-text">Gerçek profillerde usta belgesini FUWU&apos;ya yükler, ekip inceler; onaylanan belge burada rozetle görünür. Aşağıdakiler yalnızca belge türünü gösteren örneklerdir.</p>
              <ul className="demo-doc-list">
                {provider.documents.map(document => (
                  <li key={document.title}>
                    <DemoDocumentThumb title={document.title} />
                    <div>
                      <h3><FileText aria-hidden size={16} />{document.title}</h3>
                      <p className="demo-doc-issuer">{document.issuer}</p>
                      <p>{document.meaning}</p>
                      <span className="demo-doc-status">Örnek gösterim · belge yüklenmedi</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="market-profile-section" id="reviews">
              <h2>Yorumlar</h2>
              <p className="demo-empty"><MessageSquareOff aria-hidden size={20} /><span>Örnek profillerde puan ve yorum gösterilmez. Gerçek profillerde yalnızca o ustadan FUWU üzerinden hizmet alan müşteriler yorum yazabilir.</span></p>
            </section>

            <section className="market-profile-section">
              <h2><ClipboardList aria-hidden className="mr-2 inline size-5" />Usta gelmeden önce</h2>
              <ul className="demo-steps">{provider.beforeVisit.map(step => <li key={step}>{step}</li>)}</ul>
            </section>
          </div>

          <aside className="market-profile-booking">
            <div className="market-booking-card">
              <p className="market-eyebrow">BU BİR ÖRNEK</p>
              <h2>Bu profilden randevu alınamaz.</h2>
              <p className="market-help-text">{provider.categoryTitle} hizmetlerinin kapsamını şimdiden inceleyebilirsin.</p>
              <Link className="home-primary-link mt-4 w-full" href={categoryHref}>{provider.categoryTitle} hizmetleri <ArrowRight aria-hidden size={16} /></Link>
              <div className="mt-3"><OpenAssistantButton label="Sorunumu Fuwi'ye anlat" /></div>
            </div>
            <p className="market-profile-guidance"><ShieldCheck aria-hidden className="mr-1 inline size-4" />Gerçek profillerde doğrulama rozetleri yalnızca tamamlanan kontrolleri ifade eder.</p>
          </aside>
        </div>
        <section className="market-related">
          <p className="market-eyebrow">DİĞER ÖRNEKLER</p>
          <h2>Başka kategorilere de bak</h2>
          <div className="demo-grid mt-6">{related.map(item => <DemoProviderCard key={item.slug} provider={item} />)}</div>
        </section>
      </Container>
    </div>
  );
}
