import { HeroSection } from "@/components/home/HeroSection";
import { HomePremiumPanels } from "@/components/home/HomePremiumPanels";
import { PopularServices } from "@/components/home/PopularServices";
import { TrustedProviders } from "@/components/home/TrustedProviders";
import { homePopularServiceIds } from "@/lib/constants/home";
import {
  normalizeServiceValue,
  serviceCategories,
  type Service,
} from "@/lib/constants/services";
import { PROVIDER_AVAILABILITY_STATUSES } from "@/lib/constants/statuses";
import { getAuthenticatedServerUserId } from "@/services/auth/server";
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

function getServiceCounts(services: Service[], providers: Provider[]) {
  return services.reduce<Record<string, number>>((counts, service) => {
    const normalizedTitle = normalizeServiceValue(service.title);
    const normalizedSlug = normalizeServiceValue(service.slug);

    counts[service.id] = providers.filter((provider) => {
      const normalizedCategory = normalizeServiceValue(provider.category);

      return (
        normalizedCategory === normalizedTitle ||
        normalizedCategory === normalizedSlug ||
        normalizedCategory.includes(normalizedTitle) ||
        normalizedTitle.includes(normalizedCategory)
      );
    }).length;

    return counts;
  }, {});
}

function getAverageRatingLabel(providers: Provider[]) {
  const ratedProviders = providers.filter(
    (provider) => Number.isFinite(provider.rating) && provider.rating > 0,
  );

  if (ratedProviders.length === 0) {
    return null;
  }

  const average =
    ratedProviders.reduce((total, provider) => total + provider.rating, 0) / ratedProviders.length;

  return `${average.toFixed(1)}/5`;
}

export async function MarketplaceHome() {
  const [{ allProviders, filterOptions }, authenticatedUserId] = await Promise.all([
    getProviderDirectory(),
    getAuthenticatedServerUserId(),
  ]);
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
  const serviceCounts = getServiceCounts(popularServices, allProviders);
  const averageRatingLabel = getAverageRatingLabel(liveProviders);

  return (
    <div className="bg-[#FFFDF9] text-[var(--foreground)]">
      <HeroSection categories={categories} districts={districts} />
      <PopularServices serviceCounts={serviceCounts} services={popularServices} />
      <HomePremiumPanels
        activeProviderCount={metrics.activeProviders}
        averageRatingLabel={averageRatingLabel}
        completedRequestCount={metrics.completedRequests}
        districtCount={metrics.districts}
        isAuthenticated={Boolean(authenticatedUserId)}
        serviceCategoryCount={metrics.serviceCategories}
        source={metrics.source}
      />
      <TrustedProviders providers={featuredProviders} totalCount={allProviders.length} />
      <div className="sr-only" aria-live="polite">
        Bugün müsait canlı profil sayısı: {formatMetric(todayProviders.length)}.
      </div>
    </div>
  );
}
