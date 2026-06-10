import { getPublicErrorMessage, handleServiceError } from "@/lib/errors";
import {
  PROVIDER_APPLICATION_STATUSES,
  isProviderApplicationStatus,
  isProviderAvailabilityStatus,
  normalizeProviderAvailabilityStatus,
  type ProviderApplicationStatus,
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
  "created_at" | "experience_years" | "full_name" | "id" | "phone" | "status"
> & {
  service_categories: ProviderRelation | ProviderRelation[] | null;
  districts: ProviderRelation | ProviderRelation[] | null;
  user_id?: string | null;
};

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

export type ProviderDashboardApplication = {
  category: string;
  createdAt: string;
  district: string;
  experienceYears: number;
  fullName: string;
  id: string;
  phone: string;
  status: ProviderApplicationStatus;
};

export type ProviderDashboardAccessAllowed = {
  application?: ProviderDashboardApplication;
  isConfigured: true;
  ok: true;
  profile: ProviderDashboardProfile;
  role: "provider";
  userId: string;
};

export type ProviderDashboardAccessDenied = {
  application?: ProviderDashboardApplication;
  applicationStatus?: ProviderApplicationStatus;
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

const providerApplicationSelectQueryWithUserId = `
  id,
  user_id,
  full_name,
  phone,
  experience_years,
  status,
  created_at,
  service_categories(name),
  districts(name)
`;

function getMetadataString(metadata: unknown, keys: readonly string[]) {
  if (!metadata || typeof metadata !== "object") {
    return "";
  }

  const record = metadata as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string") {
      const sanitizedValue = sanitizeText(value, 120);

      if (sanitizedValue) {
        return sanitizedValue;
      }
    }
  }

  return "";
}

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

function getSupabaseErrorText(error: unknown) {
  if (!error || typeof error !== "object") {
    return "";
  }

  const record = error as { code?: unknown; details?: unknown; message?: unknown };
  return [record.code, record.details, record.message]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLocaleLowerCase("tr");
}

function isMissingColumn(error: unknown, columnName: string) {
  const errorText = getSupabaseErrorText(error);

  return errorText.includes("column") && errorText.includes(columnName);
}

function isMissingAvailabilityColumn(error: unknown) {
  return isMissingColumn(error, "availability");
}

function isMissingProviderApplicationUserIdColumn(error: unknown) {
  return isMissingColumn(error, "user_id");
}

function getProviderDashboardReadError(error: unknown) {
  const appError = handleServiceError(error, {
    logContext: "Provider dashboard Supabase read failed.",
    publicMessage: authAccessMessages.accessDenied,
  });

  return getPublicErrorMessage(appError, authAccessMessages.accessDenied);
}

const providerDashboardApplicationStatusMessages: Record<
  ProviderApplicationStatus,
  string
> = {
  [PROVIDER_APPLICATION_STATUSES.pending]: "Ba\u015fvurunuz de\u011ferlendirmede",
  [PROVIDER_APPLICATION_STATUSES.approved]: "Ba\u015fvurunuz onayland\u0131",
  [PROVIDER_APPLICATION_STATUSES.rejected]: "Ba\u015fvurunuz reddedildi",
};

function getApplicationStatusMessage(
  application: Pick<ProviderDashboardApplication, "status">,
) {
  return providerDashboardApplicationStatusMessages[application.status];
}

function mapProviderDashboardApplicationRecord(
  record: ProviderDashboardApplicationRecord,
): ProviderDashboardApplication | null {
  const status = sanitizeText(record.status, 40);

  if (!isProviderApplicationStatus(status)) {
    return null;
  }

  const fullName = sanitizeText(record.full_name, 120);
  const phone = sanitizePhone(record.phone);

  if (!fullName || !phone) {
    return null;
  }

  return {
    category: sanitizeText(getRelationName(record.service_categories), 120) || "Belirtilmedi",
    createdAt: record.created_at,
    district: sanitizeText(getRelationName(record.districts), 120) || "Belirtilmedi",
    experienceYears: Number(record.experience_years ?? 0),
    fullName,
    id: record.id,
    phone,
    status,
  };
}

async function fetchLatestProviderApplicationByUserId(
  supabase: NonNullable<Awaited<ReturnType<typeof getServerAuthContext>>["supabase"]>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("provider_applications")
    .select(providerApplicationSelectQueryWithUserId)
    .filter("user_id", "eq", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    application: data
      ? mapProviderDashboardApplicationRecord(
          data as unknown as ProviderDashboardApplicationRecord,
        )
      : null,
    error,
    isMissingUserIdColumn: Boolean(error && isMissingProviderApplicationUserIdColumn(error)),
  };
}

function mapProviderDashboardApplicationRecords(
  records: ProviderDashboardApplicationRecord[],
) {
  return records
    .map(mapProviderDashboardApplicationRecord)
    .filter(
      (application): application is ProviderDashboardApplication =>
        Boolean(application),
    );
}

