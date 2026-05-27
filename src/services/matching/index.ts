import { PROVIDER_AVAILABILITY_STATUSES } from "@/lib/constants/statuses";
import { instantMatchServiceOptions } from "@/lib/constants/instantMatch";
import { normalizeServiceValue, services } from "@/lib/constants/services";
import { sanitizeText } from "@/lib/validations";
import { savePaymentPreference } from "@/services/payments";
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
  confirmationCode: string;
  offerAmount?: string;
  paymentPreference?: string;
};

export type EmergencyMatchRequest = {
  approximateLocation: string | null;
  budgetTag: "acil-hizmet";
  confirmationCode: string;
  estimatedArrivalText: string | null;
  offerAmount: string | null;
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
    confirmationCode: input.confirmationCode,
    estimatedArrivalText: calculateEstimatedArrivalText({ urgencyType }),
    offerAmount: sanitizeText(input.offerAmount ?? "", 80) || null,
    paymentPreference: savePaymentPreference(input.paymentPreference),
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
