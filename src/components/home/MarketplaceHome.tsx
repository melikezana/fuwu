import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { HeroSection } from "@/components/home/HeroSection";
import { HomePremiumPanels, HomeProviderInvite } from "@/components/home/HomePremiumPanels";
import { PopularServices } from "@/components/home/PopularServices";
import { TrustedProviders } from "@/components/home/TrustedProviders";
import { Container } from "@/components/ui/Container";
import { getCatalogNavigation, featuredCategories } from "@/lib/commerce/catalog-navigation";
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
  const directory = getProviderDirectory();
  const catalog = await getCommerceCatalog();
  const categories = getCatalogNavigation(catalog);
  const districts = catalog.districts.map(district => district.name);
  const purchasableServices = catalog.services.filter(service => service.is_active && catalog.offers.some(offer => offer.service_id === service.id));

  return (
    <div className="fuwu-home">
      <HeroSection categories={categories} districts={districts} />
      <PopularServices services={featuredCategories(categories)} unavailable={catalog.unavailable} />
      {!catalog.unavailable && purchasableServices.length > 0 && <section className="home-section" aria-labelledby="featured-services-title"><Container className="home-container"><div className="home-section-heading"><div><p className="home-eyebrow">USTALARIN HİZMET MAĞAZALARINDAN</p><h2 className="home-section-title" id="featured-services-title">Kapsamı belli. Fiyatı açık.</h2><p className="home-section-description">Hizmetleri karşılaştır, gerçek müsaitliğe göre planla.</p></div><Link className="home-text-link" href="/services">Tüm hizmetler <ArrowRight size={16} aria-hidden /></Link></div><ServiceCatalog featured services={purchasableServices} offers={catalog.offers} unavailable={false} categories={catalog.categories} /></Container></section>}
      <HomePremiumPanels />
      <Suspense fallback={<section className="home-section" aria-label="Ustalar yükleniyor" aria-busy="true"><Container className="home-container"><p role="status">Ustalar yükleniyor…</p><div className="home-provider-grid mt-5" aria-hidden>{[1,2,3].map(n => <div key={n} className="commerce-skeleton h-80 rounded-2xl" />)}</div></Container></section>}><FeaturedHomeProviders directory={directory} catalog={catalog} /></Suspense>
      <HomeProviderInvite />
    </div>
  );
}

async function FeaturedHomeProviders({ directory, catalog }: { directory: ReturnType<typeof getProviderDirectory>; catalog: Awaited<ReturnType<typeof getCommerceCatalog>> }) {
  const { allProviders } = await directory;
  const providers = getFeaturedProviders(allProviders.filter(provider => provider.source === "supabase"));
  return providers.length ? <TrustedProviders providers={providers} purchases={providerPurchaseLinks(catalog)} /> : null;
}