async function fetchProviderApplicationsByPhones(
  supabase: NonNullable<Awaited<ReturnType<typeof getServerAuthContext>>["supabase"]>,
  phones: string[],
) {
  if (phones.length === 0) {
    return {
      applications: [],
      error: null,
      isMissingUserIdColumn: false,
      records: [],
    };
  }

  const { data, error } = await supabase
    .from("provider_applications")
    .select(providerApplicationSelectQueryWithUserId)
    .in("phone", phones)
    .order("created_at", { ascending: false });

  const records = (data ?? []) as unknown as ProviderDashboardApplicationRecord[];

  return {
    applications: mapProviderDashboardApplicationRecords(records),
    error,
    isMissingUserIdColumn: Boolean(error && isMissingProviderApplicationUserIdColumn(error)),
    records,
  };
}

async function bindProviderApplicationRecordsToUser(
  supabase: NonNullable<Awaited<ReturnType<typeof getServerAuthContext>>["supabase"]>,
  records: ProviderDashboardApplicationRecord[],
) {
  const unboundApplicationIds = records
    .filter((record) => record.user_id === null)
    .map((record) => record.id);

  if (unboundApplicationIds.length === 0) {
    return null;
  }

  const { error } = await supabase.rpc(
    "bind_provider_applications_to_current_user",
    {
      application_ids: unboundApplicationIds,
    },
  );

  return error;
}

async function getLatestProviderApplicationForCurrentUser(
  supabase: NonNullable<Awaited<ReturnType<typeof getServerAuthContext>>["supabase"]>,
  userId: string,
  phones: string[],
) {
  const userApplicationResult = await fetchLatestProviderApplicationByUserId(
    supabase,
    userId,
  );

  if (userApplicationResult.error && !userApplicationResult.isMissingUserIdColumn) {
    return {
      application: null,
      error: userApplicationResult.error,
    };
  }

  if (userApplicationResult.application) {
    return {
      application: userApplicationResult.application,
      error: null,
    };
  }

  const phoneApplicationResult = await fetchProviderApplicationsByPhones(
    supabase,
    phones,
  );

  if (
    phoneApplicationResult.error &&
    !phoneApplicationResult.isMissingUserIdColumn
  ) {
    return {
      application: null,
      error: phoneApplicationResult.error,
    };
  }

  const bindError = await bindProviderApplicationRecordsToUser(
    supabase,
    phoneApplicationResult.records,
  );

  if (bindError) {
    console.warn("[Fuwu] Provider application user binding failed.", bindError);
  }

  return {
    application: phoneApplicationResult.applications[0] ?? null,
    error: null,
  };
}

function getUniqueContactPhones(...phones: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      phones
        .map((phone) => sanitizePhone(phone ?? ""))
        .filter((phone) => Boolean(phone)),
    ),
  );
}

function getApplicationAccessReason(
  applicationStatus: ProviderApplicationStatus,
): ProviderDashboardAccessDenied["reason"] {
  if (applicationStatus === PROVIDER_APPLICATION_STATUSES.rejected) {
    return "rejected-application";
  }

  if (applicationStatus === PROVIDER_APPLICATION_STATUSES.approved) {
    return "pending-provider-profile";
  }

  return "pending-application";
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
  const contactPhones = getUniqueContactPhones(
    authContext.profile?.phone,
    authContext.user.phone,
    getMetadataString(authContext.user.user_metadata, ["phone", "phone_number"]),
  );
  const applicationResult = await getLatestProviderApplicationForCurrentUser(
    authContext.supabase,
    authContext.user.id,
    contactPhones,
  );

  if (applicationResult.error) {
    return {
      isConfigured: true,
      message: getProviderDashboardReadError(applicationResult.error),
      ok: false,
      reason: "missing-provider-profile",
      role: authContext.profile?.role ?? null,
      userId: authContext.user.id,
    };
  }

  const providerApplication = applicationResult.application;

  if (profile?.isApproved) {
    return {
      application: providerApplication ?? undefined,
      isConfigured: true,
      ok: true,
      profile,
      role: "provider",
      userId: authContext.user.id,
    };
  }

  if (profile && !profile.isApproved) {
    return {
      application: providerApplication ?? undefined,
      applicationStatus: providerApplication?.status ?? PROVIDER_APPLICATION_STATUSES.pending,
      isConfigured: true,
      message: "Usta profilin oluşturuldu ve onay bekliyor. Onay tamamlandığında panel erişimin açılır.",
      ok: false,
      reason: "pending-provider-profile",
      role: authContext.profile?.role ?? null,
      userId: authContext.user.id,
    };
  }

  if (providerApplication) {
    return {
      application: providerApplication,
      applicationStatus: providerApplication.status,
      isConfigured: true,
      message: getApplicationStatusMessage(providerApplication),
      ok: false,
      reason: getApplicationAccessReason(providerApplication.status),
      role: authContext.profile?.role ?? null,
      userId: authContext.user.id,
    };
  }

  if (!profile) {
    return {
      isConfigured: true,
      message: "Usta ağına katılmak için başvuru yap.",
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
