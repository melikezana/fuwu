import { HeroSection } from "@/components/home/HeroSection";
import { HomePremiumPanels } from "@/components/home/HomePremiumPanels";
import { PopularServices } from "@/components/home/PopularServices";
import { TrustedProviders } from "@/components/home/TrustedProviders";
import { homePopularServiceIds } from "@/lib/constants/home";
import { normalizeServiceValue, serviceCategories, type Service } from "@/lib/constants/services";
import { getProviderDirectory } from "@/services/providers";
import type { Provider } from "@/types/provider";
import Link from "next/link";
import { getCommerceCatalog } from "@/services/commerce";
import { ServiceCatalog } from "@/components/commerce/ServiceCatalog";

function getPopularServices(): Service[] {
  return homePopularServiceIds.flatMap((id) => {
    const service = serviceCategories.find((item) => item.id === id);
    return service ? [service] : [];
  });
}

function getFeaturedProviders(providers: Provider[]) {
  return [...providers].sort((a, b) => {
    const trust = (provider: Provider) => Number(Boolean(provider.isVerified)) + Number(Boolean(provider.identityVerified)) + Number(Boolean(provider.phoneVerified));
    return trust(b) - trust(a) || b.rating - a.rating || b.reviewCount - a.reviewCount;
  }).slice(0, 3);
}

export async function MarketplaceHome() {
  const [{ allProviders, filterOptions }, catalog] = await Promise.all([getProviderDirectory(), getCommerceCatalog()]);
  const popularServices = getPopularServices();
  const liveProviders = allProviders.filter((provider) => provider.source === "supabase");
  const featuredProviders = getFeaturedProviders(liveProviders);
  const categories = filterOptions.categories.length ? filterOptions.categories : serviceCategories.map((service) => service.title);
  const serviceCounts = Object.fromEntries(popularServices.map((service) => [
    service.id,
    liveProviders.filter((provider) => {
      const category = normalizeServiceValue(provider.category);
      return category === normalizeServiceValue(service.title) || category === normalizeServiceValue(service.slug);
    }).length,
  ]));

  return (
    <div className="fuwu-home">
      <HeroSection categories={categories} districts={filterOptions.districts} />
      {!catalog.unavailable && catalog.offers.length > 0 && <section className="fusion-featured-services"><div className="fusion-section-heading"><div><p className="commerce-eyebrow">USTALARIN HİZMET MAĞAZALARINDAN</p><h2>Kapsamı belli. Fiyatı açık.</h2><p>Fiyatlandırılmış hizmetleri karşılaştır, gerçek müsaitliğe göre planla.</p></div><Link className="commerce-text-link" href="/services">Tüm Hizmetleri Gör →</Link></div><ServiceCatalog featured services={catalog.services.filter(s => catalog.offers.some(o => o.service_id === s.id)).slice(0, 3)} offers={catalog.offers} unavailable={false} /></section>}
      <PopularServices serviceCounts={serviceCounts} services={popularServices} />
      {featuredProviders.length > 0 ? <TrustedProviders providers={featuredProviders} totalCount={liveProviders.length} /> : null}
      <HomePremiumPanels />
    </div>
  );
}
