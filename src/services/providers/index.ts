import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  normalizeProviderAvailabilityStatus,
  type ProviderAvailabilityStatus,
} from "@/lib/constants/statuses";
import {
  getProviderById as getMockProviderById,
  providerAvailabilityOptions,
  providerAveragePrices,
  providerBudgetOptions,
  providerCategories,
  providerDistricts,
  providers as mockProviders,
  type ProviderBudgetValue,
} from "@/lib/constants/providers";
import { handleServiceError } from "@/lib/errors";
import { getSupabaseClientConfig, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  calculateProviderProfileCompletion,
  formatProviderResponseTime,
  formatProviderWorkingHours,
  getProviderOperationalStatus,
  getProviderTrustBadges,
} from "@/lib/providers/trust";
import type { Database } from "@/lib/supabase/types";
import { sanitizePhone, sanitizeText } from "@/lib/validations";
import {
  isProviderPriceRangeRelevantToBudget,
  mapBudgetTagToPriceRange,
  normalizeBudgetTag,
} from "@/services/matching/budget";
import { createServiceSuccess } from "@/services/serviceResponse";
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
  | "category_id"
  | "district_id"
  | "name"
  | "phone"
  | "whatsapp"
  | "description"
  | "experience_years"
  | "average_price_min"
  | "average_price_max"
  | "rating"
  | "working_hours"
  | "is_verified"
  | "phone_verified"
  | "identity_verified"
  | "last_active_at"
  | "response_time_minutes"
  | "profile_completion_score"
  | "profile_image_url"
> & {
  availability?: string | null;
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

export type MarketplaceTrustMetrics = {
  activeProviders: number;
  completedRequests: number;
  districts: number;
  serviceCategories: number;
  source: ProviderDataSource;
};

type MarketplaceTrustMetricFallbacks = {
  activeProviders: number;
  districts: number;
  serviceCategories: number;
};

const providerSelectQuery = `
  id,
  category_id,
  district_id,
  name,
  phone,
  whatsapp,
  description,
  experience_years,
  average_price_min,
  average_price_max,
  rating,
  availability,
  working_hours,
  is_verified,
  phone_verified,
  identity_verified,
  last_active_at,
  response_time_minutes,
  profile_completion_score,
  profile_image_url,
  category:service_categories(name, slug),
  district:districts(name, slug)
`;

const providerSelectQueryWithoutAvailability = `
  id,
  category_id,
  district_id,
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

const optionalProviderColumnNames = [
  "availability",
  "identity_verified",
  "is_verified",
  "last_active_at",
  "phone_verified",
  "profile_completion_score",
  "profile_image_url",
  "response_time_minutes",
  "working_hours",
];

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
  const isMinValid = typeof minimumPrice === "number" && Number.isFinite(minimumPrice);
  const isMaxValid = typeof maximumPrice === "number" && Number.isFinite(maximumPrice);

  if (isMinValid && isMaxValid) {
    return `${formatPrice(minimumPrice as number)} TL - ${formatPrice(maximumPrice as number)} TL`;
  }

  if (isMinValid) {
    return `${formatPrice(minimumPrice as number)} TL ve üzeri`;
  }

  if (isMaxValid) {
    return `${formatPrice(maximumPrice as number)} TL'ye kadar`;
  }

  return "Fiyat bilgisi yakında";
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

function getProviderAvailability(value: string | null | undefined): ProviderAvailabilityStatus {
  return normalizeProviderAvailabilityStatus(value);
}

function normalizeResponseTimeMinutes(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.round(value);
}

