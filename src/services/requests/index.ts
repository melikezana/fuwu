import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AuthError,
  DatabaseError,
  handleServiceError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import {
  EMERGENCY_REQUEST_STATUSES,
  LEGACY_SERVICE_REQUEST_STATUSES,
  SERVICE_REQUEST_STATUSES,
  canTransitionServiceRequest,
  normalizeServiceRequestStatus,
  type ServiceRequestStatus,
} from "@/lib/constants/statuses";
import { normalizeServiceValue } from "@/lib/constants/services";
import { logError, logInfo } from "@/lib/logger";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  createSupabaseServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/types";
import { validateServiceRequestInput } from "@/lib/validations";
import {
  createEmergencyMatchRequest,
  isEmergencyBudgetTag,
  normalizeBudgetTag,
  validateEmergencyPrice,
} from "@/services/matching";
import {
  createPaymentTrackingForCompletedRequest,
  getPaymentPreferenceLabel,
  savePaymentPreference,
} from "@/services/payments";
import { calculateEstimatedArrivalText } from "@/services/tracking";
import { getCurrentUser } from "@/services/auth";
import { ensureProfileForUser } from "@/services/auth/profiles";
import { getServerAuthContext, type ServerAuthContext } from "@/services/auth/server";
import { isUuid } from "@/lib/utils/validation";
import { checkRateLimitWithRedis } from "@/lib/security/rateLimitRedis";
import { writeAuditLog } from "@/services/audit";
import {
  notifyEmergencyRequestDispatched,
  notifyServiceRequestAccepted,
  notifyServiceRequestRejected,
  notifyServiceRequestCreated,
} from "@/services/notifications";
import { createServiceSuccess } from "@/services/serviceResponse";
import type {
  ServiceRequestInput,
  RequestFormInsights,
  ServiceRequestSubmitResult,
  ServiceRequestUrgency,
  ServiceRequestUrgencyType,
} from "@/types/request";

type LookupTable = "service_categories" | "districts";

type LookupRecord = {
  id?: unknown;
  name?: unknown;
  slug?: unknown;
};

type RequestFormInsightProviderRecord = {
  category: MaybeNamedRelation;
  district: MaybeNamedRelation;
  response_time_minutes?: number | null;
};

type ServiceRequestInsert = Database["public"]["Tables"]["service_requests"]["Insert"];
type ServiceRequestUpdate = Database["public"]["Tables"]["service_requests"]["Update"];
type ServiceRequestRow = Database["public"]["Tables"]["service_requests"]["Row"];

type NamedRelation = {
  name: string | null;
  slug?: string | null;
};

type MaybeNamedRelation = NamedRelation | NamedRelation[] | null;

type ProfileRelation = {
  full_name: string | null;
  phone: string | null;
};

type MaybeProfileRelation = ProfileRelation | ProfileRelation[] | null;

type ServiceRequestDistrictRelation = {
  districts: MaybeNamedRelation;
};

type ProviderAssignedRequestRecord = Pick<
  ServiceRequestRow,
  | "accepted_at"
  | "accepted_provider_id"
  | "address"
  | "approximate_location"
  | "assigned_provider_id"
  | "budget"
  | "budget_tag"
  | "confirmation_code"
  | "created_at"
  | "description"
  | "emergency_status"
  | "estimated_arrival_text"
  | "id"
  | "offered_price"
  | "payment_preference"
  | "preferred_date"
  | "preferred_time"
  | "status"
  | "urgency"
  | "urgency_type"
> & {
  districts: MaybeNamedRelation;
  profiles: MaybeProfileRelation;
  service_categories: MaybeNamedRelation;
};

export type ProviderAssignedRequestAction = "accept" | "reject";

export type ProviderAssignedRequestActionCode =
  | "request-accepted"
  | "request-rejected"
  | "request-action-failed"
  | "request-invalid-id"
  | "request-invalid-status"
  | "request-not-assigned"
  | "provider-not-authorized"
  | "supabase-not-configured";

export type ProviderAssignedRequestActionResult = {
  code: ProviderAssignedRequestActionCode;
  message: string;
  ok: boolean;
};

export type { ServiceRequestPaymentPreference } from "@/types/request";

export type {
  ServiceRequestInput,
  ServiceRequestSubmitResult,
  ServiceRequestUrgency,
  ServiceRequestUrgencyType,
} from "@/types/request";

export const serviceRequestLoginRequiredMessage =
  "Talep oluşturmak için giriş yapmalısın.";

export const serviceRequestSubmitErrorMessage =
  "Talep oluşturulamadı. Lütfen tekrar deneyin.";

const serviceRequestRateLimitMessage =
  "Kısa sürede çok sayıda talep oluşturdun. Lütfen biraz sonra tekrar dene.";

const emptyRequestFormInsights: RequestFormInsights = {
  averageResponseMinutesByCategory: {},
  providerCountByCategory: {},
  providerCountByCategoryAndDistrict: {},
  source: "fallback",
};

