<<<<<<< HEAD
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
  const hasActiveFilters = [
    selectedAvailability,
    selectedCategory,
    selectedDistrict,
    selectedMaximumPrice,
    selectedMinimumPrice,
    selectedPrice,
    selectedQuery,
    selectedRating,
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
=======
"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { Provider } from "@/services/providers";
import { matchingService } from "@/services/providers/matching";
import ProviderCard from "@/components/providers/ProviderCard";
import { SkeletonGrid } from "@/components/ui/Skeletons";
import { Alert } from "@/components/ui/Alerts";
import { CATEGORIES, DISTRICTS } from "@/constants/filters";

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");

  useEffect(() => {
    fetchProviders(selectedCategory, selectedDistrict);
  }, [selectedCategory, selectedDistrict]);

  const fetchProviders = async (category: string, district: string) => {
    setLoading(true);
    setError(null);
    try {
      if (category && district) {
        const data = await matchingService.matchProviders(category, district);
        setProviders(data);
      } else {
        // If no strict matching, just show empty or all. Here we require filters to show data to mimic a real marketplace flow.
        setProviders([]);
      }
    } catch (err: any) {
      setError("Ustalar yüklenirken bir sorun oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F5F6F8] flex flex-col">
      <Navbar />
      
      <div className="bg-white border-b border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row gap-4 items-center">
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full md:w-64 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF8A00] bg-[#F5F6F8]"
          >
            <option value="">Hizmet Seçin...</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select 
            value={selectedDistrict} 
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="w-full md:w-64 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF8A00] bg-[#F5F6F8]"
          >
            <option value="">İlçe Seçin...</option>
            {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 p-6 lg:px-12 max-w-7xl mx-auto w-full py-8">
        {error && <Alert type="error" message={error} className="mb-6" />}

        {!selectedCategory || !selectedDistrict ? (
          <div className="text-center py-20">
            <h3 className="text-xl font-medium text-gray-500">Sonuçları görmek için hizmet ve ilçe seçin.</h3>
          </div>
        ) : loading ? (
          <SkeletonGrid count={4} />
        ) : providers.length === 0 ? (
          <Alert 
            type="info" 
            title="Usta Bulunamadı" 
            message="Seçtiğiniz kriterlere uygun onaylı ve müsait usta şu an bulunmuyor. Farklı kriterler deneyebilirsiniz." 
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map(provider => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        )}
      </div>
    </main>
>>>>>>> 41e55ab (Full marketplace backend auth and production update)
  );
}
