import { PROVIDER_AVAILABILITY_STATUSES } from "@/lib/constants/statuses";
import { normalizeServiceValue } from "@/lib/constants/services";
import { sanitizeText } from "@/lib/validations";
import { getProviders } from "@/services/providers";
import type { Provider, ProviderFilters } from "@/types/provider";
import {
  getBudgetTagLabel,
  isProviderPriceRangeRelevantToBudget,
  mapBudgetTagToPriceRange,
  normalizeBudgetTag,
  type BudgetPriceRange,
  type BudgetTag,
} from "./budget";

export type { BudgetPriceRange, BudgetTag };
export {
  getBudgetTagLabel,
  isProviderPriceRangeRelevantToBudget,
  mapBudgetTagToPriceRange,
  normalizeBudgetTag,
};

export type MatchInput = {
  budgetTag?: string;
  district?: string;
  notes?: string;
  service?: string;
};

export type MatchQuery = {
  budgetTag?: BudgetTag;
  district: string;
  filters: ProviderFilters;
  isComplete: boolean;
  notes: string;
  priceRange: BudgetPriceRange | null;
  service: string;
};

type RankedProvider = {
  categoryScore: number;
  districtScore: number;
  provider: Provider;
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

function getCategoryScore(provider: Provider, query: MatchQuery) {
  if (matchesCategory(provider.category, query.service)) {
    return 100;
  }

  return provider.servicesOffered.some((service) => matchesCategory(service, query.service))
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

  const providerRange = parseProviderPriceRange(provider.averagePrice);

  return isProviderPriceRangeRelevantToBudget(providerRange, query.priceRange) ? 12 : 0;
}

export function createMatchQuery(input: MatchInput = {}): MatchQuery {
  const service = sanitizeText(input.service ?? "", 120);
  const district = sanitizeText(input.district ?? "", 120);
  const budgetTag = normalizeBudgetTag(input.budgetTag);
  const notes = sanitizeText(input.notes ?? "", 500);
  const priceRange = mapBudgetTagToPriceRange(budgetTag);
  const filters: ProviderFilters = {
    category: service || undefined,
    budget: budgetTag,
  };

  return {
    budgetTag,
    district,
    filters,
    isComplete: Boolean(service && district && budgetTag),
    notes,
    priceRange,
    service,
  };
}

export function rankProviders(providers: Provider[], query: MatchQuery) {
  const rankedProviders: RankedProvider[] = providers
    .map((provider) => ({
      categoryScore: getCategoryScore(provider, query),
      districtScore: getDistrictScore(provider, query.district),
      provider,
    }))
    .filter(({ categoryScore, provider }) => {
      if (categoryScore <= 0) {
        return false;
      }

      if (query.budgetTag === "acil-hizmet") {
        return true;
      }

      const providerRange = parseProviderPriceRange(provider.averagePrice);
      return isProviderPriceRangeRelevantToBudget(providerRange, query.priceRange);
    });

  return rankedProviders
    .sort((firstProvider, secondProvider) => {
      const firstBudgetScore = getBudgetScore(firstProvider.provider, query);
      const secondBudgetScore = getBudgetScore(secondProvider.provider, query);

      return (
        secondProvider.categoryScore - firstProvider.categoryScore ||
        secondProvider.districtScore - firstProvider.districtScore ||
        secondBudgetScore - firstBudgetScore ||
        secondProvider.provider.rating - firstProvider.provider.rating ||
        secondProvider.provider.completedJobs - firstProvider.provider.completedJobs ||
        firstProvider.provider.name.localeCompare(secondProvider.provider.name, "tr")
      );
    })
    .map(({ provider }) => provider);
}

export async function getMatchedProviders(input: MatchInput, limit = 6) {
  const query = createMatchQuery(input);

  if (!query.isComplete) {
    return [];
  }

  const providers = await getProviders(query.filters);

  return rankProviders(providers, query).slice(0, limit);
}
