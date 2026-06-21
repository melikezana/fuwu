import type { SupabaseClient } from "@supabase/supabase-js";
import { PROVIDER_AVAILABILITY_STATUSES } from "@/lib/constants/statuses";
import { instantMatchServiceOptions } from "@/lib/constants/instantMatch";
import { normalizeServiceValue, services } from "@/lib/constants/services";
import { sanitizeText } from "@/lib/validations";
import { logInfo, logWarn } from "@/lib/logger";
import type { Database } from "@/lib/supabase/types";
import { isUuid } from "@/lib/utils";
import { notifyNewServiceRequestMatch } from "@/services/notifications";
import { saveEmergencyPaymentPreference } from "@/services/payments";
import { getProviders } from "@/services/providers";
import { calculateEstimatedArrivalText } from "@/services/tracking";
import type { Provider, ProviderFilters } from "@/types/provider";
import type {
  ServiceRequestPaymentPreference,
  ServiceRequestUrgencyType,
} from "@/types/request";
import {
  getBudgetTagLabel,
  isProviderPriceRangeRelevantToBudget,
  mapBudgetTagToPriceRange,
  normalizeBudgetTag,
  type BudgetPriceRange,
  type BudgetTag,
} from "./budget";
import {
  getTimePreferenceLabel,
  mapTimePreferenceToRequestIntent,
  normalizeTimePreference,
  type InstantMatchTimeValue,
  type TimePreferenceRequestIntent,
} from "./time";

export type { BudgetPriceRange, BudgetTag };
export type { InstantMatchTimeValue, TimePreferenceRequestIntent };
export {
  getBudgetTagLabel,
  getTimePreferenceLabel,
  isProviderPriceRangeRelevantToBudget,
  mapBudgetTagToPriceRange,
  mapTimePreferenceToRequestIntent,
  normalizeBudgetTag,
  normalizeTimePreference,
};

export type MatchInput = {
  budgetTag?: string;
  district?: string;
  notes?: string;
  service?: string;
  timePreference?: string;
};

export type InstantMatchInput = MatchInput;

export type EmergencyMatchRequestInput = InstantMatchInput & {
  approximateLocation?: string;
  confirmationCode?: string | null;
  offerAmount?: number | string;
  paymentPreference?: string;
};

export type EmergencyMatchRequest = {
  approximateLocation: string | null;
  budgetTag: "acil-hizmet";
  confirmationCode: string | null;
  estimatedArrivalText: string | null;
  offeredPrice: number | null;
  paymentPreference: ServiceRequestPaymentPreference | null;
  query: InstantMatchQuery;
  urgencyType: Extract<ServiceRequestUrgencyType, "emergency">;
};

export type MatchQuery = {
  budgetTag?: BudgetTag;
  category: string;
  district: string;
  filters: ProviderFilters;
  isComplete: boolean;
  notes: string;
  priceRange: BudgetPriceRange | null;
  service: string;
  serviceLabel: string;
  timeIntent: TimePreferenceRequestIntent;
  timePreference?: InstantMatchTimeValue;
};

export type InstantMatchQuery = MatchQuery;

export type MatchedProviderScore = {
  budgetScore: number;
  categoryScore: number;
  districtScore: number;
  provider: Provider;
};

export type InstantMatchedProvidersResult = {
  exactMatchCount: number;
  fallbackReason: "budget" | "district" | "none" | null;
  isExactMatch: boolean;
  isFallback: boolean;
  providers: Provider[];
  query: InstantMatchQuery;
};

