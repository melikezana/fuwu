import type { Metadata } from "next";
import Link from "next/link";
import { LazyVoiceCommandButton } from "@/components/accessibility/LazyVoiceCommandButton";
import { FuwuLogo } from "@/components/brand/FuwuLogo";
import { Container } from "@/components/ui/Container";
import { ProviderFilters } from "@/components/providers/ProviderFilters";
import { ProviderList } from "@/components/providers/ProviderList";
import { appRoutes } from "@/lib/constants/navigation";
import { normalizeServiceValue, services } from "@/lib/constants/services";
import { I18nText } from "@/lib/i18n";
import {
  createPageMetadata,
  getProviderListingLabel,
  toTurkishTitleCase,
} from "@/lib/seo";
import { getProviderDirectory } from "@/services/providers";

export const dynamic = "force-dynamic";

type ProvidersSearchParams = {
  category?: string | string[];
  district?: string | string[];
  average_price_max?: string | string[];
  average_price_min?: string | string[];
  budget?: string | string[];
  maxPrice?: string | string[];
  minPrice?: string | string[];
  price?: string | string[];
  rating?: string | string[];
  q?: string | string[];
  search?: string | string[];
  availability?: string | string[];
  service?: string | string[];
  location?: string | string[];
};

type ProvidersPageProps = {
  searchParams?: Promise<ProvidersSearchParams>;
};

function getSearchParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function createProvidersCanonicalPath(params: {
  availability?: string;
  category?: string;
  district?: string;
  maximumPrice?: string;
  minimumPrice?: string;
  price?: string;
  query?: string;
  rating?: string;
  budget?: string;
}) {
  const canonicalParams = new URLSearchParams();

  if (params.category) {
    canonicalParams.set("category", params.category);
  }

  if (params.district) {
    canonicalParams.set("district", params.district);
  }

  if (params.minimumPrice) {
    canonicalParams.set("average_price_min", params.minimumPrice);
  }

  if (params.maximumPrice) {
    canonicalParams.set("average_price_max", params.maximumPrice);
  }

  if (params.price) {
    canonicalParams.set("price", params.price);
  }

  if (params.rating) {
    canonicalParams.set("rating", params.rating);
  }

  if (params.budget) {
    canonicalParams.set("budget", params.budget);
  }

  if (params.availability) {
    canonicalParams.set("availability", params.availability);
  }

  if (params.query) {
    canonicalParams.set("q", params.query);
  }

  const queryString = canonicalParams.toString();

  return queryString ? `${appRoutes.providers}?${queryString}` : appRoutes.providers;
}

export async function generateMetadata({ searchParams }: ProvidersPageProps): Promise<Metadata> {
  const params = await searchParams;
  const selectedCategory = getSearchParam(params?.category) || getSearchParam(params?.service);
  const selectedDistrict = getSearchParam(params?.district) || getSearchParam(params?.location);
  const selectedMinimumPrice =
    getSearchParam(params?.average_price_min) || getSearchParam(params?.minPrice);
  const selectedMaximumPrice =
    getSearchParam(params?.average_price_max) || getSearchParam(params?.maxPrice);
  const selectedPrice = getSearchParam(params?.price);
  const selectedRating = getSearchParam(params?.rating);
  const selectedQuery = getSearchParam(params?.q) || getSearchParam(params?.search);
  const selectedAvailability = getSearchParam(params?.availability);
  const selectedBudget = getSearchParam(params?.budget);
  const areaLabel = selectedDistrict ? toTurkishTitleCase(selectedDistrict) : "İstanbul";
  const categoryLabel = selectedCategory ? getProviderListingLabel(selectedCategory) : "";
  const hasGranularFilters = Boolean(
    selectedAvailability ||
      selectedBudget ||
      selectedMaximumPrice ||
      selectedMinimumPrice ||
      selectedPrice ||
      selectedQuery ||
      selectedRating,
  );
  const title = selectedCategory
    ? `${areaLabel} ${categoryLabel} | Fuwu`
    : selectedDistrict
      ? `${areaLabel} Ev Hizmeti Ustaları | Fuwu`
      : "İstanbul Ev Hizmeti Ustaları | Fuwu";
  const description = selectedCategory
    ? `${areaLabel} bölgesinde ${categoryLabel.toLocaleLowerCase("tr")} profillerini Fuwu’da fiyat aralığı, puan ve telefon/WhatsApp iletişim bilgileriyle karşılaştırın.`
    : `${areaLabel} genelinde tesisatçı, elektrikçi, temizlik ve ev hizmeti ustalarını Fuwu’da fiyat, puan ve direkt iletişim bilgileriyle karşılaştırın.`;

  return createPageMetadata({
    title,
    description,
    path: createProvidersCanonicalPath({
      availability: selectedAvailability,
      category: selectedCategory,
      district: selectedDistrict,
      maximumPrice: selectedMaximumPrice,
      minimumPrice: selectedMinimumPrice,
      price: selectedPrice,
      query: selectedQuery,
      rating: selectedRating,
      budget: selectedBudget,
    }),
    keywords: [
      selectedCategory,
      selectedDistrict,
      selectedQuery,
      categoryLabel,
      `${areaLabel} usta`,
      "Fuwu Hizmet",
    ].filter((keyword): keyword is string => Boolean(keyword)),
    noIndex: hasGranularFilters,
  });
}

