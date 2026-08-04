import { appRoutes } from "@/lib/constants/navigation";
import {
  getServiceCategorySearchValues,
  getServiceDisplayLabel,
  getServiceFilterValue,
  normalizeServiceValue,
} from "@/lib/constants/services";
import { logWarn } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sanitizeText } from "@/lib/validations";
import type {
  AssistantCategory,
  AssistantUrgency,
  RecommendedProvider,
} from "./assistant-schema";

export type SearchProvidersInput = {
  category: AssistantCategory;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  urgency: AssistantUrgency;
  verifiedOnly?: boolean;
  availableNow?: boolean;
};

type NamedRelation = {
  id?: string;
  name: string | null;
  slug?: string | null;
};

type ProviderSearchRecord = {
  id: string;
  name: string;
  category_id: string;
  district_id: string;
  average_price_min: number | null;
  average_price_max: number | null;
  rating: number | null;
  review_count: number | null;
  availability: string | null;
  response_time_minutes: number | null;
  is_verified: boolean | null;
  phone_verified: boolean | null;
  identity_verified: boolean | null;
  profile_image_url: string | null;
  gallery_preview_url: string | null;
  category?: NamedRelation | NamedRelation[] | null;
  district?: NamedRelation | NamedRelation[] | null;
};

const providerSelect = `
  id,
  name,
  category_id,
  district_id,
  average_price_min,
  average_price_max,
  rating,
  review_count,
  availability,
  response_time_minutes,
  is_verified,
  phone_verified,
  identity_verified,
  profile_image_url,
  gallery_preview_url,
  category:service_categories(name, slug),
  district:districts(name, slug)
`;

const assistantCategoryServiceMap: Record<AssistantCategory, string | null> = {
  electric: "elektrik-hizmeti",
  plumbing: "tesisat",
  cleaning: "temizlik",
  white_goods: "klima-beyaz-esya",
  locksmith: "cilingir",
  painting: "boya-badana",
  furniture: "mobilya-montaj",
  moving: "nakliye-yardimi",
  carpet_cleaning: "hali-yikama",
  pool_garden: "havuz-bahce-bakimi",
  renovation: "ev-tadilati",
  unknown: null,
};

function getRelationName(relation: NamedRelation | NamedRelation[] | null | undefined) {
  if (Array.isArray(relation)) {
    return relation[0]?.name?.trim() ?? "";
  }

  return relation?.name?.trim() ?? "";
}

function getRelationSlug(relation: NamedRelation | NamedRelation[] | null | undefined) {
  if (Array.isArray(relation)) {
    return relation[0]?.slug?.trim() ?? "";
  }

  return relation?.slug?.trim() ?? "";
}

function matchesAny(value: string | null | undefined, candidates: string[]) {
  const normalizedValue = normalizeServiceValue(value ?? "");

  if (!normalizedValue) {
    return false;
  }

  return candidates.some((candidate) => {
    const normalizedCandidate = normalizeServiceValue(candidate);

    return (
      normalizedValue === normalizedCandidate ||
      normalizedValue.includes(normalizedCandidate) ||
      normalizedCandidate.includes(normalizedValue)
    );
  });
}

function getCategoryCandidates(category: AssistantCategory) {
  const serviceValue = assistantCategoryServiceMap[category];

  if (!serviceValue) {
    return [];
  }

  return getServiceCategorySearchValues(serviceValue);
}

async function fetchMatchingIds(
  table: "districts" | "service_categories",
  candidates: string[],
) {
  const supabase = await createSupabaseServerClient();

  if (!supabase || candidates.length === 0) {
    return null;
  }

  const { data, error } = await supabase
    .from(table)
    .select("id, name, slug")
    .eq("is_active", true);

  if (error) {
    throw error;
  }

  return ((data ?? []) as NamedRelation[])
    .filter((record) => matchesAny(record.name, candidates) || matchesAny(record.slug, candidates))
    .map((record) => record.id)
    .filter((id): id is string => Boolean(id));
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0,
  }).format(value);
}

function getStartingPrice(record: ProviderSearchRecord) {
  if (
    typeof record.average_price_min === "number" &&
    Number.isFinite(record.average_price_min) &&
    record.average_price_min > 0
  ) {
    return `${formatPrice(record.average_price_min)} TL'den başlayan`;
  }

  if (
    typeof record.average_price_max === "number" &&
    Number.isFinite(record.average_price_max) &&
    record.average_price_max > 0
  ) {
    return `${formatPrice(record.average_price_max)} TL'ye kadar`;
  }

  return null;
}

function getResponseTime(minutes: number | null | undefined) {
  if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes <= 0) {
    return null;
  }

  if (minutes < 60) {
    return `${Math.round(minutes)} dk içinde`;
  }

  if (minutes <= 1440) {
    return `${Math.round(minutes / 60)} saat içinde`;
  }

  return "Aynı gün içinde";
}

function isAvailableNow(value: string | null | undefined) {
  const normalizedValue = normalizeServiceValue(value ?? "");

  return ["musait", "müsait"].some((candidate) => normalizedValue === normalizeServiceValue(candidate));
}