function parseLocalizedNumber(value: string) {
  const parsedValue = Number(value.replace(/\./g, "").replace(",", "."));

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function normalizePriceValue(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const trimmedValue = value?.trim() ?? "";

  if (!trimmedValue) {
    return null;
  }

  const parsedValue = parseLocalizedNumber(trimmedValue.replace(/[^\d.,-]/g, ""));

  return typeof parsedValue === "number" ? parsedValue : null;
}

export function parseEmergencyPriceValue(value: number | string | null | undefined) {
  return normalizePriceValue(value);
}

function roundToNearestTen(value: number) {
  return Math.max(100, Math.round(value / 10) * 10);
}

export type EmergencyPriceOption = {
  label: string;
  value: number;
};

export type EmergencyPriceRange = {
  maximumPrice: number;
  minimumPrice: number;
  options: EmergencyPriceOption[];
  suggestedPrice: number;
};

export type EmergencyPriceValidationResult = {
  message: string | null;
  ok: boolean;
  price: number | null;
  range: EmergencyPriceRange;
};

const defaultEmergencyPriceRange: EmergencyPriceRange = {
  maximumPrice: 3500,
  minimumPrice: 500,
  options: [
    { label: "500 TL", value: 500 },
    { label: "1.000 TL", value: 1000 },
    { label: "2.500 TL", value: 2500 },
    { label: "3.500 TL+", value: 3500 },
  ],
  suggestedPrice: 1000,
};

const emergencyPriceRanges: Array<{
  keywords: string[];
  range: EmergencyPriceRange;
}> = [
  {
    keywords: ["temizlik"],
    range: {
      maximumPrice: 1500,
      minimumPrice: 300,
      options: [
        { label: "300 TL", value: 300 },
        { label: "600 TL", value: 600 },
        { label: "1.000 TL", value: 1000 },
        { label: "1.500 TL+", value: 1500 },
      ],
      suggestedPrice: 600,
    },
  },
  {
    keywords: ["tesisat", "su", "gider", "faucet", "pipe"],
    range: {
      maximumPrice: 3500,
      minimumPrice: 500,
      options: [
        { label: "500 TL", value: 500 },
        { label: "1.000 TL", value: 1000 },
        { label: "2.500 TL", value: 2500 },
        { label: "3.500 TL+", value: 3500 },
      ],
      suggestedPrice: 1000,
    },
  },
  {
    keywords: ["elektrik", "sigorta", "priz"],
    range: {
      maximumPrice: 2500,
      minimumPrice: 400,
      options: [
        { label: "400 TL", value: 400 },
        { label: "800 TL", value: 800 },
        { label: "1.500 TL", value: 1500 },
        { label: "2.500 TL+", value: 2500 },
      ],
      suggestedPrice: 800,
    },
  },
  {
    keywords: ["havuz"],
    range: {
      maximumPrice: 15000,
      minimumPrice: 2000,
      options: [
        { label: "2.000 TL", value: 2000 },
        { label: "5.000 TL", value: 5000 },
        { label: "10.000 TL", value: 10000 },
        { label: "15.000 TL+", value: 15000 },
      ],
      suggestedPrice: 5000,
    },
  },
  {
    keywords: ["bahce", "peyzaj", "dis mekan"],
    range: {
      maximumPrice: 10000,
      minimumPrice: 1000,
      options: [
        { label: "1.000 TL", value: 1000 },
        { label: "2.500 TL", value: 2500 },
        { label: "5.000 TL", value: 5000 },
        { label: "10.000 TL+", value: 10000 },
      ],
      suggestedPrice: 2500,
    },
  },
  {
    keywords: ["klima", "beyaz esya", "servis"],
    range: {
      maximumPrice: 4500,
      minimumPrice: 600,
      options: [
        { label: "600 TL", value: 600 },
        { label: "1.250 TL", value: 1250 },
        { label: "2.500 TL", value: 2500 },
        { label: "4.500 TL+", value: 4500 },
      ],
      suggestedPrice: 1250,
    },
  },
  {
    keywords: ["montaj", "mobilya", "cilingir", "kilit", "hali", "boya", "nakliye", "tasima"],
    range: defaultEmergencyPriceRange,
  },
];

export function getEmergencyPriceRange(service?: string | null): EmergencyPriceRange {
  const normalizedService = normalizeServiceValue(service ?? "");

  if (!normalizedService) {
    return defaultEmergencyPriceRange;
  }

  return (
    emergencyPriceRanges.find((item) =>
      item.keywords.some((keyword) => normalizedService.includes(keyword)),
    )?.range ?? defaultEmergencyPriceRange
  );
}

export function getEmergencyPriceOptions(service?: string | null) {
  return getEmergencyPriceRange(service).options;
}

function formatEmergencyPriceBoundary(value: number) {
  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(value)} TL`;
}

export function validateEmergencyPrice(
  value: number | string | null | undefined,
  service?: string | null,
): EmergencyPriceValidationResult {
  const normalizedPrice = normalizePriceValue(value);
  const range = getEmergencyPriceRange(service);

  if (typeof normalizedPrice !== "number") {
    return {
      message: "Teklif tutarı gir veya öneri seç.",
      ok: false,
      price: null,
      range,
    };
  }

  if (normalizedPrice < range.minimumPrice || normalizedPrice > range.maximumPrice) {
    return {
      message: `Teklif ${formatEmergencyPriceBoundary(range.minimumPrice)} - ${formatEmergencyPriceBoundary(range.maximumPrice)} aralığında olmalı.`,
      ok: false,
      price: null,
      range,
    };
  }

  return {
    message: null,
    ok: true,
    price: roundToNearestTen(normalizedPrice),
    range,
  };
}

export function clampEmergencyPrice(
  value: number | string | null | undefined,
  service?: string | null,
) {
  const normalizedPrice = normalizePriceValue(value);
  const range = getEmergencyPriceRange(service);

  if (typeof normalizedPrice !== "number") {
    return null;
  }

  return Math.min(range.maximumPrice, Math.max(range.minimumPrice, roundToNearestTen(normalizedPrice)));
}

export function calculateSuggestedPrice({
  district,
  service,
}: Pick<MatchInput, "budgetTag" | "district" | "service"> = {}) {
  const normalizedService = normalizeServiceValue(service ?? "");

  if (!normalizedService) {
    return 0;
  }

  const range = getEmergencyPriceRange(service);
  const districtSignal = normalizeServiceValue(district ?? "");
  const districtAdjustment = districtSignal ? Math.min(250, Math.round(range.suggestedPrice * 0.05)) : 0;

  return Math.min(range.maximumPrice, roundToNearestTen(range.suggestedPrice + districtAdjustment));
}

export function adjustOfferedPrice(
  currentPrice: number | string | null | undefined,
  delta: -10 | 10 | 50 | number,
) {
  const normalizedPrice = normalizePriceValue(currentPrice) ?? 0;

  return roundToNearestTen(normalizedPrice + delta);
}

function parseProviderPriceRange(value: string | undefined): BudgetPriceRange | null {
  const selectedPrice = value?.trim() ?? "";

  if (!selectedPrice) {
    return null;
  }

  const normalizedValue = normalizeServiceValue(selectedPrice);
  const priceValues =
    selectedPrice
      .match(/\d[\d.,]*/g)
      ?.map(parseLocalizedNumber)
      .filter((price): price is number => typeof price === "number") ?? [];

  if (priceValues.length >= 2) {
    return {
      minimumPrice: Math.min(priceValues[0], priceValues[1]),
      maximumPrice: Math.max(priceValues[0], priceValues[1]),
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

function getProviderPriceRange(provider: Provider): BudgetPriceRange | null {
  const hasMinimumPrice =
    typeof provider.averagePriceMin === "number" && Number.isFinite(provider.averagePriceMin);
  const hasMaximumPrice =
    typeof provider.averagePriceMax === "number" && Number.isFinite(provider.averagePriceMax);

  if (hasMinimumPrice || hasMaximumPrice) {
    return {
      minimumPrice: hasMinimumPrice ? provider.averagePriceMin ?? null : null,
      maximumPrice: hasMaximumPrice ? provider.averagePriceMax ?? null : null,
    };
  }

  return parseProviderPriceRange(provider.averagePrice);
}

function matchesCategory(providerCategory: string, service: string) {
  const normalizedProviderCategory = normalizeServiceValue(providerCategory);
  const normalizedService = normalizeServiceValue(service);

  if (!normalizedService) {
    return false;
  }

  return (
    normalizedProviderCategory === normalizedService ||
    normalizedProviderCategory.includes(normalizedService) ||
    normalizedService.includes(normalizedProviderCategory)
  );
}

function resolveInstantMatchService(value: string) {
  const selectedService = sanitizeText(value, 120);
  const normalizedService = normalizeServiceValue(selectedService);

  if (!normalizedService) {
    return {
      category: "",
      label: "",
    };
  }

  const matchingInstantOption = instantMatchServiceOptions.find(
    (option) =>
      normalizeServiceValue(option.value) === normalizedService ||
      normalizeServiceValue(option.label) === normalizedService ||
      normalizeServiceValue(option.matchCategory) === normalizedService,
  );
  const matchingService = services.find((service) => {
    const normalizedTitle = normalizeServiceValue(service.title);
    const normalizedHref = normalizeServiceValue(service.href);

    return (
      normalizedTitle === normalizedService ||
      normalizedTitle.includes(normalizedService) ||
      normalizedService.includes(normalizedTitle) ||
      normalizedHref.includes(normalizedService)
    );
  });

  return {
    category: matchingInstantOption?.matchCategory ?? matchingService?.title ?? selectedService,
    label: matchingInstantOption?.label ?? matchingService?.title ?? selectedService,
  };
}

function getCategoryScore(provider: Provider, query: MatchQuery) {
  if (matchesCategory(provider.category, query.category)) {
    return 100;
  }

  return provider.servicesOffered.some((service) => matchesCategory(service, query.category))
    ? 80
    : 0;
}

function getDistrictScore(provider: Provider, district: string) {
  const normalizedDistrict = normalizeServiceValue(district);

  if (!normalizedDistrict) {
    return 0;
  }

  if (normalizeServiceValue(provider.district) === normalizedDistrict) {
    return 40;
  }

  return provider.serviceAreas.some((serviceArea) => normalizeServiceValue(serviceArea) === normalizedDistrict)
    ? 30
    : 0;
}

function getBudgetScore(provider: Provider, query: MatchQuery) {
  if (query.budgetTag === "acil-hizmet") {
    return provider.availability === PROVIDER_AVAILABILITY_STATUSES.musait ? 12 : 4;
  }

  const providerRange = getProviderPriceRange(provider);

  return isProviderPriceRangeRelevantToBudget(providerRange, query.priceRange) ? 12 : 0;
}

function scoreProvider(provider: Provider, query: MatchQuery): MatchedProviderScore {
  return {
    budgetScore: getBudgetScore(provider, query),
    categoryScore: getCategoryScore(provider, query),
    districtScore: getDistrictScore(provider, query.district),
    provider,
  };
}

function isExactBudgetMatch(score: MatchedProviderScore, query: MatchQuery) {
  if (query.budgetTag === "acil-hizmet") {
    return score.budgetScore > 0;
  }

  return score.budgetScore > 0;
}

function isExactMatch(score: MatchedProviderScore, query: MatchQuery) {
  return (
    score.categoryScore > 0 &&
    score.districtScore > 0 &&
    isExactBudgetMatch(score, query)
  );
}

export function createInstantMatchQuery(input: InstantMatchInput = {}): InstantMatchQuery {
  const resolvedService = resolveInstantMatchService(input.service ?? "");
  const district = sanitizeText(input.district ?? "", 120);
  const budgetTag = normalizeBudgetTag(input.budgetTag);
  const timePreference = normalizeTimePreference(input.timePreference);
  const timeIntent = mapTimePreferenceToRequestIntent(timePreference);
  const priceRange = mapBudgetTagToPriceRange(budgetTag);
  const filters: ProviderFilters = {
    category: resolvedService.category || undefined,
    district: district || undefined,
    budget: budgetTag,
  };
  const notes = sanitizeText(input.notes ?? "", 500);

  return {
    budgetTag,
    category: resolvedService.category,
    district,
    filters,
    isComplete: Boolean(resolvedService.category && district && budgetTag && timePreference),
    notes,
    priceRange,
    service: resolvedService.category,
    serviceLabel: resolvedService.label,
    timeIntent,
    timePreference,
  };
}

export const createMatchQuery = createInstantMatchQuery;

export function isEmergencyBudgetTag(value: string | undefined) {
  return normalizeBudgetTag(value) === "acil-hizmet";
}

export function createEmergencyMatchRequest(
  input: EmergencyMatchRequestInput,
): EmergencyMatchRequest {
  const query = createInstantMatchQuery({
    ...input,
    budgetTag: "acil-hizmet",
    timePreference: input.timePreference || "bugun",
  });
  const urgencyType = "emergency";

  return {
    approximateLocation: sanitizeText(input.approximateLocation ?? "", 220) || null,
    budgetTag: "acil-hizmet",
    confirmationCode: input.confirmationCode ?? null,
    estimatedArrivalText: calculateEstimatedArrivalText({ urgencyType }),
    offeredPrice: (clampEmergencyPrice(input.offerAmount, input.service) ??
      calculateSuggestedPrice({
        budgetTag: "acil-hizmet",
        district: input.district,
        service: input.service,
      })) || null,
    paymentPreference: saveEmergencyPaymentPreference(input.paymentPreference),
    query,
    urgencyType,
  };
}

export function rankMatchedProviders(providers: Provider[], query: MatchQuery) {
  return providers
    .map((provider) => scoreProvider(provider, query))
    .filter(({ categoryScore }) => categoryScore > 0)
    .sort((firstProvider, secondProvider) =>
      secondProvider.categoryScore - firstProvider.categoryScore ||
      secondProvider.districtScore - firstProvider.districtScore ||
      secondProvider.budgetScore - firstProvider.budgetScore ||
      secondProvider.provider.rating - firstProvider.provider.rating ||
      secondProvider.provider.completedJobs - firstProvider.provider.completedJobs ||
      firstProvider.provider.name.localeCompare(secondProvider.provider.name, "tr"),
    )
    .map(({ provider }) => provider);
}

export const rankProviders = rankMatchedProviders;

function countExactMatches(providers: Provider[], query: InstantMatchQuery) {
  return providers
    .map((provider) => scoreProvider(provider, query))
    .filter((score) => isExactMatch(score, query)).length;
}

function createInstantMatchResult(
  query: InstantMatchQuery,
  providers: Provider[],
  exactMatchCount: number,
  fallbackReason: InstantMatchedProvidersResult["fallbackReason"],
): InstantMatchedProvidersResult {
  const isExact = exactMatchCount > 0;

  return {
    exactMatchCount,
    fallbackReason,
    isExactMatch: isExact,
    isFallback: !isExact && providers.length > 0,
    providers,
    query,
  };
}

export async function getInstantMatchedProviders(
  input: InstantMatchInput,
  limit = 6,
): Promise<InstantMatchedProvidersResult> {
  const query = createInstantMatchQuery(input);

  if (!query.isComplete) {
    return createInstantMatchResult(query, [], 0, null);
  }

  const exactDistrictProviders = await getProviders({
    category: query.category,
    district: query.district,
  });
  const rankedExactDistrictProviders = rankMatchedProviders(exactDistrictProviders, query);
  const exactMatchCount = countExactMatches(rankedExactDistrictProviders, query);

  if (rankedExactDistrictProviders.length > 0) {
    return createInstantMatchResult(
      query,
      rankedExactDistrictProviders.slice(0, limit),
      exactMatchCount,
      exactMatchCount > 0 ? null : "budget",
    );
  }

  const sameCategoryProviders = await getProviders({ category: query.category });
  const rankedSameCategoryProviders = rankMatchedProviders(sameCategoryProviders, query);

  return createInstantMatchResult(
    query,
    rankedSameCategoryProviders.slice(0, limit),
    0,
    rankedSameCategoryProviders.length > 0 ? "district" : "none",
  );
}

export async function getMatchedProviders(input: MatchInput, limit = 6) {
  const result = await getInstantMatchedProviders(input, limit);

  return result.providers;
}

export async function getNearbyEligibleProviders(input: MatchInput, limit = 12) {
  const query = createInstantMatchQuery({
    ...input,
    budgetTag: input.budgetTag || "acil-hizmet",
    timePreference: input.timePreference || "bugun",
  });

  if (!query.category) {
    return [];
  }

  const districtProviders = query.district
    ? await getProviders({
        category: query.category,
        district: query.district,
      })
    : [];
  const sameCategoryProviders = await getProviders({ category: query.category });
  const providersById = new Map(
    [...districtProviders, ...sameCategoryProviders].map((provider) => [provider.id, provider]),
  );

  return rankMatchedProviders(Array.from(providersById.values()), query).slice(0, limit);
}

type EligibleProviderNotificationRecord = Pick<
  Database["public"]["Tables"]["providers"]["Row"],
  | "district_id"
  | "id"
  | "identity_verified"
  | "is_verified"
  | "phone_verified"
  | "profile_completion_score"
  | "rating"
  | "user_id"
>;

const MAX_PROVIDER_MATCH_NOTIFICATIONS = 50;

export type MatchAndNotifyEligibleProvidersInput = {
  categoryId: string;
  districtId: string;
  requestId: string;
  urgencyType: ServiceRequestUrgencyType;
};

/**
 * Finds the real, persisted provider audience for a request and creates one
 * dashboard notification per successfully reached provider account.
 *
 * The current schema stores one service district on providers.district_id.
 * If multi-district service areas are added later, this query should be
 * extended to include that persisted relation instead of falling back to
 * providers in unrelated districts.
 */
export async function matchAndNotifyEligibleProviders(
  supabase: SupabaseClient<Database>,
  {
    categoryId,
    districtId,
    requestId,
    urgencyType,
  }: MatchAndNotifyEligibleProvidersInput,
) {
  const startedAt = Date.now();
  const normalizedCategoryId = categoryId.trim();
  const normalizedDistrictId = districtId.trim();
  const normalizedRequestId = requestId.trim();

  if (
    !isUuid(normalizedCategoryId) ||
    !isUuid(normalizedDistrictId) ||
    !isUuid(normalizedRequestId) ||
    (urgencyType !== "standard" && urgencyType !== "emergency")
  ) {
    logWarn("Provider match notification input validation failed.", {
      durationMs: Date.now() - startedAt,
      requestId: normalizedRequestId,
    });
    return 0;
  }

  const [
    {
      data: { user },
      error: authError,
    },
    { data, error },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("providers")
      .select(
        "id, user_id, district_id, is_verified, identity_verified, phone_verified, profile_completion_score, rating",
      )
      .eq("category_id", normalizedCategoryId)
      .eq("district_id", normalizedDistrictId)
      .eq("is_active", true)
      .eq("is_approved", true)
      .not("user_id", "is", null)
      .order("is_verified", { ascending: false })
      .order("identity_verified", { ascending: false })
      .order("phone_verified", { ascending: false })
      .order("profile_completion_score", {
        ascending: false,
        nullsFirst: false,
      })
      .order("rating", { ascending: false })
      .order("id", { ascending: true })
      .limit(MAX_PROVIDER_MATCH_NOTIFICATIONS),
  ]);

  if (authError || !user) {
    logWarn("Provider match notification actor lookup failed.", {
      durationMs: Date.now() - startedAt,
      requestId: normalizedRequestId,
    });
    return 0;
  }

  if (error) {
    logWarn("Eligible provider match query failed.", {
      categoryId: normalizedCategoryId,
      districtId: normalizedDistrictId,
      durationMs: Date.now() - startedAt,
      requestId: normalizedRequestId,
      supabaseError: {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message,
      },
    });
    return 0;
  }

  const providers = ((data ?? []) as EligibleProviderNotificationRecord[]).filter(
    (provider): provider is EligibleProviderNotificationRecord & { user_id: string } =>
      Boolean(provider.user_id),
  );
  const insertedNotificationCount = await notifyNewServiceRequestMatch({
    actorUserId: user.id,
    categoryId: normalizedCategoryId,
    districtId: normalizedDistrictId,
    providers: providers.map((provider) => ({
      providerId: provider.id,
      providerUserId: provider.user_id,
    })),
    requestId: normalizedRequestId,
    supabaseClient: supabase,
    urgencyType,
  });

  logInfo("Provider matching and notification fan-out completed.", {
    durationMs: Date.now() - startedAt,
    eligibleProviderCount: providers.length,
    insertedNotificationCount,
    providerLimit: MAX_PROVIDER_MATCH_NOTIFICATIONS,
    requestId: normalizedRequestId,
  });

  return insertedNotificationCount;
}
