import type { Metadata } from "next";
import Link from "next/link";
import { LazyVoiceCommandButton } from "@/components/accessibility/LazyVoiceCommandButton";
import { FuwuLogo, FuwuWatermark } from "@/components/brand/FuwuLogo";
import { Container } from "@/components/ui/Container";
import { ProviderFilters } from "@/components/providers/ProviderFilters";
import { ProviderList } from "@/components/providers/ProviderList";
import { appRoutes } from "@/lib/constants/navigation";
import { services } from "@/lib/constants/services";
import { PROVIDER_AVAILABILITY_STATUSES } from "@/lib/constants/statuses";
import { I18nText, type TranslationKey } from "@/lib/i18n";
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
  const { allProviders, filterOptions, providers: filteredProviders, source } = providerDirectory;
  const todayActiveCount = allProviders.filter(
    (provider) => provider.availability === PROVIDER_AVAILABILITY_STATUSES.musait,
  ).length;
  const todayActiveHref = appRoutes.providers;
  const heroBadges: Array<{ labelKey: TranslationKey; href: string }> = [
    { labelKey: "providers.badge.today", href: todayActiveHref },
    { labelKey: "providers.badge.price", href: "#provider-filters" },
    { labelKey: "providers.badge.contact", href: "#provider-results" },
  ];
  const marketStats: Array<{ value: number; labelKey: TranslationKey; href: string }> = [
    { value: todayActiveCount, labelKey: "providers.summary.activeToday", href: todayActiveHref },
    { value: services.length, labelKey: "providers.summary.categories", href: appRoutes.services },
    {
      value: filterOptions.districts.length,
      labelKey: "providers.summary.districts",
      href: appRoutes.providers,
    },
  ];

  return (
    <div className="bg-[var(--background)]">
      <section className="relative overflow-hidden border-b border-[var(--border)] bg-[linear-gradient(180deg,#FFFFFF_0%,#FAFAFB_54%,#F6F7F9_100%)]">
        <FuwuWatermark className="-right-20 top-10 text-[10rem] opacity-[0.035] sm:text-[13rem]" />
        <Container className="relative grid max-w-7xl gap-8 py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,400px)] lg:items-end lg:py-16">
          <div className="min-w-0 cursor-default select-none">
            <Link
              aria-label="Fuwu ana sayfasına git"
              className="inline-flex cursor-pointer rounded-lg bg-white px-4 py-3 shadow-[0_18px_54px_rgba(13,20,36,0.07)] ring-1 ring-[rgba(13,20,36,0.08)] transition-colors hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
              href={appRoutes.home}
            >
              <FuwuLogo size="md" />
            </Link>
            <p className="mt-7 text-sm font-black uppercase text-[var(--brand-orange-dark)]">
              <I18nText i18nKey="providers.hero.eyebrow" />
            </p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight text-[var(--brand-navy)] sm:text-5xl lg:text-6xl">
              <I18nText i18nKey="providers.hero.title" />
            </h1>
            <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">
              <I18nText i18nKey="providers.hero.subtitle" />
            </p>
            <p className="mt-4 max-w-2xl rounded-md border border-[rgba(255,138,0,0.24)] bg-white px-4 py-3 text-sm font-bold leading-6 text-[var(--muted)]">
              {source === "supabase"
                ? <I18nText i18nKey="providers.hero.liveNote" />
                : <I18nText i18nKey="providers.hero.fallbackNote" />}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {heroBadges.map((badge) => (
                <Link
                  className="max-w-full cursor-pointer select-none rounded-md bg-white px-3 py-2 text-sm font-bold leading-5 text-[var(--brand-navy)] shadow-[0_10px_26px_rgba(13,20,36,0.04)] ring-1 ring-[rgba(13,20,36,0.08)] transition-colors hover:bg-[var(--brand-orange-soft)] hover:text-[var(--brand-orange-dark)] active:bg-[var(--brand-orange)] active:text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
                  href={badge.href}
                  key={badge.labelKey}
                >
                  <I18nText i18nKey={badge.labelKey} />
                </Link>
              ))}
            </div>
          </div>

          <div className="cursor-default select-none rounded-lg bg-white p-5 text-[var(--brand-navy)] shadow-[0_18px_54px_rgba(13,20,36,0.08)] ring-1 ring-[rgba(13,20,36,0.08)]">
            <p className="text-xs font-bold uppercase text-[var(--brand-orange-dark)]">
              <I18nText i18nKey="providers.summary.eyebrow" />
            </p>
            <div className="mt-4 grid grid-cols-3 divide-x divide-[var(--border)] border-y border-[var(--border)] py-4 text-center">
              {marketStats.map((stat) => (
                <Link
                  className="group cursor-pointer select-none px-2 transition-colors hover:bg-[var(--brand-orange-soft)] active:bg-[var(--brand-orange)] active:text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
                  href={stat.href}
                  key={stat.labelKey}
                >
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="mt-1 text-xs font-bold text-[var(--muted)] group-active:text-white">
                    <I18nText i18nKey={stat.labelKey} />
                  </p>
                </Link>
              ))}
            </div>
            <Link
              className="mt-4 inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-md bg-[var(--brand-orange)] px-4 py-3 text-sm font-bold text-white shadow-[0_16px_34px_rgba(255,138,0,0.24)] transition-all hover:-translate-y-0.5 hover:bg-[var(--brand-orange-dark)] hover:shadow-[0_20px_42px_rgba(255,138,0,0.3)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
              href={appRoutes.providerApplication}
            >
              <I18nText i18nKey="cta.provider" />
            </Link>
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
          hasActiveFilters={hasActiveFilters}
          providers={filteredProviders}
          totalCount={providerDirectory.totalCount}
        />
      </Container>
    </div>
  );
}
