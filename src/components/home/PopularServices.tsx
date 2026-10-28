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
          <div><h2 className="home-section-title" id="services-title">Popüler hizmetler</h2></div>
          <Link className="home-text-link" href="/services">Tüm hizmetler <ArrowRight aria-hidden className="size-4 shrink-0" /></Link>
        </div>
        {services.length > 0 ? <div className="home-service-grid">{services.map((service,index) => <CategoryCard key={service.slug} service={service} preload={index < 2} />)}</div> : !unavailable && <div className="commerce-empty"><h3>Yeni hizmetler hazırlanıyor</h3><p>Kategoriler hazır olduğunda burada görebilirsin.</p><Link className="commerce-secondary" href="/services">Tüm Hizmetleri Gör <ArrowRight size={16} aria-hidden /></Link></div>}
        <Link className="home-all-services commerce-secondary" href="/services">Tüm Hizmetleri Gör <ArrowRight size={18} aria-hidden /></Link>
        {unavailable && <p className="home-catalog-notice" role="status"><Info size={20} aria-hidden /><span>Fiyat ve randevu bilgileri şu anda doğrulanamıyor. Satın alma kapalı. <Link href="/services">Yeniden dene</Link></span></p>}
      </Container>
    </section>
  );
}
