import { HeroSection } from "@/components/home/HeroSection";
import { CommerceJourney } from "@/components/commerce/CommerceJourney";
import { HomePremiumPanels } from "@/components/home/HomePremiumPanels";
import { PopularServices } from "@/components/home/PopularServices";
import { TrustedProviders } from "@/components/home/TrustedProviders";
import { homePopularServiceIds } from "@/lib/constants/home";
import { normalizeServiceValue, serviceCategories, type Service } from "@/lib/constants/services";
import { getProviderDirectory } from "@/services/providers";
import type { Provider } from "@/types/provider";

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
  const { allProviders, filterOptions } = await getProviderDirectory();
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
      <CommerceJourney />
      <PopularServices serviceCounts={serviceCounts} services={popularServices} />
      <HomePremiumPanels />
      {featuredProviders.length > 0 ? <TrustedProviders providers={featuredProviders} totalCount={liveProviders.length} /> : null}
    </div>
  );
}
