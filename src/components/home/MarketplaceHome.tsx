import { ExperienceSection } from "@/components/home/ExperienceSection";
import { FinalCTA } from "@/components/home/FinalCTA";
import { HeroSection } from "@/components/home/HeroSection";
import { HowItWorks } from "@/components/home/HowItWorks";
import { PopularServices } from "@/components/home/PopularServices";
import { RegionalCoverage } from "@/components/home/RegionalCoverage";
import { TrustedProviders } from "@/components/home/TrustedProviders";
import { TrustSection } from "@/components/home/TrustSection";
import { homePopularServiceIds } from "@/lib/constants/home";
import { serviceCategories, type Service } from "@/lib/constants/services";
import { PROVIDER_AVAILABILITY_STATUSES } from "@/lib/constants/statuses";
import {
  getMarketplaceTrustMetrics,
  getProviderDirectory,
} from "@/services/providers";
import type { Provider } from "@/types/provider";

function formatMetric(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0,
  }).format(value);
}

function getPopularServices(): Service[] {
  return homePopularServiceIds.reduce<Service[]>((popularServices, serviceId) => {
    const service = serviceCategories.find((item) => item.id === serviceId);

    if (service) {
      popularServices.push(service);
    }

    return popularServices;
  }, []);
}

function getFeaturedProviders(providers: Provider[]) {
  return [...providers]
    .sort((firstProvider, secondProvider) => {
      const firstTrustScore =
        Number(Boolean(firstProvider.isVerified)) +
        Number(Boolean(firstProvider.identityVerified)) +
        Number(Boolean(firstProvider.phoneVerified));
      const secondTrustScore =
        Number(Boolean(secondProvider.isVerified)) +
        Number(Boolean(secondProvider.identityVerified)) +
        Number(Boolean(secondProvider.phoneVerified));

      if (secondTrustScore !== firstTrustScore) {
        return secondTrustScore - firstTrustScore;
      }

      if (secondProvider.rating !== firstProvider.rating) {
        return secondProvider.rating - firstProvider.rating;
      }

      return secondProvider.reviewCount - firstProvider.reviewCount;
    })
    .slice(0, 3);
}

export async function MarketplaceHome() {
  const { allProviders, filterOptions } = await getProviderDirectory();
  const metrics = await getMarketplaceTrustMetrics({
    activeProviders: allProviders.length,
    districts: filterOptions.districts.length,
    serviceCategories: serviceCategories.length,
  });
  const popularServices = getPopularServices();
  const liveProviders = allProviders.filter((provider) => provider.source === "supabase");
  const featuredProviders = getFeaturedProviders(liveProviders);
  const todayProviders = liveProviders.filter(
    (provider) => provider.availability === PROVIDER_AVAILABILITY_STATUSES.musait,
  );
  const categories =
    filterOptions.categories.length > 0
      ? filterOptions.categories
      : serviceCategories.map((service) => service.title);
  const districts = filterOptions.districts;
  const categoryCount = formatMetric(metrics.serviceCategories);
  const districtCount = formatMetric(metrics.districts);
  const heroMetrics = [
    { label: "kategori", value: categoryCount },
    { label: "ilçe", value: districtCount },
    {
      label: "canlı profil",
      value: metrics.source === "supabase" ? formatMetric(liveProviders.length) : "Yakında",
    },
  ];

  return (
    <div className="bg-[var(--background)] text-[var(--foreground)]">
      <HeroSection
        categories={categories}
        districts={districts}
        metrics={heroMetrics}
        popularServices={popularServices}
      />
      <PopularServices services={popularServices} />
      <HowItWorks />
      <TrustedProviders providers={featuredProviders} totalCount={allProviders.length} />
      <TrustSection />
      <ExperienceSection />
      <RegionalCoverage districts={districts} />
      <FinalCTA categoryCount={categoryCount} districtCount={districtCount} />
      <div className="sr-only" aria-live="polite">
        Bugün müsait canlı profil sayısı: {formatMetric(todayProviders.length)}.
      </div>
    </div>
  );
}
