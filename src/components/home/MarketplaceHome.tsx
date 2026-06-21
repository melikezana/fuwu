import { FAQSection } from "@/components/home/FAQSection";
import { MarketplaceHeroSection } from "@/components/home/MarketplaceHeroSection";
import { MarketplaceServicesSection } from "@/components/home/MarketplaceServicesSection";
import {
  MarketplaceProviderPreviewSection,
  MarketplaceSocialProofSection,
} from "@/components/home/MarketplaceSocialSections";
import {
  MarketplaceAboutSection,
  MarketplaceFinalCTASection,
  MarketplaceHowItWorksSection,
  MarketplaceTrustSection,
} from "@/components/home/MarketplaceStorySections";
import { PROVIDER_AVAILABILITY_STATUSES } from "@/lib/constants/statuses";
import { serviceCategories } from "@/lib/constants/services";
import {
  getMarketplaceTrustMetrics,
  getProviderDirectory,
} from "@/services/providers";

export async function MarketplaceHome() {
  const { allProviders, filterOptions } = await getProviderDirectory();
  const featuredProviders = allProviders.filter((provider) => provider.featured).slice(0, 3);
  const previewProviders =
    featuredProviders.length > 0 ? featuredProviders : allProviders.slice(0, 3);
  const todayProviders = allProviders.filter(
    (provider) => provider.availability === PROVIDER_AVAILABILITY_STATUSES.musait,
  );
  const heroProviders =
    todayProviders.length > 0 ? todayProviders.slice(0, 2) : allProviders.slice(0, 2);
  const voiceProviders = Array.from(
    new Map(
      [...heroProviders, ...previewProviders].map((provider) => [provider.id, provider]),
    ).values(),
  );
  const marketplaceTrustMetrics = await getMarketplaceTrustMetrics({
    activeProviders: allProviders.length,
    districts: filterOptions.districts.length,
    serviceCategories: serviceCategories.length,
  });
  const trustMetrics = {
    ...marketplaceTrustMetrics,
    serviceCategories: serviceCategories.length,
  };

  return (
    <div className="bg-[var(--background)]">
      <MarketplaceHeroSection
        districtCount={filterOptions.districts.length}
        filterOptions={filterOptions}
        heroProviders={heroProviders}
        todayActiveCount={todayProviders.length}
        voiceProviders={voiceProviders}
      />
      <MarketplaceSocialProofSection metrics={trustMetrics} />
      <MarketplaceServicesSection />
      <MarketplaceProviderPreviewSection featuredProviders={previewProviders} />
      <MarketplaceHowItWorksSection />
      <MarketplaceAboutSection />
      <MarketplaceTrustSection />
      <FAQSection />
      <MarketplaceFinalCTASection />
    </div>
  );
}
