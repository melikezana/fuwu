import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getProviderById as getMockProviderById,
  providerAvailabilityOptions,
  providerAveragePrices,
  providerCategories,
  providerDistricts,
  providers as mockProviders,
} from "@/lib/constants/providers";
import { getSupabaseClientConfig, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import type {
  Provider,
  ProviderDataSource,
  ProviderDirectory,
  ProviderFilterOptions,
  ProviderFilters,
} from "@/types/provider";

export type {
  Provider,
  ProviderDataSource,
  ProviderDirectory,
  ProviderFilterOptions,
  ProviderFilters,
} from "@/types/provider";

type SupabaseProviderRow = Database["public"]["Tables"]["providers"]["Row"];

type SupabaseNamedRelation = {
  name: string | null;
  slug?: string | null;
};

type SupabaseProviderRecord = Pick<
  SupabaseProviderRow,
  | "id"
  | "name"
  | "phone"
  | "whatsapp"
  | "description"
  | "experience_years"
  | "average_price_min"
  | "average_price_max"
  | "rating"
> & {
  category?: SupabaseNamedRelation | SupabaseNamedRelation[] | null;
  district?: SupabaseNamedRelation | SupabaseNamedRelation[] | null;
  districts?: SupabaseNamedRelation | SupabaseNamedRelation[] | null;
  service_categories?: SupabaseNamedRelation | SupabaseNamedRelation[] | null;
};

type RelationLookupRow = {
  id: string;
  name: string;
  slug?: string | null;
};

type PriceRangeFilter = {
  maximumPrice: number | null;
  minimumPrice: number | null;
};

type ProviderReadResult = {
  providers: Provider[];
  source: ProviderDataSource;
};

const providerSelectQuery = `
  id,
  name,
  phone,
  whatsapp,
  description,
  experience_years,
  average_price_min,
  average_price_max,
  rating,
  category:service_categories(name, slug),
  district:districts(name, slug)
`;

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function createProvidersSupabaseClient(): SupabaseClient<Database> | null {
  const config = getSupabaseClientConfig();

  if (!config) {
    return null;
  }

  return createClient<Database>(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

function getRelationName(
  relation: SupabaseNamedRelation | SupabaseNamedRelation[] | null | undefined,
) {
  if (Array.isArray(relation)) {
    return relation[0]?.name?.trim() ?? "";
  }

  return relation?.name?.trim() ?? "";
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatAveragePrice(minimumPrice: number | null, maximumPrice: number | null) {
  if (typeof minimumPrice === "number" && typeof maximumPrice === "number") {
    return `${formatPrice(minimumPrice)} - ${formatPrice(maximumPrice)} TL`;
  }

  if (typeof minimumPrice === "number") {
    return `${formatPrice(minimumPrice)} TL ve üzeri`;
  }

  if (typeof maximumPrice === "number") {
    return `${formatPrice(maximumPrice)} TL'ye kadar`;
  }

  return "Fiyat görüşmede netleşir";
}

function normalizePhoneForWhatsApp(value: string) {
  const normalizedValue = value.replace(/\D/g, "");

  if (normalizedValue.startsWith("90")) {
    return normalizedValue;
  }

  return normalizedValue.startsWith("0")
    ? `9${normalizedValue}`
    : normalizedValue;
}

function createFallbackDescription(name: string, category: string, district: string) {
  return `${name}; ${district} bölgesinde ${category} hizmeti için doğrudan iletişime hazır bir Fuwu profilidir.`;
}

function mapSupabaseProvider(record: SupabaseProviderRecord, index = 0): Provider | null {
  const category = getRelationName(record.category ?? record.service_categories);
  const district = getRelationName(record.district ?? record.districts);

  if (!category || !district) {
    return null;
  }

  const description =
    record.description?.trim() || createFallbackDescription(record.name, category, district);
  const whatsapp = normalizePhoneForWhatsApp(record.whatsapp || record.phone);
  const experienceYears = Math.max(0, Number(record.experience_years ?? 0));

  return {
    id: record.id,
    name: record.name,
    category,
    district,
    rating: Number(record.rating ?? 0),
    experience: `${experienceYears} yıl`,
    averagePrice: formatAveragePrice(record.average_price_min, record.average_price_max),
    phone: record.phone,
    whatsapp,
    availability: "Bugün uygun",
    description,
    shortDescription: description,
    serviceAreas: [district],
    workingHours: "Hafta içi 09:00 - 18:00",
    servicesOffered: [`${category} hizmeti`],
    trustBadges: [
      "Fuwu onaylı profil",
      "Doğrudan iletişim",
      "Canlı sağlayıcı kaydı",
    ],
    completedJobs: 0,
    responseTime: "Kısa sürede dönüş",
    reviewCount: 0,
    featured: index < 6,
    source: "supabase",
  };
}

function isProvider(provider: Provider | null): provider is Provider {
  return Boolean(provider);
}

function normalizeFilterValue(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSlugValue(value: string) {
  return normalizeFilterValue(value).replace(/\s+/g, "-");
}

function getSearchTerms(value: string | undefined) {
  if (!hasFilterValue(value)) {
    return [];
  }

  return normalizeFilterValue(value ?? "")
    .split(" ")
    .filter((term) => term.length > 0);
}

function hasFilterValue(value: string | undefined) {
  return Boolean(value?.trim());
}

function matchesExactFilter(providerValue: string, requestedValue: string) {
  const normalizedProviderValue = normalizeFilterValue(providerValue);
  const normalizedRequestedValue = normalizeFilterValue(requestedValue);

  return (
    normalizedProviderValue === normalizedRequestedValue ||
    normalizeSlugValue(providerValue) === normalizeSlugValue(requestedValue)
  );
}

function matchesCategoryFilter(providerCategory: string, requestedCategory: string) {
  const providerValue = normalizeFilterValue(providerCategory);
  const requestedValue = normalizeFilterValue(requestedCategory);

  return (
    providerValue === requestedValue ||
    providerValue.includes(requestedValue) ||
    requestedValue.includes(providerValue)
  );
}

function matchesRelationFilter(record: RelationLookupRow, requestedValue: string) {
  return (
    matchesCategoryFilter(record.name, requestedValue) ||
    (record.slug ? matchesCategoryFilter(record.slug, requestedValue) : false)
  );
}

function parseMinimumRating(value: string | undefined) {
  if (!hasFilterValue(value)) {
    return null;
  }

  const rating = Number(value);

  return Number.isFinite(rating) ? rating : null;
}

function parseLocalizedNumber(value: string) {
  const parsedValue = Number(value.replace(/\./g, "").replace(",", "."));

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function parsePriceRangeFilter(value: string | undefined): PriceRangeFilter | null {
  const selectedPrice = value?.trim() ?? "";

  if (!selectedPrice) {
    return null;
  }

  const normalizedValue = normalizeFilterValue(selectedPrice);

  if (normalizedValue.includes("gorusmede")) {
    return {
      maximumPrice: null,
      minimumPrice: null,
    };
  }

  const priceValues =
    selectedPrice
      .match(/\d[\d.,]*/g)
      ?.map(parseLocalizedNumber)
      .filter((price): price is number => typeof price === "number") ?? [];

  if (priceValues.length >= 2) {
    return {
      minimumPrice: priceValues[0],
      maximumPrice: priceValues[1],
    };
  }

  if (priceValues.length === 1 && normalizedValue.includes("kadar")) {
    return {
      minimumPrice: null,
      maximumPrice: priceValues[0],
    };
  }

  if (priceValues.length === 1 && normalizedValue.includes("uzeri")) {
    return {
      minimumPrice: priceValues[0],
      maximumPrice: null,
    };
  }

  return null;
}

function matchesPriceFilter(providerPrice: string, selectedPrice: string) {
  const providerRange = parsePriceRangeFilter(providerPrice);
  const selectedRange = parsePriceRangeFilter(selectedPrice);

  if (!selectedRange) {
    return true;
  }

  if (!providerRange) {
    return normalizeFilterValue(providerPrice) === normalizeFilterValue(selectedPrice);
  }

  return (
    providerRange.minimumPrice === selectedRange.minimumPrice &&
    providerRange.maximumPrice === selectedRange.maximumPrice
  );
}

function matchesProviderSearchQuery(provider: Provider, query: string | undefined) {
  const searchTerms = getSearchTerms(query);

  if (searchTerms.length === 0) {
    return true;
  }

  const searchableText = normalizeFilterValue(
    [
      provider.name,
      provider.category,
      provider.district,
      provider.description,
      provider.shortDescription,
      provider.averagePrice,
      provider.experience,
      provider.availability,
      ...provider.serviceAreas,
      ...provider.servicesOffered,
    ].join(" "),
  );

  return searchTerms.every((term) => searchableText.includes(term));
}

function applyProviderFilters(providers: Provider[], filters: ProviderFilters = {}) {
  const minimumRating = parseMinimumRating(filters.rating);

  return providers.filter((provider) => {
    const categoryMatches =
      !hasFilterValue(filters.category) ||
      matchesCategoryFilter(provider.category, filters.category ?? "");
    const districtMatches =
      !hasFilterValue(filters.district) ||
      matchesExactFilter(provider.district, filters.district ?? "") ||
      provider.serviceAreas.some((serviceArea) =>
        matchesExactFilter(serviceArea, filters.district ?? ""),
      );
    const priceMatches =
      !hasFilterValue(filters.price) ||
      matchesPriceFilter(provider.averagePrice, filters.price ?? "");
    const ratingMatches = !minimumRating || provider.rating >= minimumRating;
    const availabilityMatches =
      !hasFilterValue(filters.availability) ||
      matchesExactFilter(provider.availability, filters.availability ?? "");
    const queryMatches = matchesProviderSearchQuery(provider, filters.query);

    return (
      categoryMatches &&
      districtMatches &&
      priceMatches &&
      ratingMatches &&
      availabilityMatches &&
      queryMatches
    );
  });
}

function buildFilterOptions(providers: Provider[]): ProviderFilterOptions {
  return {
    availabilityOptions: getUniqueSortedOptions(
      providers.map((provider) => provider.availability),
    ),
    averagePrices: Array.from(
      new Set(providers.map((provider) => provider.averagePrice).filter(Boolean)),
    ),
    categories: getUniqueSortedOptions(providers.map((provider) => provider.category)),
    districts: getUniqueSortedOptions(
      providers.flatMap((provider) => [provider.district, ...provider.serviceAreas]),
    ),
  };
}

function buildFallbackFilterOptions(): ProviderFilterOptions {
  return {
    availabilityOptions: [...providerAvailabilityOptions],
    averagePrices: [...providerAveragePrices],
    categories: [...providerCategories],
    districts: [...providerDistricts],
  };
}

function mergeLookupFilterOptions(
  providers: Provider[],
  lookups: Pick<ProviderFilterOptions, "categories" | "districts">,
): ProviderFilterOptions {
  const providerOptions = buildFilterOptions(providers);

  return {
    ...providerOptions,
    categories: lookups.categories,
    districts: lookups.districts,
  };
}

function getUniqueSortedOptions(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((firstValue, secondValue) =>
    firstValue.localeCompare(secondValue, "tr"),
  );
}

function warnProviderReadError(error: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.warn("Provider Supabase read failed. Falling back to static public data.", error);
  }
}

function handleSupabaseListError(error: unknown) {
  warnProviderReadError(error);
  return null;
}

function handleSupabaseDetailError(error: unknown) {
  warnProviderReadError(error);
  return undefined;
}

async function fetchMatchingCategoryIds(
  supabase: SupabaseClient<Database>,
  category: string | undefined,
): Promise<string[] | null> {
  if (!hasFilterValue(category)) {
    return null;
  }

  const { data, error } = await supabase
    .from("service_categories")
    .select("id, name, slug")
    .eq("is_active", true);

  if (error) {
    throw error;
  }

  return ((data ?? []) as RelationLookupRow[])
    .filter((record) => matchesRelationFilter(record, category ?? ""))
    .map((record) => record.id);
}

async function fetchServiceCategoryFilterOptions(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from("service_categories")
    .select("name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return getUniqueSortedOptions((data ?? []).map((record) => record.name));
}

async function fetchDistrictFilterOptions(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from("districts")
    .select("name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return getUniqueSortedOptions((data ?? []).map((record) => record.name));
}

async function fetchFilterLookupsFromSupabase(): Promise<Pick<
  ProviderFilterOptions,
  "categories" | "districts"
> | null> {
  try {
    const supabase = createProvidersSupabaseClient();

    if (!supabase) {
      return null;
    }

    const [categories, districts] = await Promise.all([
      fetchServiceCategoryFilterOptions(supabase),
      fetchDistrictFilterOptions(supabase),
    ]);

    return {
      categories,
      districts,
    };
  } catch (error) {
    warnProviderReadError(error);
    return null;
  }
}

async function fetchMatchingDistrictIds(
  supabase: SupabaseClient<Database>,
  district: string | undefined,
): Promise<string[] | null> {
  if (!hasFilterValue(district)) {
    return null;
  }

  const { data, error } = await supabase
    .from("districts")
    .select("id, name, slug")
    .eq("is_active", true);

  if (error) {
    throw error;
  }

  return ((data ?? []) as RelationLookupRow[])
    .filter(
      (record) =>
        matchesExactFilter(record.name, district ?? "") ||
        matchesRelationFilter(record, district ?? ""),
    )
    .map((record) => record.id);
}

async function fetchProvidersFromSupabase(
  filters: ProviderFilters = {},
): Promise<Provider[] | null> {
  try {
    const supabase = createProvidersSupabaseClient();

    if (!supabase) {
      return null;
    }

    const [categoryIds, districtIds] = await Promise.all([
      fetchMatchingCategoryIds(supabase, filters.category),
      fetchMatchingDistrictIds(supabase, filters.district),
    ]);

    if (categoryIds?.length === 0 || districtIds?.length === 0) {
      return [];
    }

    const priceRange = parsePriceRangeFilter(filters.price);
    const minimumRating = parseMinimumRating(filters.rating);

    let query = supabase
      .from("providers")
      .select(providerSelectQuery)
      .eq("is_active", true)
      .eq("is_approved", true);

    if (categoryIds) {
      query = query.in("category_id", categoryIds);
    }

    if (districtIds) {
      query = query.in("district_id", districtIds);
    }

    if (priceRange) {
      if (priceRange.minimumPrice === null) {
        query = query.is("average_price_min", null);
      } else {
        query = query.eq("average_price_min", priceRange.minimumPrice);
      }

      if (priceRange.maximumPrice === null) {
        query = query.is("average_price_max", null);
      } else {
        query = query.eq("average_price_max", priceRange.maximumPrice);
      }
    }

    if (minimumRating) {
      query = query.gte("rating", minimumRating);
    }

    const { data, error } = await query.order("rating", { ascending: false });

    if (error) {
      return handleSupabaseListError(error);
    }

    const providers = ((data ?? []) as unknown as SupabaseProviderRecord[])
      .map((record, index) => mapSupabaseProvider(record, index))
      .filter(isProvider);

    return applyProviderFilters(providers, {
      availability: filters.availability,
      query: filters.query,
    });
  } catch (error) {
    return handleSupabaseListError(error);
  }
}

async function fetchProviderByIdFromSupabase(
  id: string,
): Promise<Provider | null | undefined> {
  try {
    if (!isUuid(id)) {
      return isSupabaseConfigured ? undefined : null;
    }

    const supabase = createProvidersSupabaseClient();

    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase
      .from("providers")
      .select(providerSelectQuery)
      .eq("id", id)
      .eq("is_active", true)
      .eq("is_approved", true)
      .maybeSingle();

    if (error) {
      return handleSupabaseDetailError(error);
    }

    if (!data) {
      return undefined;
    }

    return mapSupabaseProvider(data as unknown as SupabaseProviderRecord);
  } catch (error) {
    return handleSupabaseDetailError(error);
  }
}

async function readProviders(filters: ProviderFilters = {}): Promise<ProviderReadResult> {
  const supabaseProviders = await fetchProvidersFromSupabase(filters);

  if (supabaseProviders !== null) {
    return {
      providers: supabaseProviders,
      source: "supabase",
    };
  }

  return {
    providers: applyProviderFilters(mockProviders, filters),
    source: "fallback",
  };
}

export async function getProviderDirectory(
  filters: ProviderFilters = {},
): Promise<ProviderDirectory> {
  const [filteredProviderResult, allProviderResult] = await Promise.all([
    readProviders(filters),
    readProviders(),
  ]);
  const allProviders = allProviderResult.providers;
  const filterLookups =
    allProviderResult.source === "supabase" ? await fetchFilterLookupsFromSupabase() : null;
  const fallbackFilterOptions = buildFallbackFilterOptions();
  const filterOptions = filterLookups
    ? mergeLookupFilterOptions(allProviders, filterLookups)
    : allProviderResult.source === "supabase"
      ? {
          ...buildFilterOptions(allProviders),
          categories: fallbackFilterOptions.categories,
          districts: fallbackFilterOptions.districts,
        }
      : buildFilterOptions(allProviders);

  return {
    allProviders,
    filterOptions,
    providers: filteredProviderResult.providers,
    source:
      filteredProviderResult.source === "supabase" && allProviderResult.source === "supabase"
        ? "supabase"
        : "fallback",
    totalCount: allProviders.length,
  };
}

export async function getProviders(filters: ProviderFilters = {}): Promise<Provider[]> {
  const providerResult = await readProviders(filters);

  return providerResult.providers;
}

export async function getProviderById(id: string): Promise<Provider | undefined> {
  const supabaseProvider = await fetchProviderByIdFromSupabase(id);

  if (supabaseProvider !== null) {
    return supabaseProvider;
  }

  return getMockProviderById(id);
}

export async function getProvidersByCategory(category: string): Promise<Provider[]> {
  return getProviders({ category });
}

export async function getProvidersByDistrict(district: string): Promise<Provider[]> {
  return getProviders({ district });
}