export default async function ProvidersPage({ searchParams }: ProvidersPageProps) {
  const params = await searchParams;
  const selectedCategory = getSearchParam(params?.category) || getSearchParam(params?.service);
  const selectedDistrict = getSearchParam(params?.district) || getSearchParam(params?.location);
  const selectedMinimumPrice =
    getSearchParam(params?.average_price_min) || getSearchParam(params?.minPrice);
  const selectedMaximumPrice =
    getSearchParam(params?.average_price_max) || getSearchParam(params?.maxPrice);
  const selectedPrice = getSearchParam(params?.price);
  const selectedRating = getSearchParam(params?.rating);
  const selectedQuery = getSearchParam(params?.q) || getSearchParam(params?.search);
  const selectedAvailability = getSearchParam(params?.availability);
  const selectedBudget = getSearchParam(params?.budget);
  const hasActiveFilters = [
    selectedAvailability,
    selectedCategory,
    selectedDistrict,
    selectedMaximumPrice,
    selectedMinimumPrice,
    selectedPrice,
    selectedQuery,
    selectedRating,
    selectedBudget,
  ].some((value) => Boolean(value.trim()));
  const providerDirectory = await getProviderDirectory({
    availability: selectedAvailability,
    category: selectedCategory,
    district: selectedDistrict,
    maximumPrice: selectedMaximumPrice,
    minimumPrice: selectedMinimumPrice,
    price: selectedPrice,
    query: selectedQuery,
    rating: selectedRating,
    budget: selectedBudget,
  });
  const { filterOptions, providers: filteredProviders, source } = providerDirectory;
  const selectedCategoryLabel =
    services.find(
      (service) =>
        normalizeServiceValue(service.title) ===
        normalizeServiceValue(selectedCategory),
    )?.title ?? toTurkishTitleCase(selectedCategory);
  const categoryDistrictEmptyState =
    selectedCategory && selectedDistrict && filteredProviders.length === 0
      ? {
          requestHref: `${appRoutes.request}?${new URLSearchParams({
            district: selectedDistrict,
            service: selectedCategory,
          }).toString()}`,
          title: `Bu bölgede henüz ${selectedCategoryLabel} ustası yok`,
        }
      : undefined;

  return (
    <div className="bg-[var(--background)]">
      <section className="relative overflow-hidden border-b border-[var(--border)] bg-[linear-gradient(180deg,#FFFFFF_0%,#FAFAFB_54%,#F6F7F9_100%)]">
        <Container className="relative max-w-7xl py-8 sm:py-10 lg:py-12">
          <div className="min-w-0 cursor-default select-none lg:max-w-3xl">
            <Link
              aria-label="Fuwu ana sayfasına git"
              className="inline-flex cursor-pointer rounded-md bg-white px-3 py-2 shadow-[var(--shadow-subtle)] ring-1 ring-[rgba(13,20,36,0.08)] transition-colors hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
              href={appRoutes.home}
            >
              <FuwuLogo size="sm" />
            </Link>
            <p className="mt-5 text-sm font-semibold uppercase text-[var(--brand-orange-dark)]">
              <I18nText i18nKey="providers.hero.eyebrow" />
            </p>
            <h1 className="mt-2 max-w-3xl text-3xl font-semibold leading-tight text-[var(--brand-navy)] sm:text-4xl lg:text-5xl">
              <I18nText i18nKey="providers.hero.title" />
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[var(--muted)] sm:text-base sm:leading-7">
              <I18nText i18nKey="providers.hero.subtitle" />
            </p>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[var(--muted)]">
              {source === "supabase"
                ? <I18nText i18nKey="providers.hero.liveNote" />
                : <I18nText i18nKey="providers.hero.fallbackNote" />}
            </p>
          </div>
        </Container>
      </section>

      <section className="border-b border-[var(--border)] bg-[var(--background)]" id="provider-filters">
        <Container className="max-w-7xl py-6 sm:py-8">
          <ProviderFilters
            availabilityOptions={filterOptions.availabilityOptions}
            averagePrices={filterOptions.averagePrices}
            categories={filterOptions.categories}
            districts={filterOptions.districts}
            values={{
              availability: selectedAvailability,
              category: selectedCategory,
              district: selectedDistrict,
              maximumPrice: selectedMaximumPrice,
              minimumPrice: selectedMinimumPrice,
              price: selectedPrice,
              budget: selectedBudget,
              query: selectedQuery,
              rating: selectedRating,
            }}
          />
          <LazyVoiceCommandButton
            categories={filterOptions.categories}
            districts={filterOptions.districts}
            providers={filteredProviders}
          />
        </Container>
      </section>

      <Container className="max-w-7xl py-8 sm:py-10 lg:py-12" id="provider-results">
        <ProviderList
          categoryDistrictEmptyState={categoryDistrictEmptyState}
          hasActiveFilters={hasActiveFilters}
          providers={filteredProviders}
          totalCount={providerDirectory.totalCount}
        />
      </Container>
    </div>
  );
}
