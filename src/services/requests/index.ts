import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AuthError,
  DatabaseError,
  handleServiceError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import {
  SERVICE_REQUEST_STATUSES,
  normalizeServiceRequestStatus,
} from "@/lib/constants/statuses";
import { normalizeServiceValue } from "@/lib/constants/services";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { validateServiceRequestInput } from "@/lib/validations";
import {
  createEmergencyMatchRequest,
  isEmergencyBudgetTag,
  normalizeBudgetTag,
  validateEmergencyPrice,
} from "@/services/matching";
import { getPaymentPreferenceLabel } from "@/services/payments";
import { calculateEstimatedArrivalText } from "@/services/tracking";
import { authAccessMessages, getCurrentUser } from "@/services/auth";
import {
  notifyEmergencyRequestDispatched,
  notifyServiceRequestCreated,
} from "@/services/notifications";
import { createServiceSuccess } from "@/services/serviceResponse";
import type {
  ServiceRequestPaymentPreference,
  ServiceRequestInput,
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

type ServiceRequestInsert = Database["public"]["Tables"]["service_requests"]["Insert"];
type ServiceRequestUpdate = Database["public"]["Tables"]["service_requests"]["Update"];

export type {
  ServiceRequestPaymentPreference,
  ServiceRequestInput,
  ServiceRequestSubmitResult,
  ServiceRequestUrgency,
  ServiceRequestUrgencyType,
} from "@/types/request";

export const serviceRequestLoginRequiredMessage =
  authAccessMessages.loginRequired;

export const serviceRequestSubmitErrorMessage =
  "Talebin şu anda gönderilemedi. Lütfen bilgilerini kontrol edip tekrar dene.";

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
    warnServiceRequestError(`Service request ${table} lookup failed.`, error);
    return null;
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
      publicMessage: "Seçtiğin hizmet kategorisi şu anda sistem tarafında bulunamadı.",
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
  const offeredPrice = emergencyRequest?.offeredPrice ?? null;

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
    budget_tag: emergencyRequest?.budgetTag ?? budgetTag ?? null,
    offered_price: urgencyType === "emergency" ? offeredPrice : null,
    payment_preference: emergencyRequest?.paymentPreference ?? null,
    confirmation_code: emergencyRequest?.confirmationCode ?? null,
    estimated_arrival_text: emergencyRequest?.estimatedArrivalText ?? null,
    approximate_location: emergencyRequest?.approximateLocation ?? null,
    preferred_date: data.preferredDate.trim() || (urgencyType === "emergency" ? getTodayDateInput() : null),
    preferred_time: urgencyType === "emergency" ? null : parsePreferredTime(data.preferredTimeRange),
    description: createRequestDescription(data),
    emergency_status:
      urgencyType === "emergency" ? SERVICE_REQUEST_STATUSES.pending : null,
    status:
      urgencyType === "emergency"
        ? SERVICE_REQUEST_STATUSES.pending
        : SERVICE_REQUEST_STATUSES.yeni,
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

  const insertPayload = await buildServiceRequestInsert(supabase, user.id, requestData);

  // Anti-spam duplicate request check (same user, category, and district within pending status)
  const { data: existingRequest, error: duplicateCheckError } = await supabase
    .from("service_requests")
    .select("id")
    .eq("user_id", user.id)
    .eq("category_id", insertPayload.category_id)
    .eq("district_id", insertPayload.district_id)
    .in("status", [SERVICE_REQUEST_STATUSES.yeni, SERVICE_REQUEST_STATUSES.pending])
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
      publicMessage: serviceRequestSubmitErrorMessage,
    });
  }

  const record = insertedRequest as LookupRecord | null;
  const requestCode = createLiveRequestCode(record?.id);
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
    requestId: typeof record?.id === "string" ? record.id : null,
  });

  if (insertPayload.urgency_type === "emergency") {
    await notifyEmergencyRequestDispatched({
      eligibleProviderCount,
      notificationChannels: ["provider_dashboard", "push", "sms", "whatsapp"],
      requestCode,
      requestId: typeof record?.id === "string" ? record.id : null,
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
    requestId: typeof record?.id === "string" ? record.id : null,
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

  const terminalStatuses = new Set<string>([
    SERVICE_REQUEST_STATUSES.accepted,
    SERVICE_REQUEST_STATUSES.completed,
    SERVICE_REQUEST_STATUSES.cancelled,
    SERVICE_REQUEST_STATUSES.tamamlandi,
    SERVICE_REQUEST_STATUSES.iptal,
  ]);

  if (terminalStatuses.has(request.status)) {
    throw new ValidationError("Service request cannot be assigned from current status.", {
      publicMessage: "Bu durumdaki talebe usta atanamaz.",
    });
  }

  const { data, error } = await supabase
    .from("service_requests")
    .update({ 
      assigned_provider_id: providerId,
      status: SERVICE_REQUEST_STATUSES.ustayaYonlendirildi 
    })
    .eq("id", requestId)
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

  const assignableStatuses = [
    SERVICE_REQUEST_STATUSES.pending,
    SERVICE_REQUEST_STATUSES.yeni,
    SERVICE_REQUEST_STATUSES.inceleniyor,
    SERVICE_REQUEST_STATUSES.ustayaYonlendirildi,
  ];
  const assignableStatusSet = new Set<string>(assignableStatuses);

  if (!assignableStatusSet.has(request.status)) {
    throw new ValidationError("Emergency request cannot be assigned from current status.", {
      publicMessage: "Bu durumdaki acil talebe usta atanamaz.",
    });
  }

  if (
    request.assigned_provider_id === providerId &&
    request.status === SERVICE_REQUEST_STATUSES.ustayaYonlendirildi
  ) {
    return true;
  }

  const districtRelation = (request as any).districts;
  const districtName = Array.isArray(districtRelation)
    ? districtRelation[0]?.name
    : districtRelation?.name;
  const updatePayload: ServiceRequestUpdate = {
    assigned_provider_id: providerId,
    accepted_provider_id: null,
    confirmation_code: request.confirmation_code ?? generateJobConfirmationCode(),
    emergency_status: SERVICE_REQUEST_STATUSES.pending,
    estimated_arrival_text:
      request.estimated_arrival_text ??
      calculateEstimatedArrivalText({
        district: typeof districtName === "string" ? districtName : null,
        urgencyType: "emergency",
      }),
    status: SERVICE_REQUEST_STATUSES.ustayaYonlendirildi,
    urgency_type: "emergency",
  };

  const { data, error } = await supabase
    .from("service_requests")
    .update(updatePayload)
    .eq("id", requestId)
    .in("status", assignableStatuses)
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
  const supabase = supabaseClient ?? createServiceRequestClient();

  if (!supabase) {
    return [];
  }

  const requestSelect = `
      id,
      urgency,
      urgency_type,
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

  const { data: provider, error: providerLookupError } = await supabase
    .from("providers")
    .select("category_id, district_id, is_active, is_approved")
    .eq("id", providerId)
    .maybeSingle();

  if (providerLookupError) {
    warnServiceRequestError("Provider assigned request provider lookup failed.", providerLookupError);
    return [];
  }

  const providerCategoryId =
    provider?.is_active && provider?.is_approved ? provider.category_id : null;
  const providerDistrictId =
    provider?.is_active && provider?.is_approved ? provider.district_id : null;
  const canSeeEligibleEmergencyRequests = Boolean(providerCategoryId && providerDistrictId);
  const { data: eligibleEmergencyRequests, error: eligibleEmergencyRequestsError } = canSeeEligibleEmergencyRequests
    ? await supabase
        .from("service_requests")
        .select(requestSelect)
        .eq("urgency_type", "emergency")
        .eq("status", SERVICE_REQUEST_STATUSES.pending)
        .eq("category_id", providerCategoryId as string)
        .eq("district_id", providerDistrictId as string)
        .is("assigned_provider_id", null)
        .order("created_at", { ascending: false })
    : { data: [], error: null };

  if (eligibleEmergencyRequestsError) {
    warnServiceRequestError(
      "Eligible emergency provider request read failed.",
      eligibleEmergencyRequestsError,
    );
  }

  const requestsById = new Map<string, any>();

  [...(assignedRequests ?? []), ...(eligibleEmergencyRequests ?? [])].forEach((request: any) => {
    requestsById.set(request.id, request);
  });

  return Array.from(requestsById.values())
    .sort(
      (firstRequest, secondRequest) =>
        new Date(secondRequest.created_at).getTime() - new Date(firstRequest.created_at).getTime(),
    )
    .map((request: any) => ({
    id: request.id,
    status: request.status,
    urgency: request.urgency,
    urgencyType: request.urgency_type ?? "standard",
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
    category: Array.isArray(request.service_categories) ? request.service_categories[0]?.name : request.service_categories?.name ?? "Belirtilmedi",
    district: Array.isArray(request.districts) ? request.districts[0]?.name : request.districts?.name ?? "Belirtilmedi",
    customerName: Array.isArray(request.profiles) ? request.profiles[0]?.full_name : request.profiles?.full_name ?? "Müşteri",
    phone: Array.isArray(request.profiles) ? request.profiles[0]?.phone : request.profiles?.phone ?? "Belirtilmedi",
    description: request.description ?? "",
  }));
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

  if (
    currentRequest.status !== SERVICE_REQUEST_STATUSES.pending &&
    currentRequest.status !== SERVICE_REQUEST_STATUSES.ustayaYonlendirildi
  ) {
    return false;
  }

  const acceptedAt = new Date().toISOString();
  const districtRelation = (currentRequest as any).districts;
  const districtName = Array.isArray(districtRelation)
    ? districtRelation[0]?.name
    : districtRelation?.name;
  const updatePayload: ServiceRequestUpdate = {
    accepted_at: acceptedAt,
    accepted_provider_id: providerId,
    assigned_provider_id: providerId,
    confirmation_code: generateJobConfirmationCode(),
    emergency_status: SERVICE_REQUEST_STATUSES.accepted,
    estimated_arrival_text: calculateEstimatedArrivalText({
      acceptedAt,
      district: typeof districtName === "string" ? districtName : null,
      urgencyType: "emergency",
    }),
    status: SERVICE_REQUEST_STATUSES.accepted,
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

export async function updateProviderAssignedRequestStatus(
  requestId: string,
  providerId: string,
  status: "accepted" | "on_the_way" | "completed" | "cancelled" | "tamamlandi" | "iptal",
  supabaseClient?: SupabaseClient<Database>,
) {
  const supabase = supabaseClient ?? createServiceRequestClient();

  if (!supabase) {
    return false;
  }

  const normalizedStatus = normalizeServiceRequestStatus(status);

  if (!normalizedStatus) {
    return false;
  }

  if (normalizedStatus === SERVICE_REQUEST_STATUSES.accepted) {
    return acceptEmergencyRequest(requestId, providerId, supabase);
  }

  const { data: currentRequest, error: currentRequestError } = await supabase
    .from("service_requests")
    .select("id, status, urgency_type, districts(name)")
    .eq("id", requestId)
    .eq("assigned_provider_id", providerId)
    .maybeSingle();

  if (currentRequestError || !currentRequest) {
    warnServiceRequestError("Provider assigned request lookup failed.", currentRequestError);
    return false;
  }

  const districtRelation = (currentRequest as any).districts;
  const districtName = Array.isArray(districtRelation)
    ? districtRelation[0]?.name
    : districtRelation?.name;
  const isEmergencyRequest = currentRequest.urgency_type === "emergency";
  const acceptedAt =
    normalizedStatus === SERVICE_REQUEST_STATUSES.onTheWay
      ? new Date().toISOString()
      : null;
  const updatePayload: ServiceRequestUpdate = {
    status: normalizedStatus,
  };

  if (isEmergencyRequest && acceptedAt) {
    updatePayload.accepted_at = acceptedAt;
    updatePayload.accepted_provider_id = providerId;
    updatePayload.emergency_status = normalizedStatus as ServiceRequestUpdate["emergency_status"];
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

  const { error } = await supabase
    .from("service_requests")
    .update(updatePayload)
    .eq("id", requestId)
    .eq("assigned_provider_id", providerId);

  if (error) {
    warnServiceRequestError("Provider request status update failed.", error);
    return false;
  }

  return true;
}

