import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroSection } from "@/components/home/HeroSection";
import { HomePremiumPanels } from "@/components/home/HomePremiumPanels";
import { PopularServices } from "@/components/home/PopularServices";
import { TrustedProviders } from "@/components/home/TrustedProviders";
import { CustomerVoices } from "@/components/home/CustomerVoices";
import { Container } from "@/components/ui/Container";
import { getCatalogNavigation } from "@/lib/commerce/catalog-navigation";
import { getProviderDirectory } from "@/services/providers";
import { getCommerceCatalog } from "@/services/commerce";
import { ServiceCatalog } from "@/components/commerce/ServiceCatalog";
import { providerPurchaseLinks } from "@/lib/commerce/purchase-links";
import type { Provider } from "@/types/provider";

function getFeaturedProviders(providers: Provider[]) {
  const trust = (provider: Provider) => Number(Boolean(provider.isVerified)) + Number(Boolean(provider.identityVerified)) + Number(Boolean(provider.phoneVerified));
  return [...providers].sort((a, b) => trust(b) - trust(a) || b.rating - a.rating || b.reviewCount - a.reviewCount).slice(0, 3);
}

export async function MarketplaceHome() {
  const [{ allProviders, filterOptions }, catalog] = await Promise.all([getProviderDirectory(), getCommerceCatalog()]);
  const categories = getCatalogNavigation(catalog);
  const featuredProviders = getFeaturedProviders(allProviders.filter(provider => provider.source === "supabase"));
  const districts = catalog.districts.length ? catalog.districts.map(district => district.name) : filterOptions.districts;
  const purchasableServices = catalog.services.filter(service => service.is_active && catalog.offers.some(offer => offer.service_id === service.id)).slice(0, 3);

  return (
    <div className="fuwu-home">
      <HeroSection categories={categories} districts={districts} />
      <PopularServices services={categories} unavailable={catalog.unavailable} />
      {!catalog.unavailable && purchasableServices.length > 0 && <section className="home-section" aria-labelledby="featured-services-title"><Container className="home-container"><div className="home-section-heading"><div><p className="home-eyebrow">USTALARIN HİZMET MAĞAZALARINDAN</p><h2 className="home-section-title" id="featured-services-title">Kapsamı belli. Fiyatı açık.</h2><p className="home-section-description">Hizmetleri karşılaştır, gerçek müsaitliğe göre planla.</p></div><Link className="home-text-link" href="/services">Tüm hizmetler <ArrowRight size={16} aria-hidden /></Link></div><ServiceCatalog featured services={purchasableServices} offers={catalog.offers} unavailable={false} categories={catalog.categories} /></Container></section>}
      {featuredProviders.length > 0 && <><TrustedProviders providers={featuredProviders} purchases={providerPurchaseLinks(catalog)} /><CustomerVoices providers={featuredProviders} /></>}
      <HomePremiumPanels />
    </div>
  );
}
