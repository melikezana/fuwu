import { getPublicErrorMessage, handleServiceError } from "@/lib/errors";
import type { Database } from "@/lib/supabase/types";
import { authAccessMessages, hasProviderRole } from "@/services/auth/constants";
import { getServerAuthContext } from "@/services/auth/server";

type ProviderDashboardRecord = Pick<
  Database["public"]["Tables"]["providers"]["Row"],
  | "id"
  | "name"
  | "phone"
  | "whatsapp"
  | "description"
  | "average_price_min"
  | "average_price_max"
  | "rating"
  | "is_active"
  | "is_approved"
> & {
  districts: ProviderRelation | ProviderRelation[] | null;
  service_categories: ProviderRelation | ProviderRelation[] | null;
};

type ProviderRelation = {
  name: string | null;
};

export type ProviderDashboardProfile = {
  averagePriceRange: string;
  category: string;
  description: string;
  district: string;
  id: string;
  isActive: boolean;
  isApproved: boolean;
  name: string;
  phone: string;
  rating: number;
  whatsapp: string;
};

export type ProviderDashboardAccessAllowed = {
  isConfigured: true;
  ok: true;
  profile: ProviderDashboardProfile;
  role: "provider";
  userId: string;
};

export type ProviderDashboardAccessDenied = {
  isConfigured: boolean;
  message: string;
  ok: false;
  reason: "missing-session" | "missing-provider-profile" | "not-provider";
  role?: string | null;
  userId?: string;
};

export type ProviderDashboardAccessResult =
  | ProviderDashboardAccessAllowed
  | ProviderDashboardAccessDenied;

const providerSelectQuery = `
  id,
  name,
  phone,
  whatsapp,
  description,
  average_price_min,
  average_price_max,
  rating,
  is_active,
  is_approved,
  service_categories(name),
  districts(name)
`;

function getRelationName(
  relation: ProviderRelation | ProviderRelation[] | null | undefined,
) {
  if (Array.isArray(relation)) {
    return relation[0]?.name?.trim() ?? "";
  }

  return relation?.name?.trim() ?? "";
}

function parsePrice(value: number | string | null) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatAveragePriceRange(
  minimumPriceValue: number | string | null,
  maximumPriceValue: number | string | null,
) {
  const minimumPrice = parsePrice(minimumPriceValue);
  const maximumPrice = parsePrice(maximumPriceValue);

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

function mapProviderDashboardRecord(
  record: ProviderDashboardRecord,
): ProviderDashboardProfile | null {
  const category = getRelationName(record.service_categories);
  const district = getRelationName(record.districts);

  if (!category || !district) {
    return null;
  }

  return {
    averagePriceRange: formatAveragePriceRange(
      record.average_price_min,
      record.average_price_max,
    ),
    category,
    description:
      record.description?.trim() ||
      "Profil açıklaması Fuwu operasyon ekibi tarafından tamamlanacak.",
    district,
    id: record.id,
    isActive: record.is_active,
    isApproved: record.is_approved,
    name: record.name,
    phone: record.phone,
    rating: Number(record.rating ?? 0),
    whatsapp: record.whatsapp?.trim() || record.phone,
  };
}

function getProviderDashboardReadError(error: unknown) {
  const appError = handleServiceError(error, {
    logContext: "Provider dashboard Supabase read failed.",
    publicMessage: authAccessMessages.accessDenied,
  });

  return getPublicErrorMessage(appError, authAccessMessages.accessDenied);
}

export async function getProviderDashboardAccess(): Promise<ProviderDashboardAccessResult> {
  const authContext = await getServerAuthContext();

  if (!authContext.supabase || !authContext.user) {
    return {
      isConfigured: authContext.isConfigured,
      message: authAccessMessages.loginRequired,
      ok: false,
      reason: "missing-session",
    };
  }

  if (!hasProviderRole(authContext.profile)) {
    return {
      isConfigured: true,
      message: authAccessMessages.accessDenied,
      ok: false,
      reason: "not-provider",
      role: authContext.profile?.role ?? null,
      userId: authContext.user.id,
    };
  }

  const { data, error } = await authContext.supabase
    .from("providers")
    .select(providerSelectQuery)
    .eq("user_id", authContext.user.id)
    .maybeSingle();

  if (error) {
    return {
      isConfigured: true,
      message: getProviderDashboardReadError(error),
      ok: false,
      reason: "missing-provider-profile",
      role: authContext.profile?.role ?? null,
      userId: authContext.user.id,
    };
  }

  const profile = data
    ? mapProviderDashboardRecord(data as unknown as ProviderDashboardRecord)
    : null;

  if (!profile) {
    return {
      isConfigured: true,
      message: authAccessMessages.accessDenied,
      ok: false,
      reason: "missing-provider-profile",
      role: authContext.profile?.role ?? null,
      userId: authContext.user.id,
    };
  }

  return {
    isConfigured: true,
    ok: true,
    profile,
    role: "provider",
    userId: authContext.user.id,
  };
}

export async function getProviderDashboardProfile() {
  const access = await getProviderDashboardAccess();

  return access.ok ? access.profile : null;
}