function createLiveRequestCode(id: unknown) {
  if (typeof id !== "string" || !id.trim()) {
    return `FW-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  return `FW-${id.slice(0, 8).toLocaleUpperCase("tr")}`;
}

export function generateJobConfirmationCode() {
  const randomNumber =
    typeof globalThis.crypto !== "undefined" && "getRandomValues" in globalThis.crypto
      ? globalThis.crypto.getRandomValues(new Uint32Array(1))[0] % 9000
      : Math.floor(Math.random() * 9000);

  return `FW-${String(randomNumber + 1000).padStart(4, "0")}`;
}

export const generateConfirmationCode = generateJobConfirmationCode;

export function saveUrgencyType(
  urgencyType: string | null | undefined,
  budgetTag?: string | null,
): ServiceRequestUrgencyType {
  if (urgencyType === "emergency" || isEmergencyBudgetTag(budgetTag ?? undefined)) {
    return "emergency";
  }

  return "standard";
}

function createServiceRequestClient(): SupabaseClient<Database> | null {
  return createSupabaseBrowserClient();
}

function warnServiceRequestError(message: string, error: unknown) {
  handleServiceError(error, {
    logContext: message,
    publicMessage: serviceRequestSubmitErrorMessage,
  });
}

async function assertServiceRequestRateLimit(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  const result = await checkRateLimitWithRedis({
    action: "service_request_create",
    limit: 10,
    supabase,
    userId,
    windowMs: 60 * 60 * 1000,
  });

  if (!result.allowed) {
    throw new ValidationError("Service request create rate limit exceeded.", {
      publicMessage: serviceRequestRateLimitMessage,
      statusCode: 429,
    });
  }
}

const providerAssignedRequestActionMessages: Record<
  ProviderAssignedRequestActionCode,
  string
> = {
  "provider-not-authorized": "Kabul işlemi başarısız oldu.",
  "request-accepted": "Talep kabul edildi.",
  "request-action-failed": "Kabul işlemi başarısız oldu.",
  "request-invalid-id": "Talep kimliği geçerli değil.",
  "request-invalid-status": "Bu talep şu anda yanıtlanamaz.",
  "request-not-assigned": "Bu talep sana atanmadı.",
  "request-rejected": "Talep reddedildi.",
  "supabase-not-configured": "Kabul işlemi başarısız oldu.",
};

function getProviderRequestActionFailureMessage(
  action: ProviderAssignedRequestAction,
  code: ProviderAssignedRequestActionCode,
) {
  if (code === "request-not-assigned") {
    return "Bu talep sana atanmadı.";
  }

  if (action === "reject") {
    return "Red işlemi başarısız oldu.";
  }

  return providerAssignedRequestActionMessages[code] || "Kabul işlemi başarısız oldu.";
}

function createProviderAssignedRequestActionResult(
  code: ProviderAssignedRequestActionCode,
  ok: boolean,
  action: ProviderAssignedRequestAction,
): ProviderAssignedRequestActionResult {
  return {
    code,
    message: ok
      ? providerAssignedRequestActionMessages[code]
      : getProviderRequestActionFailureMessage(action, code),
    ok,
  };
}

function getSupabaseErrorLogDetails(error: unknown) {
  if (!error || typeof error !== "object") {
    return {};
  }

  const record = error as {
    code?: unknown;
    details?: unknown;
    hint?: unknown;
    message?: unknown;
  };

  return {
    code: typeof record.code === "string" ? record.code : undefined,
    details: typeof record.details === "string" ? record.details : undefined,
    hint: typeof record.hint === "string" ? record.hint : undefined,
    message: typeof record.message === "string" ? record.message : undefined,
  };
}

function getRelationName(relation: MaybeNamedRelation, fallback: string) {
  const record = Array.isArray(relation) ? relation[0] : relation;

  return record?.name?.trim() || fallback;
}

function getRelationRecord(relation: MaybeNamedRelation) {
  return Array.isArray(relation) ? relation[0] : relation;
}

function getRelationLookupKeys(relation: MaybeNamedRelation) {
  const record = getRelationRecord(relation);

  return Array.from(
    new Set(
      [record?.name, record?.slug]
        .filter((value): value is string => Boolean(value?.trim()))
        .map((value) => normalizeServiceValue(value)),
    ),
  );
}

function getProfileRelation(relation: MaybeProfileRelation) {
  return Array.isArray(relation) ? relation[0] : relation;
}

function logProviderRequestActionFailure({
  action,
  context,
  error,
  providerId,
  requestId,
}: {
  action: ProviderAssignedRequestAction;
  context: string;
  error: unknown;
  providerId: string;
  requestId: string;
}) {
  const payload = {
    action,
    providerId,
    requestId,
    supabaseError: getSupabaseErrorLogDetails(error),
  };

  console.error(`[Fuwu] Provider request ${context} failed.`, payload);
  logError(`Provider request ${context} failed.`, payload);
}

async function insertProviderRequestAuditLog({
  action,
  actorUserId,
  metadata = {},
  requestId,
  supabase,
}: {
  action: string;
  actorUserId: string | null;
  metadata?: Json;
  requestId: string;
  supabase: SupabaseClient<Database>;
}) {
  try {
    await writeAuditLog(
      {
        action: action as Parameters<typeof writeAuditLog>[0]["action"],
        actorUserId,
        entityId: requestId,
        entityType: "service_request",
        metadata,
      },
      supabase,
    );
  } catch (error) {
    logProviderRequestActionFailure({
      action: action.endsWith("rejected") ? "reject" : "accept",
      context: "audit log insert",
      error,
      providerId:
        typeof metadata === "object" && metadata && !Array.isArray(metadata)
          ? String(metadata.providerId ?? "")
          : "",
      requestId,
    });
  }
}

function isProviderResponseWaitingStatus(status: string) {
  return normalizeServiceRequestStatus(status) === SERVICE_REQUEST_STATUSES.assigned;
}

function parseServiceCategoryName(serviceCategory: string) {
  const categoryParts = serviceCategory.split(" - ");
  return categoryParts[categoryParts.length - 1]?.trim() ?? serviceCategory.trim();
}

function mapUrgencyLevel(urgencyLevel: string): ServiceRequestUrgency {
  const normalizedUrgency = urgencyLevel.trim().toLocaleLowerCase("tr");

  if (normalizedUrgency === "esnek") {
    return "low";
  }

  if (normalizedUrgency === "acil") {
    return "urgent";
  }

  if (normalizedUrgency === "bu hafta") {
    return "high";
  }

  return "normal";
}

function parsePreferredTime(preferredTimeRange: string) {
  const match = preferredTimeRange.match(/(\d{2}:\d{2})/);
  return match ? `${match[1]}:00` : null;
}

function getTodayDateInput() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseOfferedPrice(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const normalizedValue = value?.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "") ?? "";
  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function formatPriceLabel(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(value)} TL`;
}

function createRequestDescription(data: ServiceRequestInput) {
  const paymentPreferenceLabel = getPaymentPreferenceLabel(data.paymentPreference);
  const urgencyType = saveUrgencyType(data.urgencyType, data.budgetTag);
  const offeredPriceLabel = formatPriceLabel(parseOfferedPrice(data.offerAmount));

  if (urgencyType === "emergency") {
    return [
      `Acil hizmet talebi: ${parseServiceCategoryName(data.serviceCategory)}`,
      offeredPriceLabel ? `Teklif tutarı: ${offeredPriceLabel}` : "",
      paymentPreferenceLabel !== "Belirtilmedi"
        ? `Ödeme tercihi: ${paymentPreferenceLabel}`
        : "",
      data.district?.trim() ? `İlçe: ${data.district.trim()}` : "",
      data.approximateLocation?.trim()
        ? `Yaklaşık konum: ${data.approximateLocation.trim()}`
        : "",
      data.fullName?.trim() || data.phoneNumber?.trim()
        ? `İletişim: ${data.fullName.trim()} / ${data.phoneNumber.trim()}`
        : "",
      "Bildirim kanalı: usta paneli, ileride WhatsApp/SMS/push.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    data.shortDescription.trim(),
    offeredPriceLabel ? `Teklif tutarı: ${offeredPriceLabel}` : "",
    paymentPreferenceLabel !== "Belirtilmedi"
      ? `Ödeme tercihi: ${paymentPreferenceLabel}`
      : "",
    `İletişim: ${data.fullName.trim()} / ${data.phoneNumber.trim()}`,
    `Tercih edilen saat aralığı: ${data.preferredTimeRange.trim()}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function findLookupId(
  supabase: SupabaseClient<Database>,
  table: LookupTable,
  displayName: string,
): Promise<string | null> {
  const requestedName = displayName.trim();

  if (!requestedName) {
    return null;
  }

  const { data, error } = await supabase
    .from(table)
    .select("id, name, slug")
    .eq("is_active", true);

  if (error) {
    throw handleServiceError(error, {
      logContext: `Service request ${table} lookup failed.`,
      publicMessage: serviceRequestSubmitErrorMessage,
    });
  }

  const requestedValue = normalizeServiceValue(requestedName);
  const matchingRecord = ((data ?? []) as LookupRecord[]).find((record) => {
    if (typeof record.id !== "string") {
      return false;
    }

    const name = typeof record.name === "string" ? record.name : "";
    const slug = typeof record.slug === "string" ? record.slug : "";
    const normalizedName = normalizeServiceValue(name);
    const normalizedSlug = normalizeServiceValue(slug);

    if (table === "districts") {
      return normalizedName === requestedValue || normalizedSlug === requestedValue;
    }

    return (
      normalizedName === requestedValue ||
      normalizedSlug === requestedValue ||
      normalizedName.includes(requestedValue) ||
      requestedValue.includes(normalizedName)
    );
  });

  return typeof matchingRecord?.id === "string" ? matchingRecord.id : null;
}

async function countEligibleEmergencyProviders(
  supabase: SupabaseClient<Database>,
  categoryId: string,
  districtId: string,
) {
  const baseQuery = supabase
    .from("providers")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .eq("is_approved", true);
  const { count: exactDistrictCount, error: exactDistrictError } = await baseQuery.eq(
    "district_id",
    districtId,
  );

  if (exactDistrictError) {
    warnServiceRequestError("Eligible emergency provider exact count failed.", exactDistrictError);
    return 0;
  }

  if (exactDistrictCount && exactDistrictCount > 0) {
    return exactDistrictCount;
  }

  const { count: sameCategoryCount, error: sameCategoryError } = await supabase
    .from("providers")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .eq("is_approved", true);

  if (sameCategoryError) {
    warnServiceRequestError("Eligible emergency provider fallback count failed.", sameCategoryError);
    return 0;
  }

  return sameCategoryCount ?? 0;
}

function isMissingResponseTimeColumn(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as { code?: unknown; details?: unknown; message?: unknown };
  const errorText = [record.code, record.details, record.message]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLocaleLowerCase("tr");

  return errorText.includes("column") && errorText.includes("response_time_minutes");
}

export async function getRequestFormInsights(): Promise<RequestFormInsights> {
  if (!isSupabaseServerConfigured) {
    return emptyRequestFormInsights;
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return emptyRequestFormInsights;
  }

  let { data, error } = await supabase
    .from("providers")
    .select(
      "response_time_minutes, category:service_categories(name, slug), district:districts(name, slug)",
    )
    .eq("is_active", true)
    .eq("is_approved", true);

  if (error && isMissingResponseTimeColumn(error)) {
    const fallbackResult = await supabase
      .from("providers")
      .select("category:service_categories(name, slug), district:districts(name, slug)")
      .eq("is_active", true)
      .eq("is_approved", true);

    data = fallbackResult.data as typeof data;
    error = fallbackResult.error;
  }

  if (error) {
    handleServiceError(error, {
      logContext: "Request form insight read failed.",
      publicMessage: serviceRequestSubmitErrorMessage,
    });
    return emptyRequestFormInsights;
  }

  const providerCountByCategory: RequestFormInsights["providerCountByCategory"] = {};
  const providerCountByCategoryAndDistrict: RequestFormInsights["providerCountByCategoryAndDistrict"] = {};
  const responseTimeBuckets: Record<string, { count: number; total: number }> = {};

  ((data ?? []) as unknown as RequestFormInsightProviderRecord[]).forEach((provider) => {
    const categoryKeys = getRelationLookupKeys(provider.category);
    const districtKeys = getRelationLookupKeys(provider.district);
    const responseTime =
      typeof provider.response_time_minutes === "number" &&
      Number.isFinite(provider.response_time_minutes) &&
      provider.response_time_minutes > 0
        ? Math.round(provider.response_time_minutes)
        : null;

    categoryKeys.forEach((categoryKey) => {
      providerCountByCategory[categoryKey] = (providerCountByCategory[categoryKey] ?? 0) + 1;

      if (responseTime) {
        const bucket = responseTimeBuckets[categoryKey] ?? { count: 0, total: 0 };
        bucket.count += 1;
        bucket.total += responseTime;
        responseTimeBuckets[categoryKey] = bucket;
      }

      districtKeys.forEach((districtKey) => {
        const combinedKey = `${categoryKey}|${districtKey}`;
        providerCountByCategoryAndDistrict[combinedKey] =
          (providerCountByCategoryAndDistrict[combinedKey] ?? 0) + 1;
      });
    });
  });

  return {
    averageResponseMinutesByCategory: Object.fromEntries(
      Object.entries(responseTimeBuckets).map(([categoryKey, bucket]) => [
        categoryKey,
        Math.round(bucket.total / bucket.count),
      ]),
    ),
    providerCountByCategory,
    providerCountByCategoryAndDistrict,
    source: "supabase",
  };
}

async function buildServiceRequestInsert(
  supabase: SupabaseClient<Database>,
  userId: string,
  data: ServiceRequestInput,
): Promise<ServiceRequestInsert> {
  const serviceCategoryName = parseServiceCategoryName(data.serviceCategory);
  const [categoryId, districtId] = await Promise.all([
    findLookupId(supabase, "service_categories", serviceCategoryName),
    findLookupId(supabase, "districts", data.district),
  ]);

  if (!categoryId) {
    throw new NotFoundError("Service category lookup failed.", {
      publicMessage: "Seçtiğin hizmet kategorisi şu anda bulunamadı.",
    });
  }

  if (!districtId) {
    throw new NotFoundError("District lookup failed.", {
      publicMessage: "Seçtiğin ilçe şu anda desteklenen bölgeler arasında bulunamadı.",
    });
  }

  const budgetTag = normalizeBudgetTag(data.budgetTag);
  const urgencyType = saveUrgencyType(data.urgencyType, budgetTag);
  const emergencyPriceValidation =
    urgencyType === "emergency"
      ? validateEmergencyPrice(data.offerAmount, serviceCategoryName)
      : null;
  const emergencyRequest =
    urgencyType === "emergency"
      ? createEmergencyMatchRequest({
          approximateLocation: data.approximateLocation,
          budgetTag: "acil-hizmet",
          confirmationCode: generateJobConfirmationCode(),
          district: data.district,
          notes: data.shortDescription,
          offerAmount: emergencyPriceValidation?.price ?? data.offerAmount,
          paymentPreference: data.paymentPreference,
          service: serviceCategoryName,
          timePreference: "bugun",
        })
      : null;
  const emergencyAddress = [data.district.trim(), data.approximateLocation?.trim()]
    .filter(Boolean)
    .join(" - ");
  const offeredPrice =
    urgencyType === "emergency"
      ? emergencyRequest?.offeredPrice ?? null
      : parseOfferedPrice(data.offerAmount);
  const paymentPreference =
    urgencyType === "emergency"
      ? emergencyRequest?.paymentPreference ?? null
      : savePaymentPreference(data.paymentPreference);
  const budgetValue =
    urgencyType === "emergency"
      ? offeredPrice
        ? String(offeredPrice)
        : emergencyRequest?.budgetTag ?? "acil-hizmet"
      : budgetTag ?? null;

  if (urgencyType === "emergency") {
    if (!emergencyRequest?.query.category) {
      throw new ValidationError("Emergency service category is required.", {
        publicMessage: "Acil hizmet için hizmet seçimi zorunludur.",
      });
    }

    if (!emergencyRequest.query.district) {
      throw new ValidationError("Emergency district is required.", {
        publicMessage: "Acil hizmet için ilçe seçimi zorunludur.",
      });
    }

    if (
      !emergencyPriceValidation?.ok ||
      typeof offeredPrice !== "number" ||
      !Number.isFinite(offeredPrice) ||
      offeredPrice <= 0
    ) {
      throw new ValidationError("Emergency offered price is required.", {
        publicMessage:
          emergencyPriceValidation?.message ?? "Acil hizmet için tahmini teklif seçimi zorunludur.",
      });
    }

    if (!emergencyRequest.paymentPreference) {
      throw new ValidationError("Emergency payment preference is required.", {
        publicMessage: "Acil hizmet için ödeme tercihi zorunludur.",
      });
    }

    if (!emergencyRequest.confirmationCode) {
      throw new ValidationError("Emergency confirmation code is required.", {
        publicMessage: serviceRequestSubmitErrorMessage,
      });
    }
  }

  return {
    user_id: userId,
    category_id: categoryId,
    district_id: districtId,
    address:
      urgencyType === "emergency"
        ? data.fullAddress.trim() || emergencyAddress || "Acil hizmet konumu"
        : data.fullAddress.trim(),
    urgency: urgencyType === "emergency" ? "urgent" : mapUrgencyLevel(data.urgencyLevel),
    urgency_type: urgencyType,
    budget: budgetValue,
    budget_tag: emergencyRequest?.budgetTag ?? budgetTag ?? null,
    offered_price: offeredPrice,
    payment_method: paymentPreference,
    payment_preference: paymentPreference,
    confirmation_code: emergencyRequest?.confirmationCode ?? generateJobConfirmationCode(),
    estimated_arrival_text: emergencyRequest?.estimatedArrivalText ?? null,
    approximate_location: emergencyRequest?.approximateLocation ?? null,
    preferred_date: data.preferredDate.trim() || (urgencyType === "emergency" ? getTodayDateInput() : null),
    preferred_time: urgencyType === "emergency" ? null : parsePreferredTime(data.preferredTimeRange),
    description: createRequestDescription(data),
    emergency_status:
      urgencyType === "emergency" ? SERVICE_REQUEST_STATUSES.pending : null,
    status: SERVICE_REQUEST_STATUSES.pending,
  };
}

export async function createServiceRequest(
  data: ServiceRequestInput,
  authenticatedUserId: string,
): Promise<ServiceRequestSubmitResult> {
  const validationResult = validateServiceRequestInput(data);

  if (!validationResult.ok) {
    throw new ValidationError("Service request validation failed.", {
      publicMessage: validationResult.message,
    });
  }

  const requestData = validationResult.data;
  const supabase = createServiceRequestClient();

  if (!supabase) {
    throw new DatabaseError("Supabase client is not configured.", {
      publicMessage: serviceRequestSubmitErrorMessage,
    });
  }

  if (!authenticatedUserId.trim()) {
    throw new AuthError("Service request requires an authenticated user.", {
      publicMessage: serviceRequestLoginRequiredMessage,
    });
  }

  const user = await getCurrentUser();

  if (!user || user.id !== authenticatedUserId) {
    throw new AuthError("Service request authenticated user mismatch.", {
      publicMessage: serviceRequestLoginRequiredMessage,
    });
  }

  await ensureProfileForUser(supabase, user, {
    fullName: requestData.fullName,
    phone: requestData.phoneNumber,
    preserveExistingPhone: true,
  });

  const insertPayload = await buildServiceRequestInsert(supabase, user.id, requestData);
  const activeDuplicateStatuses = [
    SERVICE_REQUEST_STATUSES.pending,
    SERVICE_REQUEST_STATUSES.assigned,
    SERVICE_REQUEST_STATUSES.accepted,
    SERVICE_REQUEST_STATUSES.inProgress,
    LEGACY_SERVICE_REQUEST_STATUSES.yeni,
    LEGACY_SERVICE_REQUEST_STATUSES.inceleniyor,
    LEGACY_SERVICE_REQUEST_STATUSES.ustayaYonlendirildi,
    LEGACY_SERVICE_REQUEST_STATUSES.onTheWay,
  ];

  await assertServiceRequestRateLimit(supabase, user.id);

  // Anti-spam duplicate request check for active requests in the same category and district.
  const { data: existingRequest, error: duplicateCheckError } = await supabase
    .from("service_requests")
    .select("id")
    .eq("user_id", user.id)
    .eq("category_id", insertPayload.category_id)
    .eq("district_id", insertPayload.district_id)
    .eq("urgency_type", insertPayload.urgency_type ?? "standard")
    .in("status", activeDuplicateStatuses)
    .limit(1)
    .maybeSingle();

  if (duplicateCheckError) {
    throw handleServiceError(duplicateCheckError, {
      logContext: "Service request duplicate check failed.",
      publicMessage: serviceRequestSubmitErrorMessage,
    });
  }

  if (existingRequest?.id) {
    throw new ValidationError("Duplicate service request detected.", {
      publicMessage: "Bu alanda halihazırda yeni bir talebiniz bulunuyor.",
    });
  }

  const { data: insertedRequest, error } = await supabase
    .from("service_requests")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error) {
    throw handleServiceError(error, {
      logContext: "Service request Supabase insert failed.",
      payloadKeys: Object.keys(insertPayload),
      publicMessage: serviceRequestSubmitErrorMessage,
      tableName: "service_requests",
    });
  }

  const record = insertedRequest as LookupRecord | null;
  const requestId = typeof record?.id === "string" ? record.id : null;
  logInfo("Service request inserted.", {
    categoryId: insertPayload.category_id,
    districtId: insertPayload.district_id,
    hasOfferedPrice: typeof insertPayload.offered_price === "number",
    hasPaymentPreference: Boolean(insertPayload.payment_preference),
    status: insertPayload.status,
    urgencyType: insertPayload.urgency_type ?? "standard",
  });

  await writeAuditLog(
    {
      action: "service_request.created",
      actorUserId: user.id,
      entityId: requestId,
      entityType: "service_request",
      metadata: {
        categoryId: insertPayload.category_id,
        districtId: insertPayload.district_id,
        status: insertPayload.status,
        urgencyType: insertPayload.urgency_type ?? "standard",
      },
    },
    supabase,
  );

  const requestCode = createLiveRequestCode(requestId);
  const eligibleProviderCount =
    insertPayload.urgency_type === "emergency"
      ? await countEligibleEmergencyProviders(
          supabase,
          insertPayload.category_id,
          insertPayload.district_id,
        )
      : undefined;

  await notifyServiceRequestCreated({
    eligibleProviderCount,
    requestCode,
    requestId,
  });

  if (insertPayload.urgency_type === "emergency") {
    await notifyEmergencyRequestDispatched({
      eligibleProviderCount,
      notificationChannels: ["provider_dashboard", "push", "sms", "whatsapp"],
      requestCode,
      requestId,
    });
  }

  const submitResult: ServiceRequestSubmitResult = {
    confirmationCode: insertPayload.confirmation_code ?? null,
    emergencyStatus: insertPayload.emergency_status ?? null,
    estimatedArrivalText: insertPayload.estimated_arrival_text ?? null,
    notificationMessage:
      insertPayload.urgency_type === "emergency"
        ? eligibleProviderCount && eligibleProviderCount > 0
          ? `${eligibleProviderCount} uygun ustaya bildirim gönderildi.`
          : "Uygun ustalara bildirim gönderildi."
        : null,
    offeredPrice: insertPayload.offered_price ?? null,
    paymentPreference: insertPayload.payment_preference ?? null,
    providerCountNotified: eligibleProviderCount ?? null,
    requestCode,
    requestId,
    urgencyType: insertPayload.urgency_type ?? "standard",
  };
  const response = createServiceSuccess(submitResult);

  return response.data ?? submitResult;
}

export async function createAuthenticatedServiceRequest(
  data: ServiceRequestInput,
  serverAuthContext?: ServerAuthContext,
): Promise<ServiceRequestSubmitResult> {
  const validationResult = validateServiceRequestInput(data);

  if (!validationResult.ok) {
    throw new ValidationError("Service request validation failed.", {
      publicMessage: validationResult.message,
    });
  }

  const requestData = validationResult.data;
  const authContext = serverAuthContext ?? await getServerAuthContext();

  if (!authContext.supabase) {
    throw new DatabaseError("Supabase client is not configured.", {
      publicMessage: serviceRequestSubmitErrorMessage,
    });
  }

  if (!authContext.user) {
    throw new AuthError("Service request requires an authenticated user.", {
      publicMessage: serviceRequestLoginRequiredMessage,
    });
  }

  await ensureProfileForUser(authContext.supabase, authContext.user, {
    fullName: requestData.fullName,
    phone: requestData.phoneNumber,
    preserveExistingPhone: true,
  });

  const insertPayload = await buildServiceRequestInsert(
    authContext.supabase,
    authContext.user.id,
    requestData,
  );
  const activeDuplicateStatuses = [
    SERVICE_REQUEST_STATUSES.pending,
    SERVICE_REQUEST_STATUSES.assigned,
    SERVICE_REQUEST_STATUSES.accepted,
    SERVICE_REQUEST_STATUSES.inProgress,
    LEGACY_SERVICE_REQUEST_STATUSES.yeni,
    LEGACY_SERVICE_REQUEST_STATUSES.inceleniyor,
    LEGACY_SERVICE_REQUEST_STATUSES.ustayaYonlendirildi,
    LEGACY_SERVICE_REQUEST_STATUSES.onTheWay,
  ];

  await assertServiceRequestRateLimit(authContext.supabase, authContext.user.id);

  const { data: existingRequest, error: duplicateCheckError } = await authContext.supabase
    .from("service_requests")
    .select("id")
    .eq("user_id", authContext.user.id)
    .eq("category_id", insertPayload.category_id)
    .eq("district_id", insertPayload.district_id)
    .eq("urgency_type", insertPayload.urgency_type ?? "standard")
    .in("status", activeDuplicateStatuses)
    .limit(1)
    .maybeSingle();

  if (duplicateCheckError) {
    throw handleServiceError(duplicateCheckError, {
      logContext: "Service request duplicate check failed.",
      publicMessage: serviceRequestSubmitErrorMessage,
    });
  }

  if (existingRequest?.id) {
    throw new ValidationError("Duplicate service request detected.", {
      publicMessage: "Bu alanda halihazırda yeni bir talebiniz bulunuyor.",
    });
  }

  const { data: insertedRequest, error } = await authContext.supabase
    .from("service_requests")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error) {
    throw handleServiceError(error, {
      logContext: "Service request Supabase insert failed.",
      payloadKeys: Object.keys(insertPayload),
      publicMessage: serviceRequestSubmitErrorMessage,
      tableName: "service_requests",
    });
  }

  const record = insertedRequest as LookupRecord | null;
  const requestId = typeof record?.id === "string" ? record.id : null;
  logInfo("Service request inserted.", {
    categoryId: insertPayload.category_id,
    districtId: insertPayload.district_id,
    hasOfferedPrice: typeof insertPayload.offered_price === "number",
    hasPaymentPreference: Boolean(insertPayload.payment_preference),
    status: insertPayload.status,
    urgencyType: insertPayload.urgency_type ?? "standard",
  });

  await writeAuditLog(
    {
      action: "service_request.created",
      actorUserId: authContext.user.id,
      entityId: requestId,
      entityType: "service_request",
      metadata: {
        categoryId: insertPayload.category_id,
        districtId: insertPayload.district_id,
        status: insertPayload.status,
        urgencyType: insertPayload.urgency_type ?? "standard",
      },
    },
    authContext.supabase,
  );

  const requestCode = createLiveRequestCode(requestId);
  const eligibleProviderCount =
    insertPayload.urgency_type === "emergency"
      ? await countEligibleEmergencyProviders(
          authContext.supabase,
          insertPayload.category_id,
          insertPayload.district_id,
        )
      : undefined;

  await notifyServiceRequestCreated({
    eligibleProviderCount,
    requestCode,
    requestId,
  });

  if (insertPayload.urgency_type === "emergency") {
    await notifyEmergencyRequestDispatched({
      eligibleProviderCount,
      notificationChannels: ["provider_dashboard", "push", "sms", "whatsapp"],
      requestCode,
      requestId,
    });
  }

  const submitResult: ServiceRequestSubmitResult = {
    confirmationCode: insertPayload.confirmation_code ?? null,
    emergencyStatus: insertPayload.emergency_status ?? null,
    estimatedArrivalText: insertPayload.estimated_arrival_text ?? null,
    notificationMessage:
      insertPayload.urgency_type === "emergency"
        ? eligibleProviderCount && eligibleProviderCount > 0
          ? `${eligibleProviderCount} uygun ustaya bildirim gönderildi.`
          : "Uygun ustalara bildirim gönderildi."
        : null,
    offeredPrice: insertPayload.offered_price ?? null,
    paymentPreference: insertPayload.payment_preference ?? null,
    providerCountNotified: eligibleProviderCount ?? null,
    requestCode,
    requestId,
    urgencyType: insertPayload.urgency_type ?? "standard",
  };
  const response = createServiceSuccess(submitResult);

  return response.data ?? submitResult;
}

export async function createEmergencyRequest(
  data: ServiceRequestInput,
  authenticatedUserId: string,
): Promise<ServiceRequestSubmitResult> {
  return createServiceRequest(
    {
      ...data,
      budgetTag: "acil-hizmet",
      preferredDate: data.preferredDate || getTodayDateInput(),
      preferredTimeRange: data.preferredTimeRange || "En kısa süre",
      urgencyLevel: "Acil",
      urgencyType: "emergency",
    },
    authenticatedUserId,
  );
}

export async function cancelAuthenticatedServiceRequest(
  requestId: string,
  serverAuthContext?: ServerAuthContext,
) {
  const normalizedRequestId = requestId.trim();

  if (!isUuid(normalizedRequestId)) {
    throw new ValidationError("Invalid service request id for cancellation.", {
      publicMessage: "Geçersiz işlem.",
    });
  }

  const authContext = serverAuthContext ?? await getServerAuthContext();

  if (!authContext.supabase) {
    throw new DatabaseError("Supabase client is not configured.", {
      publicMessage: serviceRequestSubmitErrorMessage,
    });
  }

  if (!authContext.user) {
    throw new AuthError("Service request cancellation requires an authenticated user.", {
      publicMessage: serviceRequestLoginRequiredMessage,
    });
  }

  const { data: request, error: lookupError } = await authContext.supabase
    .from("service_requests")
    .select("id, user_id, status, urgency_type")
    .eq("id", normalizedRequestId)
    .eq("user_id", authContext.user.id)
    .maybeSingle();

  if (lookupError) {
    throw handleServiceError(lookupError, {
      logContext: "Customer service request cancellation lookup failed.",
      publicMessage: serviceRequestSubmitErrorMessage,
      tableName: "service_requests",
    });
  }

  if (!request) {
    throw new NotFoundError("Service request was not found for cancellation.", {
      publicMessage: "Kayıt bulunamadı.",
    });
  }

  if (!canTransitionServiceRequest(request.status, SERVICE_REQUEST_STATUSES.cancelled)) {
    throw new ValidationError("Service request cannot be cancelled from current status.", {
      publicMessage: "Geçersiz işlem.",
    });
  }

  const updatePayload: ServiceRequestUpdate = {
    status: SERVICE_REQUEST_STATUSES.cancelled,
    updated_at: new Date().toISOString(),
  };

  if (request.urgency_type === "emergency") {
    updatePayload.emergency_status = EMERGENCY_REQUEST_STATUSES.cancelled;
  }

  const { data: updatedRequest, error: updateError } = await authContext.supabase
    .from("service_requests")
    .update(updatePayload)
    .eq("id", normalizedRequestId)
    .eq("user_id", authContext.user.id)
    .eq("status", request.status)
    .select("id")
    .maybeSingle();

  if (updateError) {
    throw handleServiceError(updateError, {
      logContext: "Customer service request cancellation update failed.",
      payloadKeys: Object.keys(updatePayload),
      publicMessage: serviceRequestSubmitErrorMessage,
      tableName: "service_requests",
    });
  }

  if (!updatedRequest) {
    throw new NotFoundError("Service request cancellation update returned no row.", {
      publicMessage: "Kayıt bulunamadı.",
    });
  }

  await writeAuditLog(
    {
      action: "service_request.cancelled",
      actorUserId: authContext.user.id,
      entityId: normalizedRequestId,
      entityType: "service_request",
      metadata: {
        previousStatus: request.status,
        status: SERVICE_REQUEST_STATUSES.cancelled,
      },
    },
    authContext.supabase,
  );

  return true;
}

export async function getMatchedProviders(requestId: string) {
  const supabase = createServiceRequestClient();

  if (!supabase) {
    return [];
  }

  // 1. Get request's category_id and district_id
  const { data: requestData, error: requestError } = await supabase
    .from("service_requests")
    .select("category_id, district_id")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError || !requestData) {
    return [];
  }

  // 2. Fetch matched providers
  const { data, error } = await supabase
    .from("providers")
    .select("id, name, phone, whatsapp, rating, average_price_min, average_price_max, experience_years, district_id")
    .eq("category_id", requestData.category_id)
    .eq("is_active", true)
    .eq("is_approved", true);

  if (error) {
    warnServiceRequestError("Matched providers read failed.", error);
    return [];
  }

  const providers = data ?? [];

  // Sort providers so the ones in the exact same district come first
  return providers.sort((a, b) => {
    if (a.district_id === requestData.district_id && b.district_id !== requestData.district_id) return -1;
    if (a.district_id !== requestData.district_id && b.district_id === requestData.district_id) return 1;
    return Number(b.rating ?? 0) - Number(a.rating ?? 0);
  });
}

export async function assignProviderToRequest(
  requestId: string,
  providerId: string,
  supabaseClient?: SupabaseClient<Database>,
) {
  if (!isUuid(requestId) || !isUuid(providerId)) {
    throw new ValidationError("Invalid request or provider id.", {
      publicMessage: "Talep veya usta kimliği geçerli değil.",
    });
  }

  const supabase = supabaseClient ?? createServiceRequestClient();

  if (!supabase) {
    throw new DatabaseError("Supabase client is not configured.", {
      publicMessage: "Atama işlemi tamamlanamadı.",
    });
  }

  const [
    { data: request, error: requestError },
    { data: provider, error: providerError },
  ] = await Promise.all([
    supabase
      .from("service_requests")
      .select("id, category_id, status")
      .eq("id", requestId)
      .maybeSingle(),
    supabase
      .from("providers")
      .select("id, category_id, is_active, is_approved")
      .eq("id", providerId)
      .maybeSingle(),
  ]);

  if (requestError) {
    throw handleServiceError(requestError, {
      logContext: "Assign provider request lookup failed.",
      publicMessage: "Atama işlemi tamamlanamadı.",
    });
  }

  if (providerError) {
    throw handleServiceError(providerError, {
      logContext: "Assign provider eligibility lookup failed.",
      publicMessage: "Atama işlemi tamamlanamadı.",
    });
  }

  if (!request) {
    throw new NotFoundError("Service request was not found for assignment.", {
      publicMessage: "Atanacak talep bulunamadı.",
    });
  }

  if (!provider?.is_active || !provider?.is_approved) {
    throw new ValidationError("Provider is not eligible for request assignment.", {
      publicMessage: "Seçilen usta bu talep için uygun değil.",
    });
  }

  if (request.category_id !== provider.category_id) {
    throw new ValidationError("Provider category does not match request.", {
      publicMessage: "Seçilen usta bu hizmet kategorisi için uygun değil.",
    });
  }

  if (!canTransitionServiceRequest(request.status, SERVICE_REQUEST_STATUSES.assigned)) {
    throw new ValidationError("Service request cannot be assigned from current status.", {
      publicMessage: "Bu durumdaki talebe usta atanamaz.",
    });
  }

  const { data, error } = await supabase
    .from("service_requests")
    .update({ 
      accepted_at: null,
      accepted_provider_id: null,
      assigned_provider_id: providerId,
      status: SERVICE_REQUEST_STATUSES.assigned,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", request.status)
    .select("id")
    .maybeSingle();

  if (error) {
    throw handleServiceError(error, {
      logContext: "Assign provider to request failed.",
      publicMessage: "Atama işlemi Supabase üzerinde başarısız oldu.",
    });
  }

  if (!data) {
    throw new NotFoundError("Service request assignment update returned no row.", {
      publicMessage: "Atanacak talep bulunamadı.",
    });
  }

  return true;
}

export async function assignProviderToEmergencyRequest(
  requestId: string,
  providerId: string,
  supabaseClient?: SupabaseClient<Database>,
) {
  if (!isUuid(requestId) || !isUuid(providerId)) {
    throw new ValidationError("Invalid emergency request or provider id.", {
      publicMessage: "Talep veya usta kimliği geçerli değil.",
    });
  }

  const supabase = supabaseClient ?? createServiceRequestClient();

  if (!supabase) {
    throw new DatabaseError("Supabase client is not configured.", {
      publicMessage: "Acil atama işlemi tamamlanamadı.",
    });
  }

  const [
    { data: request, error: requestError },
    { data: provider, error: providerError },
  ] = await Promise.all([
    supabase
      .from("service_requests")
      .select("category_id, district_id, status, urgency_type, assigned_provider_id, confirmation_code, estimated_arrival_text, districts(name)")
      .eq("id", requestId)
      .maybeSingle(),
    supabase
      .from("providers")
      .select("category_id, district_id, is_active, is_approved")
      .eq("id", providerId)
      .maybeSingle(),
  ]);

  if (requestError) {
    throw handleServiceError(requestError, {
      logContext: "Emergency assignment request lookup failed.",
      publicMessage: "Acil atama işlemi tamamlanamadı.",
    });
  }

  if (providerError) {
    throw handleServiceError(providerError, {
      logContext: "Emergency assignment provider lookup failed.",
      publicMessage: "Acil atama işlemi tamamlanamadı.",
    });
  }

  if (
    !request ||
    !provider?.is_active ||
    !provider?.is_approved ||
    request.category_id !== provider.category_id
  ) {
    throw new ValidationError("Provider is not eligible for emergency request.", {
      publicMessage: "Seçilen usta bu acil talep için uygun değil.",
    });
  }

  if (request.urgency_type !== "emergency") {
    throw new ValidationError("Request is not an emergency request.", {
      publicMessage: "Bu talep acil akışta değil.",
    });
  }

  if (!canTransitionServiceRequest(request.status, SERVICE_REQUEST_STATUSES.assigned)) {
    throw new ValidationError("Emergency request cannot be assigned from current status.", {
      publicMessage: "Bu durumdaki acil talebe usta atanamaz.",
    });
  }

  if (
    request.assigned_provider_id === providerId &&
    normalizeServiceRequestStatus(request.status) === SERVICE_REQUEST_STATUSES.assigned
  ) {
    return true;
  }

  const requestWithDistrict = request as typeof request & ServiceRequestDistrictRelation;
  const districtName = getRelationName(requestWithDistrict.districts, "");
  const updatePayload: ServiceRequestUpdate = {
    accepted_at: null,
    accepted_provider_id: null,
    assigned_provider_id: providerId,
    confirmation_code: request.confirmation_code ?? generateJobConfirmationCode(),
    emergency_status: EMERGENCY_REQUEST_STATUSES.assigned,
    estimated_arrival_text:
      request.estimated_arrival_text ??
      calculateEstimatedArrivalText({
        district: typeof districtName === "string" ? districtName : null,
        urgencyType: "emergency",
      }),
    status: SERVICE_REQUEST_STATUSES.assigned,
    updated_at: new Date().toISOString(),
    urgency_type: "emergency",
  };

  const { data, error } = await supabase
    .from("service_requests")
    .update(updatePayload)
    .eq("id", requestId)
    .eq("status", request.status)
    .select("id")
    .maybeSingle();

  if (error) {
    throw handleServiceError(error, {
      logContext: "Assign provider to emergency request failed.",
      publicMessage: "Acil atama işlemi Supabase üzerinde başarısız oldu.",
    });
  }

  if (!data) {
    throw new ValidationError("Emergency request assignment update was not applied.", {
      publicMessage: "Acil talep bu sırada güncellendi. Lütfen sayfayı yenileyip tekrar dene.",
    });
  }

  return true;
}

export async function getProviderAssignedRequests(
  providerId: string,
  supabaseClient?: SupabaseClient<Database>,
) {
  if (!isUuid(providerId)) {
    return [];
  }

  const supabase = supabaseClient ?? createServiceRequestClient();

  if (!supabase) {
    return [];
  }

  const requestSelect = `
      id,
      urgency,
      urgency_type,
      budget,
      budget_tag,
      offered_price,
      payment_preference,
      confirmation_code,
      estimated_arrival_text,
      approximate_location,
      emergency_status,
      accepted_provider_id,
      assigned_provider_id,
      status,
      address,
      preferred_date,
      preferred_time,
      description,
      accepted_at,
      created_at,
      service_categories(name),
      districts(name),
      profiles(full_name, phone)
    `;
  const { data: assignedRequests, error } = await supabase
    .from("service_requests")
    .select(requestSelect)
    .eq("assigned_provider_id", providerId)
    .order("created_at", { ascending: false });

  if (error) {
    warnServiceRequestError("Provider assigned requests read failed.", error);
    return [];
  }

  const requestsById = new Map<string, ProviderAssignedRequestRecord>();

  ((assignedRequests ?? []) as unknown as ProviderAssignedRequestRecord[]).forEach((request) => {
    requestsById.set(request.id, request);
  });

  return Array.from(requestsById.values())
    .sort(
      (firstRequest, secondRequest) =>
        new Date(secondRequest.created_at).getTime() - new Date(firstRequest.created_at).getTime(),
    )
    .map((request) => {
      const profile = getProfileRelation(request.profiles);

      return {
    id: request.id,
    status: request.status,
    urgency: request.urgency,
    urgencyType: request.urgency_type ?? "standard",
    budget: request.budget ?? null,
    budgetTag: request.budget_tag ?? null,
    offeredPrice: request.offered_price ?? null,
    paymentPreference: request.payment_preference ?? null,
    confirmationCode: request.confirmation_code ?? null,
    estimatedArrivalText: request.estimated_arrival_text ?? null,
    approximateLocation: request.approximate_location ?? null,
    emergencyStatus: request.emergency_status ?? null,
    acceptedProviderId: request.accepted_provider_id ?? null,
    assignedProviderId: request.assigned_provider_id ?? null,
    acceptedAt: request.accepted_at ?? null,
    address: request.address ?? "",
    preferredDate: request.preferred_date,
    preferredTime: request.preferred_time,
    createdAt: request.created_at,
    category: getRelationName(request.service_categories, "Belirtilmedi"),
    district: getRelationName(request.districts, "Belirtilmedi"),
    customerName: profile?.full_name?.trim() || "Müşteri",
    phone: profile?.phone?.trim() || "Belirtilmedi",
    description: request.description ?? "",
      };
    });
}

export async function acceptEmergencyRequest(
  requestId: string,
  providerId: string,
  supabaseClient?: SupabaseClient<Database>,
) {
  const supabase = supabaseClient ?? createServiceRequestClient();

  if (!supabase) {
    return false;
  }

  const { data: provider, error: providerError } = await supabase
    .from("providers")
    .select("id, category_id, district_id, is_active, is_approved")
    .eq("id", providerId)
    .maybeSingle();

  if (providerError || !provider?.is_active || !provider?.is_approved) {
    warnServiceRequestError("Emergency provider eligibility lookup failed.", providerError);
    return false;
  }

  const { data: currentRequest, error: requestError } = await supabase
    .from("service_requests")
    .select("id, status, urgency_type, category_id, district_id, assigned_provider_id, districts(name)")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError || !currentRequest) {
    warnServiceRequestError("Emergency request accept lookup failed.", requestError);
    return false;
  }

  if (currentRequest.urgency_type !== "emergency") {
    return false;
  }

  if (currentRequest.category_id !== provider.category_id) {
    return false;
  }

  const isAssignedToProvider = currentRequest.assigned_provider_id === providerId;
  const isOpenNearbyRequest =
    !currentRequest.assigned_provider_id && currentRequest.district_id === provider.district_id;

  if (!isAssignedToProvider && !isOpenNearbyRequest) {
    return false;
  }

  const currentRequestStatus = String(currentRequest.status);

  if (
    normalizeServiceRequestStatus(currentRequestStatus) !== SERVICE_REQUEST_STATUSES.assigned
  ) {
    return false;
  }

  const acceptedAt = new Date().toISOString();
  const currentRequestWithDistrict =
    currentRequest as typeof currentRequest & ServiceRequestDistrictRelation;
  const districtName = getRelationName(currentRequestWithDistrict.districts, "");
  const updatePayload: ServiceRequestUpdate = {
    accepted_at: acceptedAt,
    accepted_provider_id: providerId,
    assigned_provider_id: providerId,
    confirmation_code: generateJobConfirmationCode(),
    emergency_status: EMERGENCY_REQUEST_STATUSES.accepted,
    estimated_arrival_text: calculateEstimatedArrivalText({
      acceptedAt,
      district: typeof districtName === "string" ? districtName : null,
      urgencyType: "emergency",
    }),
    status: SERVICE_REQUEST_STATUSES.accepted,
    updated_at: acceptedAt,
  };
  let updateQuery = supabase
    .from("service_requests")
    .update(updatePayload)
    .eq("id", requestId)
    .eq("status", currentRequest.status);

  updateQuery = currentRequest.assigned_provider_id
    ? updateQuery.eq("assigned_provider_id", providerId)
    : updateQuery.is("assigned_provider_id", null);

  const { data, error } = await updateQuery.select("id").maybeSingle();

  if (error || !data) {
    warnServiceRequestError("Emergency request accept update failed.", error);
    return false;
  }

  return true;
}

export async function respondToProviderAssignedRequest(
  requestId: string,
  providerId: string,
  action: ProviderAssignedRequestAction,
  supabaseClient?: SupabaseClient<Database>,
): Promise<ProviderAssignedRequestActionResult> {
  if (!isUuid(requestId) || !isUuid(providerId)) {
    return createProviderAssignedRequestActionResult("request-invalid-id", false, action);
  }

  const supabase = supabaseClient ?? createServiceRequestClient();

  if (!supabase) {
    return createProviderAssignedRequestActionResult("supabase-not-configured", false, action);
  }

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return createProviderAssignedRequestActionResult("provider-not-authorized", false, action);
    }

    const [
      { data: provider, error: providerError },
      { data: currentRequest, error: currentRequestError },
    ] = await Promise.all([
      supabase
        .from("providers")
        .select("id, user_id, is_active, is_approved")
        .eq("id", providerId)
        .maybeSingle(),
      supabase
        .from("service_requests")
        .select(
          "id, user_id, status, urgency_type, assigned_provider_id, confirmation_code, estimated_arrival_text, districts(name)",
        )
        .eq("id", requestId)
        .eq("assigned_provider_id", providerId)
        .maybeSingle(),
    ]);

    if (providerError) {
      logProviderRequestActionFailure({
        action,
        context: "provider eligibility lookup",
        error: providerError,
        providerId,
        requestId,
      });
      return createProviderAssignedRequestActionResult("provider-not-authorized", false, action);
    }

    if (!provider?.is_active || !provider?.is_approved || provider.user_id !== user.id) {
      return createProviderAssignedRequestActionResult("provider-not-authorized", false, action);
    }

    if (currentRequestError) {
      logProviderRequestActionFailure({
        action,
        context: "assigned request lookup",
        error: currentRequestError,
        providerId,
        requestId,
      });
      return createProviderAssignedRequestActionResult("request-action-failed", false, action);
    }

    if (!currentRequest) {
      return createProviderAssignedRequestActionResult("request-not-assigned", false, action);
    }

    const currentStatus = String(currentRequest.status);

    if (!isProviderResponseWaitingStatus(currentStatus)) {
      return createProviderAssignedRequestActionResult("request-invalid-status", false, action);
    }

    const now = new Date().toISOString();
    const isEmergencyRequest = currentRequest.urgency_type === "emergency";
    const currentRequestWithDistrict =
      currentRequest as typeof currentRequest & ServiceRequestDistrictRelation;
    const districtName = getRelationName(currentRequestWithDistrict.districts, "");
    const updatePayload: ServiceRequestUpdate =
      action === "accept"
        ? {
            accepted_at: now,
            accepted_provider_id: providerId,
            status: SERVICE_REQUEST_STATUSES.accepted,
            updated_at: now,
          }
        : {
            accepted_at: null,
            accepted_provider_id: null,
            status: SERVICE_REQUEST_STATUSES.rejected,
            updated_at: now,
          };

    if (isEmergencyRequest && action === "accept") {
      updatePayload.confirmation_code =
        currentRequest.confirmation_code ?? generateJobConfirmationCode();
      updatePayload.emergency_status = EMERGENCY_REQUEST_STATUSES.accepted;
      updatePayload.estimated_arrival_text =
        currentRequest.estimated_arrival_text ??
        calculateEstimatedArrivalText({
          acceptedAt: now,
          district: typeof districtName === "string" ? districtName : null,
          urgencyType: "emergency",
        });
    }

    if (isEmergencyRequest && action === "reject") {
      updatePayload.emergency_status = EMERGENCY_REQUEST_STATUSES.rejected;
    }

    const { data: updatedRequest, error: updateError } = await supabase
      .from("service_requests")
      .update(updatePayload)
      .eq("id", requestId)
      .eq("assigned_provider_id", providerId)
      .eq("status", currentStatus as ServiceRequestRow["status"])
      .select("id")
      .maybeSingle();

    if (updateError) {
      logProviderRequestActionFailure({
        action,
        context: "status update",
        error: updateError,
        providerId,
        requestId,
      });
      return createProviderAssignedRequestActionResult("request-action-failed", false, action);
    }

    if (!updatedRequest) {
      return createProviderAssignedRequestActionResult("request-not-assigned", false, action);
    }

    await insertProviderRequestAuditLog({
      action:
        action === "accept"
          ? "service_request.accepted"
          : "service_request.rejected",
      actorUserId: provider.user_id ?? null,
      metadata: {
        action,
        providerId,
        previousStatus: currentStatus,
        status:
          action === "accept"
            ? SERVICE_REQUEST_STATUSES.accepted
            : SERVICE_REQUEST_STATUSES.rejected,
      },
      requestId,
      supabase,
    });

    const notificationMetadata = {
      actorUserId: provider.user_id ?? null,
      customerUserId: currentRequest.user_id,
      providerId,
      providerUserId: provider.user_id ?? null,
      requestCode: createLiveRequestCode(requestId),
      requestId,
      supabaseClient: supabase,
    };

    if (action === "accept") {
      await notifyServiceRequestAccepted(notificationMetadata);
      return createProviderAssignedRequestActionResult("request-accepted", true, action);
    }

    await notifyServiceRequestRejected(notificationMetadata);
    return createProviderAssignedRequestActionResult("request-rejected", true, action);
  } catch (error) {
    logProviderRequestActionFailure({
      action,
      context: "unexpected action",
      error,
      providerId,
      requestId,
    });

    return createProviderAssignedRequestActionResult("request-action-failed", false, action);
  }
}

export async function updateProviderAssignedRequestStatus(
  requestId: string,
  providerId: string,
  status: Exclude<
    ServiceRequestStatus,
    typeof SERVICE_REQUEST_STATUSES.pending | typeof SERVICE_REQUEST_STATUSES.assigned
  >,
  supabaseClient?: SupabaseClient<Database>,
) {
  if (!isUuid(requestId) || !isUuid(providerId)) {
    return false;
  }

  const supabase = supabaseClient ?? createServiceRequestClient();

  if (!supabase) {
    return false;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return false;
  }

  const normalizedStatus = normalizeServiceRequestStatus(status);

  if (!normalizedStatus) {
    return false;
  }

  if (
    normalizedStatus === SERVICE_REQUEST_STATUSES.accepted ||
    normalizedStatus === SERVICE_REQUEST_STATUSES.rejected
  ) {
    const result = await respondToProviderAssignedRequest(
      requestId,
      providerId,
      normalizedStatus === SERVICE_REQUEST_STATUSES.accepted ? "accept" : "reject",
      supabase,
    );

    return result.ok;
  }

  const [
    { data: provider, error: providerError },
    { data: currentRequest, error: currentRequestError },
  ] = await Promise.all([
    supabase
      .from("providers")
      .select("id, user_id, is_active, is_approved")
      .eq("id", providerId)
      .maybeSingle(),
    supabase
      .from("service_requests")
      .select("id, status, urgency_type, districts(name)")
      .eq("id", requestId)
      .eq("assigned_provider_id", providerId)
      .maybeSingle(),
  ]);

  if (providerError || !provider?.is_active || !provider?.is_approved || provider.user_id !== user.id) {
    warnServiceRequestError("Provider eligibility lookup failed.", providerError);
    return false;
  }

  if (currentRequestError || !currentRequest) {
    warnServiceRequestError("Provider assigned request lookup failed.", currentRequestError);
    return false;
  }

  const currentRequestWithDistrict =
    currentRequest as typeof currentRequest & ServiceRequestDistrictRelation;
  const districtName = getRelationName(currentRequestWithDistrict.districts, "");
  const isEmergencyRequest = currentRequest.urgency_type === "emergency";
  const acceptedAt =
    normalizedStatus === SERVICE_REQUEST_STATUSES.inProgress
      ? new Date().toISOString()
      : null;
  const updatePayload: ServiceRequestUpdate = {
    status: normalizedStatus,
    updated_at: new Date().toISOString(),
  };
  const currentRequestStatus = String(currentRequest.status);

  if (!canTransitionServiceRequest(currentRequestStatus, normalizedStatus)) {
    return false;
  }

  if (isEmergencyRequest && acceptedAt) {
    updatePayload.accepted_at = acceptedAt;
    updatePayload.accepted_provider_id = providerId;
    updatePayload.emergency_status = EMERGENCY_REQUEST_STATUSES.onTheWay;
    updatePayload.estimated_arrival_text = calculateEstimatedArrivalText({
      acceptedAt,
      district: typeof districtName === "string" ? districtName : null,
      urgencyType: "emergency",
    });
  }

  if (
    isEmergencyRequest &&
    (normalizedStatus === SERVICE_REQUEST_STATUSES.completed ||
      normalizedStatus === SERVICE_REQUEST_STATUSES.cancelled)
  ) {
    updatePayload.emergency_status = normalizedStatus as ServiceRequestUpdate["emergency_status"];
  }

  const { data: updatedRequest, error } = await supabase
    .from("service_requests")
    .update(updatePayload)
    .eq("id", requestId)
    .eq("assigned_provider_id", providerId)
    .eq("status", currentRequest.status)
    .select("id")
    .maybeSingle();

  if (error) {
    warnServiceRequestError("Provider request status update failed.", error);
    return false;
  }

  if (!updatedRequest) {
    return false;
  }

  const auditAction =
    normalizedStatus === SERVICE_REQUEST_STATUSES.completed
      ? "service_request.completed"
      : normalizedStatus === SERVICE_REQUEST_STATUSES.cancelled
        ? "service_request.cancelled"
        : "service_request.in_progress";

  await insertProviderRequestAuditLog({
    action: auditAction,
    actorUserId: provider.user_id ?? null,
    metadata: {
      providerId,
      previousStatus: currentRequestStatus,
      status: normalizedStatus,
    },
    requestId,
    supabase,
  });

  if (normalizedStatus === SERVICE_REQUEST_STATUSES.completed) {
    await createPaymentTrackingForCompletedRequest({
      actorUserId: provider.user_id ?? null,
      requestId,
      supabase,
    });
  }

  return true;
}

