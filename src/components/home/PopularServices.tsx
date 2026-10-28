import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { CategoryCard } from "@/components/home/CategoryCard";
import { Container } from "@/components/ui/Container";
import type { CatalogNavigationItem } from "@/lib/commerce/catalog-navigation";

export function PopularServices({ services, unavailable }: { services: CatalogNavigationItem[]; unavailable: boolean }) {
  return (
    <section aria-labelledby="services-title" className="home-section home-services" id="services">
      <Container className="home-container">
        <div className="home-section-heading">
          <div><p className="home-eyebrow">EVDEKİ İŞLER İÇİN</p><h2 className="home-section-title" id="services-title">İhtiyacın neyse, buradan başla.</h2><p className="home-section-description">Hizmetin kapsamını gör. Ustanı ve randevunu kendin seç.</p></div>
          <Link className="home-text-link" href="/services">Tüm hizmetler <ArrowRight aria-hidden className="size-4 shrink-0" /></Link>
        </div>
        {unavailable && <p className="home-catalog-notice" role="status"><Info size={18} aria-hidden /><span>Hizmet kataloğuna şu anda tam olarak ulaşılamıyor. Fiyat ve randevu doğrulanana kadar satın alma kapalı. <Link href="/services">Yeniden dene</Link></span></p>}
        {services.length > 0 ? <div className="home-service-grid">{services.map(service => <CategoryCard key={service.slug} service={service} />)}</div> : !unavailable && <div className="commerce-empty"><h3>Yeni hizmetler hazırlanıyor</h3><p>Kategoriler hazır olduğunda burada görebilirsin.</p><Link className="commerce-secondary" href="/services">Tüm Hizmetleri Gör <ArrowRight size={16} aria-hidden /></Link></div>}
      </Container>
    </section>
  );
}