function mapSupabaseProvider(record: SupabaseProviderRecord, index = 0): Provider | null {
  const category = sanitizeText(getRelationName(record.category ?? record.service_categories), 120);
  const district = sanitizeText(getRelationName(record.district ?? record.districts), 120);
  const name = sanitizeText(record.name, 120);
  const phone = sanitizePhone(record.phone);

  if (!category || !district || !name || !phone) {
    return null;
  }

  const description =
    sanitizeText(record.description ?? "", 900) || createFallbackDescription(name, category, district);
  const whatsapp = normalizePhoneForWhatsApp(sanitizePhone(record.whatsapp || "") || phone);
  const experienceYears = Math.max(0, Number(record.experience_years ?? 0));
  const availability = getProviderAvailability(record.availability);
  const workingHours = formatProviderWorkingHours(record.working_hours);
  const servicesOffered = [`${category} hizmeti`];
  const responseTimeMinutes = normalizeResponseTimeMinutes(record.response_time_minutes);
  const profileImageUrl = sanitizeText(record.profile_image_url ?? "", 500) || undefined;
  const profileCompletion = calculateProviderProfileCompletion({
    availability,
    category,
    description,
    district,
    phone,
    profileImageUrl,
    servicesOffered,
    workingHours,
  });

  return {
    id: record.id,
    name,
    categoryId: record.category_id,
    category,
    districtId: record.district_id,
    district,
    rating: Number(record.rating ?? 0),
    experience: `${experienceYears} yıl`,
    averagePriceMin: record.average_price_min,
    averagePriceMax: record.average_price_max,
    averagePrice: formatAveragePrice(record.average_price_min, record.average_price_max),
    phone,
    profileImageUrl,
    whatsapp,
    availability,
    availabilityStatus: getProviderOperationalStatus({
      availability,
      workingHours,
    }),
    description,
    shortDescription: description,
    serviceAreas: [district],
    workingHours,
    servicesOffered,
    trustBadges: getProviderTrustBadges({
      identityVerified: record.identity_verified,
      isVerified: record.is_verified,
      lastActiveAt: record.last_active_at,
      phoneVerified: record.phone_verified,
    }),
    completedJobs: 0,
    responseTime: formatProviderResponseTime(responseTimeMinutes),
    responseTimeMinutes,
    reviewCount: 0,
    isVerified: Boolean(record.is_verified),
    phoneVerified: Boolean(record.phone_verified),
    identityVerified: Boolean(record.identity_verified),
    lastActiveAt: record.last_active_at ?? null,
    profileCompletionScore: profileCompletion.score,
    profileCompletionMissingFields: profileCompletion.missingFields,
    featured: index < 6,
    source: "supabase",
  };
}

