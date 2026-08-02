import {
  getServiceCategorySearchValues,
  getServiceDisplayLabel,
  normalizeServiceValue,
} from "@/lib/constants/services";

export const defaultProviderSort = "recommended";

export const providerSortOptions = [
  {
    label: "Önerilen sıralama",
    mobileLabel: "Önerilen",
    value: defaultProviderSort,
  },
  {
    label: "En yüksek puan",
    mobileLabel: "En yüksek puan",
    value: "rating_desc",
  },
  {
    label: "En çok değerlendirilen",
    mobileLabel: "En çok değerlendirilen",
    value: "reviews_desc",
  },
  {
    label: "En hızlı yanıt veren",
    mobileLabel: "En hızlı yanıt",
    value: "response_time_asc",
  },
  {
    label: "Fiyat: düşükten yükseğe",
    mobileLabel: "Fiyat: düşükten yükseğe",
    value: "price_asc",
  },
  {
    label: "Fiyat: yüksekten düşüğe",
    mobileLabel: "Fiyat: yüksekten düşüğe",
    value: "price_desc",
  },
  {
    label: "En yeni profiller",
    mobileLabel: "En yeni",
    value: "newest",
  },
] as const;

export type ProviderSortValue = (typeof providerSortOptions)[number]["value"];
export type ProviderSortOption = (typeof providerSortOptions)[number];

export const minimumRatingFilterOptions = [
  { chipLabel: "4,5+ Puan", label: "4,5 ve üzeri", value: "4.5" },
  { chipLabel: "4,0+ Puan", label: "4,0 ve üzeri", value: "4.0" },
  { chipLabel: "3,5+ Puan", label: "3,5 ve üzeri", value: "3.5" },
] as const;

export const responseTimeFilterOptions = [
  { chipLabel: "15 dk içinde", label: "15 dakika içinde", maximumMinutes: 15, value: "15" },
  { chipLabel: "1 saat içinde", label: "1 saat içinde", maximumMinutes: 60, value: "60" },
  {
    chipLabel: "Aynı gün yanıt",
    label: "Aynı gün yanıt verenler",
    maximumMinutes: 1440,
    value: "same-day",
  },
] as const;

export const availabilityFilterOptions = [
  { chipLabel: "Şu anda müsait", label: "Şu anda müsait", value: "müsait" },
] as const;

export const priceInfoFilterOptions = [
  {
    chipLabel: "Başlangıç fiyatı var",
    label: "Başlangıç fiyatı bulunanlar",
    value: "has-starting-price",
  },
  {
    chipLabel: "Fiyat bilgisi var",
    label: "Fiyat bilgisi bulunanlar",
    value: "has-price",
  },
] as const;

export type ProviderFilterCapabilities = {
  hasAvailability: boolean;
  hasCreatedAt: boolean;
  hasDistance: false;
  hasPortfolio: boolean;
  hasPrice: boolean;
  hasProfileImage: boolean;
  hasRating: boolean;
  hasResponseTime: boolean;
  hasReviews: boolean;
  hasVerification: boolean;
  sortOptions: ProviderSortOption[];
};

export type ProviderFilterState = {
  availability?: string;
  category?: string;
  district?: string;
  hasPortfolio?: string;
  hasPrice?: string;
  hasProfileImage?: string;
  hasReviews?: string;
  maximumPrice?: string;
  minimumPrice?: string;
  price?: string;
  query?: string;
  rating?: string;
  responseTime?: string;
  sort?: string;
  verified?: string;
};

type ProviderFilterable = {
  availability?: string;
  averagePrice?: string;
  averagePriceMax?: number | null;
  averagePriceMin?: number | null;
  category: string;
  createdAt?: string | null;
  district: string;
  galleryPreviewUrl?: string;
  identityVerified?: boolean;
  isVerified?: boolean;
  lastActiveAt?: string | null;
  name?: string;
  phoneVerified?: boolean;
  profileCompletionScore?: number;
  profileImageUrl?: string;
  rating: number;
  responseTime?: string;
  responseTimeMinutes?: number | null;
  reviewCount: number;
  serviceAreas: string[];
  servicesOffered?: string[];
  shortDescription?: string;
  description?: string;
};

function isFinitePositiveNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function hasPrice(provider: ProviderFilterable) {
  return isFinitePositiveNumber(provider.averagePriceMin) || isFinitePositiveNumber(provider.averagePriceMax);
}

function getProviderPriceValue(provider: ProviderFilterable) {
  if (isFinitePositiveNumber(provider.averagePriceMin)) {
    return provider.averagePriceMin as number;
  }

  if (isFinitePositiveNumber(provider.averagePriceMax)) {
    return provider.averagePriceMax as number;
  }

  return null;
}

function parseFilterNumber(value: string | undefined) {
  const normalizedValue = value?.replace(/\./g, "").replace(",", ".").trim() ?? "";
  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function parseFilterBoolean(value: string | undefined) {
  const normalizedValue = normalizeServiceValue(value ?? "");

  return ["1", "true", "evet", "yes"].includes(normalizedValue);
}

function normalizeSortValue(value: string | undefined): ProviderSortValue {
  return (
    providerSortOptions.find((option) => option.value === value)?.value ?? defaultProviderSort
  );
}

function compareNumbersDescending(firstValue: number, secondValue: number) {
  return secondValue - firstValue;
}

function compareOptionalNumbers(
  firstValue: number | null,
  secondValue: number | null,
  direction: "asc" | "desc",
) {
  if (firstValue === null && secondValue === null) {
    return 0;
  }

  if (firstValue === null) {
    return 1;
  }

  if (secondValue === null) {
    return -1;
  }

  return direction === "asc" ? firstValue - secondValue : secondValue - firstValue;
}

function getTimeValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsedValue = Date.parse(value);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function getRecencyScore(provider: ProviderFilterable) {
  const timeValue = getTimeValue(provider.lastActiveAt ?? provider.createdAt);

  if (timeValue === null) {
    return 0;
  }

  const ageInDays = Math.max(0, (Date.now() - timeValue) / 86_400_000);

  return Math.max(0, 1 - Math.min(ageInDays, 90) / 90);
}

function getResponseSpeedScore(provider: ProviderFilterable) {
  if (!isFinitePositiveNumber(provider.responseTimeMinutes)) {
    return 0;
  }

  return Math.max(0, 1 - Math.min(provider.responseTimeMinutes as number, 1440) / 1440);
}

function getLocationMatchScore(provider: ProviderFilterable, district: string | undefined) {
  if (!district?.trim()) {
    return 0;
  }

  return matchesDistrictFilter(provider, district) ? 1 : 0;
}

function getNormalizedReviewScore(provider: ProviderFilterable, maxReviewCount: number) {
  if (!maxReviewCount || provider.reviewCount <= 0) {
    return 0;
  }

  return Math.log10(provider.reviewCount + 1) / Math.log10(maxReviewCount + 1);
}

function getRecommendedScore(
  provider: ProviderFilterable,
  context: { maxReviewCount: number; selectedDistrict?: string },
) {
  let score = 0;

  if (provider.isVerified) {
    score += 18;
  }

  if (provider.identityVerified) {
    score += 6;
  }

  if (provider.phoneVerified) {
    score += 4;
  }

  if (Number.isFinite(provider.rating) && provider.rating > 0) {
    score += (provider.rating / 5) * 24;
  }

  score += getNormalizedReviewScore(provider, context.maxReviewCount) * 12;

  if (Number.isFinite(provider.profileCompletionScore)) {
    score += Math.max(0, Math.min(provider.profileCompletionScore ?? 0, 100)) * 0.1;
  }

  if (normalizeServiceValue(provider.availability ?? "") === normalizeServiceValue("müsait")) {
    score += 7;
  }

  score += getResponseSpeedScore(provider) * 8;
  score += getLocationMatchScore(provider, context.selectedDistrict) * 10;
  score += getRecencyScore(provider) * 6;

  return score;
}

function matchesTextValue(providerValue: string, requestedValue: string) {
  const normalizedProviderValue = normalizeServiceValue(providerValue);
  const normalizedRequestedValue = normalizeServiceValue(requestedValue);

  return (
    normalizedProviderValue === normalizedRequestedValue ||
    normalizedProviderValue.includes(normalizedRequestedValue) ||
    normalizedRequestedValue.includes(normalizedProviderValue)
  );
}

function matchesCategoryFilter(provider: ProviderFilterable, requestedCategory: string | undefined) {
  if (!hasText(requestedCategory)) {
    return true;
  }

  const providerValues = getServiceCategorySearchValues(provider.category);
  const requestedValues = getServiceCategorySearchValues(requestedCategory);

  return providerValues.some((providerValue) =>
    requestedValues.some((requestedValue) => matchesTextValue(providerValue, requestedValue)),
  );
}

function matchesDistrictFilter(provider: ProviderFilterable, requestedDistrict: string | undefined) {
  if (!hasText(requestedDistrict)) {
    return true;
  }

  return [provider.district, ...provider.serviceAreas].some((district) =>
    matchesTextValue(district, requestedDistrict ?? ""),
  );
}

function matchesSearchQuery(provider: ProviderFilterable, query: string | undefined) {
  if (!hasText(query)) {
    return true;
  }

  const terms = normalizeServiceValue(query ?? "")
    .split(" ")
    .filter(Boolean);
  const searchableText = normalizeServiceValue(
    [
      provider.name,
      provider.category,
      provider.district,
      provider.description,
      provider.shortDescription,
      provider.averagePrice,
      provider.responseTime,
      ...(provider.serviceAreas ?? []),
      ...(provider.servicesOffered ?? []),
    ].join(" "),
  );

  return terms.every((term) => searchableText.includes(term));
}

function matchesResponseTime(provider: ProviderFilterable, responseTime: string | undefined) {
  if (!hasText(responseTime)) {
    return true;
  }

  const option = responseTimeFilterOptions.find((item) => item.value === responseTime);

  if (!option || !isFinitePositiveNumber(provider.responseTimeMinutes)) {
    return false;
  }

  return (provider.responseTimeMinutes as number) <= option.maximumMinutes;
}

function matchesPriceInfo(provider: ProviderFilterable, hasPriceFilter: string | undefined) {
  if (!hasText(hasPriceFilter)) {
    return true;
  }

  if (hasPriceFilter === "has-starting-price") {
    return isFinitePositiveNumber(provider.averagePriceMin);
  }

  if (hasPriceFilter === "has-price") {
    return hasPrice(provider);
  }

  return true;
}

export function filterProvidersByState<T extends ProviderFilterable>(
  providers: T[],
  filters: ProviderFilterState,
) {
  const minimumRating = parseFilterNumber(filters.rating);

  return providers.filter((provider) => {
    const availabilityMatches =
      !hasText(filters.availability) ||
      matchesTextValue(provider.availability ?? "", filters.availability ?? "");
    const verifiedMatches = !parseFilterBoolean(filters.verified) || Boolean(provider.isVerified);
    const ratingMatches = minimumRating === null || provider.rating >= minimumRating;
    const profileImageMatches =
      !parseFilterBoolean(filters.hasProfileImage) || hasText(provider.profileImageUrl);
    const portfolioMatches =
      !parseFilterBoolean(filters.hasPortfolio) || hasText(provider.galleryPreviewUrl);
    const reviewsMatches =
      !parseFilterBoolean(filters.hasReviews) || provider.reviewCount > 0;

    return (
      matchesCategoryFilter(provider, filters.category) &&
      matchesDistrictFilter(provider, filters.district) &&
      matchesSearchQuery(provider, filters.query) &&
      availabilityMatches &&
      verifiedMatches &&
      ratingMatches &&
      matchesResponseTime(provider, filters.responseTime) &&
      matchesPriceInfo(provider, filters.hasPrice) &&
      profileImageMatches &&
      portfolioMatches &&
      reviewsMatches
    );
  });
}

export function sortProvidersByState<T extends ProviderFilterable>(
  providers: T[],
  sortValue: string | undefined,
  context: { selectedDistrict?: string } = {},
) {
  const normalizedSort = normalizeSortValue(sortValue);
  const maxReviewCount = providers.reduce(
    (maxValue, provider) => Math.max(maxValue, provider.reviewCount),
    0,
  );

  return [...providers].sort((firstProvider, secondProvider) => {
    if (normalizedSort === "rating_desc") {
      return (
        compareNumbersDescending(firstProvider.rating, secondProvider.rating) ||
        compareNumbersDescending(firstProvider.reviewCount, secondProvider.reviewCount)
      );
    }

    if (normalizedSort === "reviews_desc") {
      return (
        compareNumbersDescending(firstProvider.reviewCount, secondProvider.reviewCount) ||
        compareNumbersDescending(firstProvider.rating, secondProvider.rating)
      );
    }

    if (normalizedSort === "response_time_asc") {
      return compareOptionalNumbers(
        isFinitePositiveNumber(firstProvider.responseTimeMinutes)
          ? (firstProvider.responseTimeMinutes as number)
          : null,
        isFinitePositiveNumber(secondProvider.responseTimeMinutes)
          ? (secondProvider.responseTimeMinutes as number)
          : null,
        "asc",
      );
    }

    if (normalizedSort === "price_asc" || normalizedSort === "price_desc") {
      return compareOptionalNumbers(
        getProviderPriceValue(firstProvider),
        getProviderPriceValue(secondProvider),
        normalizedSort === "price_asc" ? "asc" : "desc",
      );
    }

    if (normalizedSort === "newest") {
      return compareOptionalNumbers(
        getTimeValue(firstProvider.createdAt ?? firstProvider.lastActiveAt),
        getTimeValue(secondProvider.createdAt ?? secondProvider.lastActiveAt),
        "desc",
      );
    }

    return (
      getRecommendedScore(secondProvider, {
        maxReviewCount,
        selectedDistrict: context.selectedDistrict,
      }) -
        getRecommendedScore(firstProvider, {
          maxReviewCount,
          selectedDistrict: context.selectedDistrict,
        }) ||
      compareNumbersDescending(firstProvider.rating, secondProvider.rating)
    );
  });
}

export function getProviderFilterCapabilities(
  providers: ProviderFilterable[],
): ProviderFilterCapabilities {
  const capabilities = {
    hasAvailability: providers.some((provider) =>
      availabilityFilterOptions.some((option) =>
        matchesTextValue(provider.availability ?? "", option.value),
      ),
    ),
    hasCreatedAt: providers.some((provider) => getTimeValue(provider.createdAt) !== null),
    hasDistance: false as const,
    hasPortfolio: providers.some((provider) => hasText(provider.galleryPreviewUrl)),
    hasPrice: providers.some(hasPrice),
    hasProfileImage: providers.some((provider) => hasText(provider.profileImageUrl)),
    hasRating: providers.some((provider) => Number.isFinite(provider.rating) && provider.rating > 0),
    hasResponseTime: providers.some((provider) => isFinitePositiveNumber(provider.responseTimeMinutes)),
    hasReviews: providers.some((provider) => provider.reviewCount > 0),
    hasVerification: providers.some((provider) => Boolean(provider.isVerified)),
  };
  const sortOptions = providerSortOptions.filter((option) => {
    if (option.value === "response_time_asc") {
      return capabilities.hasResponseTime;
    }

    if (option.value === "price_asc" || option.value === "price_desc") {
      return capabilities.hasPrice;
    }

    if (option.value === "rating_desc") {
      return capabilities.hasRating;
    }

    if (option.value === "reviews_desc") {
      return capabilities.hasReviews;
    }

    if (option.value === "newest") {
      return capabilities.hasCreatedAt;
    }

    return true;
  });

  return {
    ...capabilities,
    sortOptions,
  };
}

export function getProviderSortLabel(value: string | undefined, mobile = false) {
  const sortOption = providerSortOptions.find((option) => option.value === normalizeSortValue(value));

  return mobile ? sortOption?.mobileLabel : sortOption?.label;
}

export function getDisplayCategoryChipLabel(value: string | undefined) {
  return getServiceDisplayLabel(value).trim();
}
