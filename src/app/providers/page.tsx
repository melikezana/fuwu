import type { Metadata } from "next";
import Link from "next/link";
import { SlidersHorizontal, UsersRound } from "lucide-react";
import { LazyVoiceCommandButton } from "@/components/accessibility/LazyVoiceCommandButton";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/Premium";
import { ProviderFilters } from "@/components/providers/ProviderFilters";
import { ProviderList } from "@/components/providers/ProviderList";
import { appRoutes } from "@/lib/constants/navigation";
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
  const categoryDistrictEmptyState =
    selectedCategory && selectedDistrict && filteredProviders.length === 0
      ? {
          requestHref: `${appRoutes.request}?${new URLSearchParams({
            district: selectedDistrict,
            service: selectedCategory,
          }).toString()}`,
        }
      : undefined;
  const activeFilterCount = [
    selectedAvailability,
    selectedBudget,
    selectedCategory,
    selectedDistrict,
    selectedMaximumPrice,
    selectedMinimumPrice,
    selectedPrice,
    selectedQuery,
    selectedRating,
  ].filter(Boolean).length;

  return (
    <div className="premium-page-shell">
      <PageHeader
        actions={
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-[rgba(20,33,61,0.1)] bg-white px-4 text-sm font-bold text-[var(--brand-navy)] shadow-[var(--shadow-subtle)] transition-all hover:-translate-y-0.5 hover:border-[rgba(249,115,22,0.42)] hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
            href={appRoutes.request}
          >
            Talep Oluştur
          </Link>
        }
        badge={source === "supabase" ? "Canlı veri" : "Veri bağlantısı bekleniyor"}
        breadcrumbs={
          <>
            <Link className="hover:text-[var(--brand-navy)]" href={appRoutes.home}>
              Ana sayfa
            </Link>
            <span>/</span>
            <span className="text-[var(--brand-navy)]">Ustalar</span>
          </>
        }
        description={
          <>
            <I18nText i18nKey="providers.hero.subtitle" />{" "}
            {source === "supabase" ? (
              <I18nText i18nKey="providers.hero.liveNote" />
            ) : (
              <I18nText i18nKey="providers.hero.fallbackNote" />
            )}
          </>
        }
        eyebrow={<I18nText i18nKey="providers.hero.eyebrow" />}
        metrics={[
          {
            icon: UsersRound,
            label: "Görünen profil",
            value: filteredProviders.length,
          },
          {
            icon: UsersRound,
            label: "Toplam profil",
            value: providerDirectory.totalCount,
          },
          {
            icon: SlidersHorizontal,
            label: "Aktif filtre",
            value: activeFilterCount,
          },
        ]}
        title={<I18nText i18nKey="providers.hero.title" />}
      />

      <section className="border-b border-[var(--border)] bg-white/70" id="provider-filters">
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
          providers={filteredProviders}
          totalCount={providerDirectory.totalCount}
        />
      </Container>
    </div>
  );
}
