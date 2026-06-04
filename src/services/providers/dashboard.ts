import { getPublicErrorMessage, handleServiceError } from "@/lib/errors";
import {
  PROVIDER_APPLICATION_STATUSES,
  isProviderAvailabilityStatus,
  normalizeProviderAvailabilityStatus,
  type ProviderAvailabilityStatus,
} from "@/lib/constants/statuses";
import type { Database } from "@/lib/supabase/types";
import { authAccessMessages } from "@/services/auth/constants";
import { getServerAuthContext } from "@/services/auth/server";
import { sanitizePhone, sanitizeText } from "@/lib/validations";

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
  availability?: string | null;
  districts: ProviderRelation | ProviderRelation[] | null;
  service_categories: ProviderRelation | ProviderRelation[] | null;
};

type ProviderApplicationRow =
  Database["public"]["Tables"]["provider_applications"]["Row"];

type ProviderDashboardApplicationRecord = Pick<
  ProviderApplicationRow,
  "created_at" | "status"
>;

type ProviderRelation = {
  name: string | null;
};

export type ProviderDashboardProfile = {
  averagePriceRange: string;
  availability: ProviderAvailabilityStatus;
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
  reason:
    | "missing-session"
    | "missing-provider-profile"
    | "pending-application"
    | "pending-provider-profile"
    | "rejected-application";
  role?: string | null;
  userId?: string;
};

export type ProviderDashboardAccessResult =
  | ProviderDashboardAccessAllowed
  | ProviderDashboardAccessDenied;

export type ProviderAvailabilityActionCode =
  | "availability-invalid"
  | "availability-missing-profile"
  | "availability-schema-missing"
  | "availability-update-failed"
  | "availability-updated"
  | "provider-not-authorized"
  | "supabase-not-configured";

export type ProviderAvailabilityActionResult = {
  code: ProviderAvailabilityActionCode;
  ok: boolean;
};

const providerSelectQuery = `
  id,
  name,
  phone,
  whatsapp,
  description,
  average_price_min,
  average_price_max,
  rating,
  availability,
  is_active,
  is_approved,
  service_categories(name),
  districts(name)
`;