function isMissingOptionalProviderColumn(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as { code?: unknown; details?: unknown; message?: unknown };
  const errorText = [record.code, record.details, record.message]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLocaleLowerCase("tr");

  return (
    errorText.includes("column") &&
    optionalProviderColumnNames.some((columnName) => errorText.includes(columnName))
  );
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

function normalizeBudgetFilterValue(value: string | undefined): ProviderBudgetValue | undefined {
  return normalizeBudgetTag(value);
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

function hasAnyProviderFilterValue(filters: ProviderFilters) {
  return Object.values(filters).some((value) => hasFilterValue(value));
}

function normalizeOptionalFilterText(value: string | undefined, maxLength = 120) {
  const sanitizedValue = sanitizeText(value ?? "", maxLength);

  return sanitizedValue || undefined;
}

function normalizeProviderFilters(filters: ProviderFilters = {}): ProviderFilters {
  return {
    availability: normalizeOptionalFilterText(filters.availability, 80),
    category: normalizeOptionalFilterText(filters.category),
    district: normalizeOptionalFilterText(filters.district),
    maximumPrice: normalizeOptionalFilterText(filters.maximumPrice, 40),
    minimumPrice: normalizeOptionalFilterText(filters.minimumPrice, 40),
    price: normalizeOptionalFilterText(filters.price, 80),
    budget: normalizeBudgetFilterValue(filters.budget),
    query: normalizeOptionalFilterText(filters.query, 160),
    rating: normalizeOptionalFilterText(filters.rating, 12),
  };
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

function normalizePriceRangeOrder(range: PriceRangeFilter): PriceRangeFilter {
  if (
    typeof range.minimumPrice === "number" &&
    typeof range.maximumPrice === "number" &&
    range.minimumPrice > range.maximumPrice
  ) {
    return {
      minimumPrice: range.maximumPrice,
      maximumPrice: range.minimumPrice,
    };
  }

  return range;
}

function parsePriceBoundary(value: string | undefined) {
  if (!hasFilterValue(value)) {
    return null;
  }

  const priceValue = value?.match(/\d[\d.,]*/)?.[0];

  return priceValue ? parseLocalizedNumber(priceValue) : null;
}

// Removed parseBudgetPriceRangeFilter to use explicit query logic instead

function parseExplicitPriceRangeFilter(filters: ProviderFilters): PriceRangeFilter | null {
  const minimumPrice = parsePriceBoundary(filters.minimumPrice);
  const maximumPrice = parsePriceBoundary(filters.maximumPrice);

  if (minimumPrice === null && maximumPrice === null) {
    return null;
  }

  return normalizePriceRangeOrder({
    minimumPrice,
    maximumPrice,
  });
}

function isProviderWithinPriceRange(
  providerRange: PriceRangeFilter,
  selectedRange: PriceRangeFilter,
) {
  const minimumMatches =
    selectedRange.minimumPrice === null ||
    (typeof providerRange.minimumPrice === "number" &&
      providerRange.minimumPrice >= selectedRange.minimumPrice);
  const maximumMatches =
    selectedRange.maximumPrice === null ||
    (typeof providerRange.maximumPrice === "number" &&
      providerRange.maximumPrice <= selectedRange.maximumPrice);

  return minimumMatches && maximumMatches;
}

function matchesPriceFilter(providerPrice: string, filters: ProviderFilters) {
  const providerRange = parsePriceRangeFilter(providerPrice);
  const budget = normalizeBudgetFilterValue(filters.budget);

  if (budget) {
    if (budget === "acil-hizmet") {
      return true;
    }

    return isProviderPriceRangeRelevantToBudget(providerRange, mapBudgetTagToPriceRange(budget));
  }

  const explicitRange = parseExplicitPriceRangeFilter(filters);

  if (explicitRange) {
    return providerRange ? isProviderWithinPriceRange(providerRange, explicitRange) : false;
  }

  const selectedRange = parsePriceRangeFilter(filters.price);

  if (!selectedRange) {
    return true;
  }

  if (!providerRange) {
    return normalizeFilterValue(providerPrice) === normalizeFilterValue(filters.price ?? "");
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
      provider.availabilityStatus.label,
      provider.responseTime,
      ...provider.serviceAreas,
      ...provider.servicesOffered,
      ...provider.trustBadges.map((badge) => badge.label),
    ].join(" "),
  );

  return searchTerms.every((term) => searchableText.includes(term));
}

function applyProviderFilters(providers: Provider[], filters: ProviderFilters = {}) {
  const minimumRating = parseMinimumRating(filters.rating);
  const hasPriceFilter =
    hasFilterValue(filters.budget) ||
    hasFilterValue(filters.price) ||
    hasFilterValue(filters.minimumPrice) ||
    hasFilterValue(filters.maximumPrice);

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
    const priceMatches = !hasPriceFilter || matchesPriceFilter(provider.averagePrice, filters);
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
    budgetOptions: providerBudgetOptions.map((option) => option.value),
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
    budgetOptions: providerBudgetOptions.map((option) => option.value),
    categories: [...providerCategories],
    districts: [...providerDistricts],
  };
}

function mergeLookupFilterOptions(
  providers: Provider[],
  lookups: Pick<ProviderFilterOptions, "categories" | "districts">,
): ProviderFilterOptions {
  const providerOptions = buildFilterOptions(providers);
  const fallbackOptions = buildFallbackFilterOptions();

  return {
    ...providerOptions,
    availabilityOptions: providerOptions.availabilityOptions.length
      ? providerOptions.availabilityOptions
      : fallbackOptions.availabilityOptions,
    categories: getUniqueSortedOptions([...lookups.categories, ...fallbackOptions.categories]),
    districts: lookups.districts,
  };
}

function getUniqueSortedOptions(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((firstValue, secondValue) =>
    firstValue.localeCompare(secondValue, "tr"),
  );
}

function warnProviderReadError(error: unknown) {
  handleServiceError(error, {
    logContext: "Provider Supabase read failed. Falling back to static public data.",
    publicMessage: "Usta listesi şu anda canlı veriden yüklenemedi.",
  });
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

    const explicitPriceRange = parseExplicitPriceRangeFilter(filters);
    const priceRange = explicitPriceRange ?? parsePriceRangeFilter(filters.price);
    const minimumRating = parseMinimumRating(filters.rating);

    const createQuery = (selectQuery: string) =>
      supabase
        .from("providers")
        .select(selectQuery)
        .eq("is_active", true)
        .eq("is_approved", true);

    let query = createQuery(providerSelectQuery);

    if (categoryIds) {
      query = query.in("category_id", categoryIds);
    }

    if (districtIds) {
      query = query.in("district_id", districtIds);
    }

    const budget = normalizeBudgetFilterValue(filters.budget);
    
    const budgetPriceRange = mapBudgetTagToPriceRange(budget);

    if (budgetPriceRange) {
      if (typeof budgetPriceRange.minimumPrice === "number") {
        query = query.gte("average_price_max", budgetPriceRange.minimumPrice);
      }

      if (typeof budgetPriceRange.maximumPrice === "number") {
        query = query.lte("average_price_min", budgetPriceRange.maximumPrice);
      }
    } else if (budget === "acil-hizmet") {
      // Intent-only tag until urgent availability data exists.
    } else if (explicitPriceRange) {
      if (typeof explicitPriceRange.minimumPrice === "number") {
        query = query.gte("average_price_min", explicitPriceRange.minimumPrice);
      }

      if (typeof explicitPriceRange.maximumPrice === "number") {
        query = query.lte("average_price_max", explicitPriceRange.maximumPrice);
      }
    } else if (priceRange) {
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

    let { data, error } = await query.order("rating", { ascending: false });

    if (error && isMissingOptionalProviderColumn(error)) {
      let fallbackQuery = createQuery(providerSelectQueryWithoutAvailability);

      if (categoryIds) {
        fallbackQuery = fallbackQuery.in("category_id", categoryIds);
      }

      if (districtIds) {
        fallbackQuery = fallbackQuery.in("district_id", districtIds);
      }

      if (budgetPriceRange) {
        if (typeof budgetPriceRange.minimumPrice === "number") {
          fallbackQuery = fallbackQuery.gte("average_price_max", budgetPriceRange.minimumPrice);
        }

        if (typeof budgetPriceRange.maximumPrice === "number") {
          fallbackQuery = fallbackQuery.lte("average_price_min", budgetPriceRange.maximumPrice);
        }
      } else if (budget === "acil-hizmet") {
        // Intent-only tag until urgent availability data exists.
      } else if (explicitPriceRange) {
        if (typeof explicitPriceRange.minimumPrice === "number") {
          fallbackQuery = fallbackQuery.gte("average_price_min", explicitPriceRange.minimumPrice);
        }

        if (typeof explicitPriceRange.maximumPrice === "number") {
          fallbackQuery = fallbackQuery.lte("average_price_max", explicitPriceRange.maximumPrice);
        }
      } else if (priceRange) {
        if (priceRange.minimumPrice === null) {
          fallbackQuery = fallbackQuery.is("average_price_min", null);
        } else {
          fallbackQuery = fallbackQuery.eq("average_price_min", priceRange.minimumPrice);
        }

        if (priceRange.maximumPrice === null) {
          fallbackQuery = fallbackQuery.is("average_price_max", null);
        } else {
          fallbackQuery = fallbackQuery.eq("average_price_max", priceRange.maximumPrice);
        }
      }

      if (minimumRating) {
        fallbackQuery = fallbackQuery.gte("rating", minimumRating);
      }

      const fallbackResult = await fallbackQuery.order("rating", { ascending: false });
      data = fallbackResult.data as typeof data;
      error = fallbackResult.error;
    }

    if (error) {
      return handleSupabaseListError(error);
    }

    const providers = ((data ?? []) as unknown as SupabaseProviderRecord[])
      .map((record, index) => mapSupabaseProvider(record, index))
      .filter(isProvider);

    return applyProviderFilters(providers, {
      availability: filters.availability,
      budget: filters.budget,
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

    let { data, error } = await supabase
      .from("providers")
      .select(providerSelectQuery)
      .eq("id", id)
      .eq("is_active", true)
      .eq("is_approved", true)
      .maybeSingle();

    if (error && isMissingOptionalProviderColumn(error)) {
      const fallbackResult = await supabase
        .from("providers")
        .select(providerSelectQueryWithoutAvailability)
        .eq("id", id)
        .eq("is_active", true)
        .eq("is_approved", true)
        .maybeSingle();

      data = fallbackResult.data as typeof data;
      error = fallbackResult.error;
    }

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
    const response = createServiceSuccess<ProviderReadResult>({
      providers: supabaseProviders,
      source: "supabase",
    });

    return response.data ?? {
      providers: supabaseProviders,
      source: "supabase",
    };
  }

  const fallbackResult: ProviderReadResult = {
    providers: applyProviderFilters(mockProviders, filters),
    source: "fallback",
  };
  const response = createServiceSuccess(fallbackResult);

  return response.data ?? fallbackResult;
}

export async function getProviderDirectory(
  filters: ProviderFilters = {},
): Promise<ProviderDirectory> {
  const safeFilters = normalizeProviderFilters(filters);
  const hasActiveFilters = hasAnyProviderFilterValue(safeFilters);
  let filteredProviderResult: ProviderReadResult;
  let allProviderResult: ProviderReadResult;

  if (hasActiveFilters) {
    [filteredProviderResult, allProviderResult] = await Promise.all([
      readProviders(safeFilters),
      readProviders(),
    ]);
  } else {
    allProviderResult = await readProviders();
    filteredProviderResult = allProviderResult;
  }

  const allProviders = allProviderResult.providers;
  const filterLookups =
    allProviderResult.source === "supabase" ? await fetchFilterLookupsFromSupabase() : null;
  const fallbackFilterOptions = buildFallbackFilterOptions();
  const providerFilterOptions = buildFilterOptions(allProviders);
  const filterOptions = filterLookups
    ? mergeLookupFilterOptions(allProviders, filterLookups)
    : allProviderResult.source === "supabase"
      ? {
          ...providerFilterOptions,
          availabilityOptions: providerFilterOptions.availabilityOptions.length
            ? providerFilterOptions.availabilityOptions
            : fallbackFilterOptions.availabilityOptions,
          categories: fallbackFilterOptions.categories,
          districts: fallbackFilterOptions.districts,
        }
      : fallbackFilterOptions;

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
  const providerResult = await readProviders(normalizeProviderFilters(filters));

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

export async function getMarketplaceTrustMetrics(
  fallbacks: MarketplaceTrustMetricFallbacks,
): Promise<MarketplaceTrustMetrics> {
  const fallbackMetrics: MarketplaceTrustMetrics = {
    ...fallbacks,
    completedRequests: 0,
    source: "fallback",
  };
  const supabase = createProvidersSupabaseClient();

  if (!supabase) {
    return fallbackMetrics;
  }

  try {
    const [
      activeProvidersResult,
      serviceCategoriesResult,
      districtsResult,
      completedRequestsResult,
    ] = await Promise.allSettled([
      supabase
        .from("providers")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .eq("is_approved", true),
      supabase
        .from("service_categories")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("districts")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("service_requests")
        .select("id", { count: "exact", head: true })
        .in("status", ["tamamlandi", "completed"]),
    ]);

    const readCount = <T extends { count: number | null; error: unknown }>(
      result: PromiseSettledResult<T>,
      fallback: number,
    ) =>
      result.status === "fulfilled" && !result.value.error
        ? result.value.count ?? fallback
        : fallback;

    return {
      activeProviders: readCount(activeProvidersResult, fallbacks.activeProviders),
      completedRequests: readCount(completedRequestsResult, 0),
      districts: readCount(districtsResult, fallbacks.districts),
      serviceCategories: readCount(serviceCategoriesResult, fallbacks.serviceCategories),
      source: "supabase",
    };
  } catch (error) {
    warnProviderReadError(error);
    return fallbackMetrics;
  }
}
