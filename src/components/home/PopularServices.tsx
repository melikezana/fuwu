"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CategoryCard } from "@/components/home/CategoryCard";
import { Container } from "@/components/ui/Container";
import { appRoutes } from "@/lib/constants/navigation";
import type { Service } from "@/lib/constants/services";

const filters = [
  { label: "Tüm hizmetler", ids: null },
  { label: "Onarım", ids: ["electrical", "plumbing", "climate-appliance-service", "locksmith"] },
  { label: "Ev bakımı", ids: ["cleaning", "pool-garden"] },
  { label: "Montaj & yenileme", ids: ["furniture-assembly", "painting", "renovation"] },
  { label: "Taşıma", ids: ["moving-help"] },
];

export function PopularServices({ serviceCounts, services }: { serviceCounts: Record<string, number>; services: readonly Service[] }) {
  const [activeFilter, setActiveFilter] = useState(0);
  const ids = filters[activeFilter].ids;
  const visibleServices = ids ? services.filter((service) => ids.includes(service.id)) : services;
  return (
    <section aria-labelledby="services-title" className="home-section home-services" id="services">
      <Container className="home-container">
        <div className="home-section-heading">
          <div><p className="home-eyebrow">NEYE İHTİYACINIZ VAR?</p><h2 className="home-section-title" id="services-title">Eviniz için doğru hizmet.</h2><p className="home-section-description">Günlük ihtiyaçlardan bekleyen işlere, çözümü burada bulun.</p></div>
          <Link className="home-text-link" href={appRoutes.catalog}>Tüm hizmetler <ArrowRight aria-hidden="true" className="size-4 shrink-0" /></Link>
        </div>
        <div aria-label="Hizmet kategorilerini filtrele" className="home-category-filters">
          {filters.map((filter, index) => <button aria-controls="home-service-grid" aria-pressed={activeFilter === index} key={filter.label} onClick={() => setActiveFilter(index)} type="button">{filter.label}</button>)}
        </div>
        <div aria-live="polite" className="home-service-grid" id="home-service-grid">
          {visibleServices.map((service) => <CategoryCard key={service.id} providerCount={serviceCounts[service.id]} service={service} />)}
        </div>
        <div className="home-request-strip"><div><strong>Evin için daha fazlası var.</strong><p>Hizmet kapsamını ve fiyatını gör, randevunu planla.</p></div><Link className="home-text-link" href={appRoutes.catalog}>Hizmet Satın Al <ArrowRight aria-hidden="true" className="size-4 shrink-0" /></Link></div>
      </Container>
    </section>
  );
}
