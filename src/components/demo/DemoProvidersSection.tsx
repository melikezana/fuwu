import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { DemoProviderCard } from "@/components/demo/DemoProviderCard";
import { DEMO_DISCLAIMER, type DemoProvider } from "@/lib/demo/providers";

/**
 * "Bir usta profili nasıl görünür?" bölümü. Yayımlı gerçek usta yokken ziyaretçiye boş bir liste
 * yerine dürüstçe etiketlenmiş örnekler gösterir.
 */
export function DemoProvidersSection({
  providers,
  title = "Bir usta profili nasıl görünür?",
  description = "Ustalarımız yayına girene kadar, profillerde neleri göreceğini örneklerle incele.",
  showAllLink = true,
  headingLevel = "h2",
}: {
  providers: DemoProvider[];
  title?: string;
  description?: string;
  showAllLink?: boolean;
  headingLevel?: "h2" | "h3";
}) {
  if (!providers.length) return null;
  const Heading = headingLevel;
  return (
    <section aria-labelledby="demo-providers-title" className="home-section demo-section">
      <Container className="home-container">
        <div className="home-section-heading">
          <div>
            <Heading className="home-section-title" id="demo-providers-title">{title}</Heading>
            <p className="home-section-description">{description}</p>
          </div>
          {showAllLink && <Link className="home-text-link" href="/ornek-profiller">Tüm örnekler <ArrowRight aria-hidden size={16} /></Link>}
        </div>
        <p className="demo-notice" role="note"><Info aria-hidden size={18} /><span>{DEMO_DISCLAIMER}</span></p>
        <div className="demo-grid">{providers.map((provider, index) => <DemoProviderCard key={provider.slug} provider={provider} priority={index === 0} />)}</div>
      </Container>
    </section>
  );
}
