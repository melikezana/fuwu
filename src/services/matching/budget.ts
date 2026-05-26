import {
  providerBudgetOptions,
  type ProviderBudgetValue,
} from "@/lib/constants/providers";
import { normalizeServiceValue } from "@/lib/constants/services";

export type BudgetTag = ProviderBudgetValue;

export type BudgetPriceRange = {
  minimumPrice: number | null;
  maximumPrice: number | null;
};

export function normalizeBudgetTag(value: string | undefined): BudgetTag | undefined {
  const normalizedValue = normalizeServiceValue(value ?? "");

  if (!normalizedValue) {
    return undefined;
  }

  if (normalizedValue === "acil") {
    return "acil-hizmet";
  }

  const matchingOption = providerBudgetOptions.find(
    (option) =>
      normalizeServiceValue(option.value) === normalizedValue ||
      normalizeServiceValue(option.label) === normalizedValue,
  );

  return matchingOption?.value;
}

export function getBudgetTagLabel(value: string | undefined) {
  const budgetTag = normalizeBudgetTag(value);

  return providerBudgetOptions.find((option) => option.value === budgetTag)?.label ?? "";
}

export function mapBudgetTagToPriceRange(
  budgetTag: string | undefined,
): BudgetPriceRange | null {
  const normalizedBudgetTag = normalizeBudgetTag(budgetTag);

  if (!normalizedBudgetTag || normalizedBudgetTag === "acil-hizmet") {
    return null;
  }

  if (normalizedBudgetTag === "ekonomik") {
    return {
      minimumPrice: null,
      maximumPrice: 1000,
    };
  }

  if (normalizedBudgetTag === "standart") {
    return {
      minimumPrice: 1000,
      maximumPrice: 2500,
    };
  }

  return {
    minimumPrice: 2500,
    maximumPrice: null,
  };
}

export function isProviderPriceRangeRelevantToBudget(
  providerRange: BudgetPriceRange | null,
  budgetRange: BudgetPriceRange | null,
) {
  if (!budgetRange) {
    return true;
  }

  if (!providerRange) {
    return false;
  }

  const providerMinimum = providerRange.minimumPrice ?? providerRange.maximumPrice;
  const providerMaximum = providerRange.maximumPrice ?? providerRange.minimumPrice;

  if (typeof budgetRange.minimumPrice === "number") {
    if (typeof providerMaximum !== "number" || providerMaximum < budgetRange.minimumPrice) {
      return false;
    }
  }

  if (typeof budgetRange.maximumPrice === "number") {
    if (typeof providerMinimum !== "number" || providerMinimum > budgetRange.maximumPrice) {
      return false;
    }
  }

  return true;
}