function isVerified(record: ProviderSearchRecord) {
  return Boolean(record.is_verified || record.identity_verified || record.phone_verified);
}

function scoreProvider(
  record: ProviderSearchRecord,
  input: SearchProvidersInput,
  categoryCandidates: string[],
  districtCandidates: string[],
) {
  let score = 0;
  const category = getRelationName(record.category);
  const categorySlug = getRelationSlug(record.category);
  const district = getRelationName(record.district);
  const districtSlug = getRelationSlug(record.district);

  if (
    categoryCandidates.length > 0 &&
    (matchesAny(category, categoryCandidates) || matchesAny(categorySlug, categoryCandidates))
  ) {
    score += 100;
  }

  if (
    districtCandidates.length > 0 &&
    (matchesAny(district, districtCandidates) || matchesAny(districtSlug, districtCandidates))
  ) {
    score += 60;
  }

  if ((input.urgency === "high" || input.urgency === "emergency") && isAvailableNow(record.availability)) {
    score += 35;
  }

  if (record.is_verified) {
    score += 24;
  }

  if (record.identity_verified) {
    score += 8;
  }

  if (record.phone_verified) {
    score += 5;
  }

  if (typeof record.rating === "number" && Number.isFinite(record.rating) && record.rating > 0) {
    score += (record.rating / 5) * 22;
  }

  if (
    typeof record.review_count === "number" &&
    Number.isFinite(record.review_count) &&
    record.review_count > 0
  ) {
    score += Math.log10(record.review_count + 1) * 8;
  }

  if (
    typeof record.response_time_minutes === "number" &&
    Number.isFinite(record.response_time_minutes) &&
    record.response_time_minutes > 0
  ) {
    score += Math.max(0, 16 - Math.min(record.response_time_minutes, 240) / 15);
  }

  return score;
}

function mapProvider(record: ProviderSearchRecord): RecommendedProvider {
  const category = getServiceDisplayLabel(getRelationName(record.category));
  const categoryFilter = getServiceFilterValue(category);
  const district = getRelationName(record.district);
  const params = new URLSearchParams({
    provider_id: record.id,
    provider_name: record.name,
  });

  if (categoryFilter) {
    params.set("category", categoryFilter);
  }

  if (district) {
    params.set("district", district);
  }

  return {
    id: record.id,
    name: sanitizeText(record.name, 120),
    category: sanitizeText(category, 120),
    district: sanitizeText(district, 120),
    rating:
      typeof record.rating === "number" && Number.isFinite(record.rating) ? record.rating : null,
    reviewCount:
      typeof record.review_count === "number" && Number.isFinite(record.review_count)
        ? Math.max(0, record.review_count)
        : null,
    verified: isVerified(record),
    availability: sanitizeText(record.availability ?? "", 80) || null,
    responseTime: getResponseTime(record.response_time_minutes),
    startingPrice: getStartingPrice(record),
    distanceKm: null,
    profileImageUrl:
      sanitizeText(record.profile_image_url ?? "", 500) ||
      sanitizeText(record.gallery_preview_url ?? "", 500) ||
      null,
    profileHref: `${appRoutes.providers}/${record.id}`,
    bookingHref: `${appRoutes.request}?${params.toString()}`,
  };
}

export async function searchProviders(input: SearchProvidersInput): Promise<RecommendedProvider[]> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return [];
  }

  try {
    const categoryCandidates = getCategoryCandidates(input.category);
    const districtCandidates = input.district ? [input.district] : [];
    const [categoryIds, districtIds] = await Promise.all([
      fetchMatchingIds("service_categories", categoryCandidates),
      fetchMatchingIds("districts", districtCandidates),
    ]);

    if (categoryCandidates.length > 0 && categoryIds?.length === 0) {
      return [];
    }

    if (districtCandidates.length > 0 && districtIds?.length === 0) {
      return [];
    }

    let query = supabase
      .from("providers")
      .select(providerSelect)
      .eq("is_active", true)
      .eq("is_approved", true);

    if (categoryIds && categoryIds.length > 0) {
      query = query.in("category_id", categoryIds);
    }

    if (districtIds && districtIds.length > 0) {
      query = query.in("district_id", districtIds);
    }

    if (input.verifiedOnly) {
      query = query.eq("is_verified", true);
    }

    const { data, error } = await query.order("rating", { ascending: false }).limit(30);

    if (error) {
      throw error;
    }

    return ((data ?? []) as unknown as ProviderSearchRecord[])
      .filter((record) => !input.availableNow || isAvailableNow(record.availability))
      .sort(
        (firstProvider, secondProvider) =>
          scoreProvider(secondProvider, input, categoryCandidates, districtCandidates) -
          scoreProvider(firstProvider, input, categoryCandidates, districtCandidates),
      )
      .slice(0, 3)
      .map(mapProvider);
  } catch (error) {
    logWarn("AI assistant provider search failed.", {
      category: input.category,
      district: input.district ?? null,
      reason: error instanceof Error ? error.message : String(error),
    });

    return [];
  }
}