const providerSelectQueryWithoutAvailability = `
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

const providerApplicationSelectQuery = "status, created_at";

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
  const category = sanitizeText(getRelationName(record.service_categories), 120);
  const district = sanitizeText(getRelationName(record.districts), 120);
  const name = sanitizeText(record.name, 120);
  const phone = sanitizePhone(record.phone);

  if (!category || !district || !name || !phone) {
    return null;
  }

  return {
    averagePriceRange: formatAveragePriceRange(
      record.average_price_min,
      record.average_price_max,
    ),
    availability: normalizeProviderAvailabilityStatus(record.availability),
    category,
    description:
      record.description?.trim() ||
      "Profil açıklaması Fuwu operasyon ekibi tarafından tamamlanacak.",
    district,
    id: record.id,
    isActive: record.is_active,
    isApproved: record.is_approved,
    name,
    phone,
    rating: Number(record.rating ?? 0),
    whatsapp: sanitizePhone(record.whatsapp ?? "") || phone,
  };
}

function isMissingAvailabilityColumn(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as { code?: unknown; details?: unknown; message?: unknown };
  const errorText = [record.code, record.details, record.message]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLocaleLowerCase("tr");

  return errorText.includes("availability") && errorText.includes("column");
}

function getProviderDashboardReadError(error: unknown) {
  const appError = handleServiceError(error, {
    logContext: "Provider dashboard Supabase read failed.",
    publicMessage: authAccessMessages.accessDenied,
  });

  return getPublicErrorMessage(appError, authAccessMessages.accessDenied);
}

function getApplicationStatusMessage(
  application: ProviderDashboardApplicationRecord,
) {
  if (application.status === PROVIDER_APPLICATION_STATUSES.rejected) {
    return "Usta başvurun reddedildi. Yeni veya güncellenmiş bilgilerle tekrar başvurabilirsin.";
  }

  if (application.status === PROVIDER_APPLICATION_STATUSES.approved) {
    return "Başvurun onaylandı; usta profilin hazırlanıyor. Profil bağlandığında panel otomatik açılır.";
  }

  return "Usta başvurun incelemede. Admin onayı tamamlandığında panel erişimin otomatik açılır.";
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

  let { data, error } = await authContext.supabase
    .from("providers")
    .select(providerSelectQuery)
    .eq("user_id", authContext.user.id)
    .order("is_approved", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && isMissingAvailabilityColumn(error)) {
    const fallbackResult = await authContext.supabase
      .from("providers")
      .select(providerSelectQueryWithoutAvailability)
      .eq("user_id", authContext.user.id)
      .order("is_approved", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    data = fallbackResult.data as typeof data;
    error = fallbackResult.error;
  }

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

  if (profile?.isApproved) {
    return {
      isConfigured: true,
      ok: true,
      profile,
      role: "provider",
      userId: authContext.user.id,
    };
  }

  if (profile && !profile.isApproved) {
    return {
      isConfigured: true,
      message: "Usta profilin oluşturuldu ve onay bekliyor. Onay tamamlandığında panel erişimin açılır.",
      ok: false,
      reason: "pending-provider-profile",
      role: authContext.profile?.role ?? null,
      userId: authContext.user.id,
    };
  }

  const { data: application, error: applicationError } = await authContext.supabase
    .from("provider_applications")
    .select(providerApplicationSelectQuery)
    .eq("user_id", authContext.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (applicationError) {
    return {
      isConfigured: true,
      message: getProviderDashboardReadError(applicationError),
      ok: false,
      reason: "missing-provider-profile",
      role: authContext.profile?.role ?? null,
      userId: authContext.user.id,
    };
  }

  const providerApplication = application as ProviderDashboardApplicationRecord | null;

  if (providerApplication) {
    return {
      isConfigured: true,
      message: getApplicationStatusMessage(providerApplication),
      ok: false,
      reason:
        providerApplication.status === PROVIDER_APPLICATION_STATUSES.rejected
          ? "rejected-application"
          : "pending-application",
      role: authContext.profile?.role ?? null,
      userId: authContext.user.id,
    };
  }

  if (!profile) {
    return {
      isConfigured: true,
      message: "Bu hesaba bağlı onaylı usta profili bulunmuyor. Usta ağına katılmak için başvuru formunu gönderebilirsin.",
      ok: false,
      reason: "missing-provider-profile",
      role: authContext.profile?.role ?? null,
      userId: authContext.user.id,
    };
  }

  return {
    isConfigured: true,
    message: authAccessMessages.accessDenied,
    ok: false,
    reason: "missing-provider-profile",
    role: authContext.profile?.role ?? null,
    userId: authContext.user.id,
  };
}

export async function getProviderDashboardProfile() {
  const access = await getProviderDashboardAccess();

  return access.ok ? access.profile : null;
}

function createAvailabilityActionResult(
  code: ProviderAvailabilityActionCode,
  ok: boolean,
): ProviderAvailabilityActionResult {
  return {
    code,
    ok,
  };
}

export async function updateProviderDashboardAvailability(
  availability: string,
): Promise<ProviderAvailabilityActionResult> {
  const normalizedAvailability = sanitizeText(availability, 40).toLocaleLowerCase("tr");

  if (!isProviderAvailabilityStatus(normalizedAvailability)) {
    return createAvailabilityActionResult("availability-invalid", false);
  }

  const authContext = await getServerAuthContext();

  if (!authContext.supabase) {
    return createAvailabilityActionResult("supabase-not-configured", false);
  }

  if (!authContext.user) {
    return createAvailabilityActionResult("provider-not-authorized", false);
  }

  const { data, error } = await authContext.supabase
    .from("providers")
    .update({ availability: normalizedAvailability })
    .eq("user_id", authContext.user.id)
    .eq("is_approved", true)
    .select("id")
    .maybeSingle();

  if (error) {
    if (isMissingAvailabilityColumn(error)) {
      return createAvailabilityActionResult("availability-schema-missing", false);
    }

    handleServiceError(error, {
      logContext: "Provider availability update failed.",
      publicMessage: "Uygunluk durumu şu anda güncellenemedi.",
    });

    return createAvailabilityActionResult("availability-update-failed", false);
  }

  if (!data) {
    return createAvailabilityActionResult("availability-missing-profile", false);
  }

  return createAvailabilityActionResult("availability-updated", true);
}
