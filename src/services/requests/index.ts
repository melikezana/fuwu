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
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { validateServiceRequestInput } from "@/lib/validations";
import {
  createEmergencyMatchRequest,
  isEmergencyBudgetTag,
  normalizeBudgetTag,
} from "@/services/matching";
import { getPaymentPreferenceLabel } from "@/services/payments";
import { calculateEstimatedArrivalText } from "@/services/tracking";
import { authAccessMessages, getCurrentUser } from "@/services/auth";
import { notifyServiceRequestCreated } from "@/services/notifications";
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

function createRequestDescription(data: ServiceRequestInput) {
  const paymentPreferenceLabel = getPaymentPreferenceLabel(data.paymentPreference);
  const emergencyDetails =
    saveUrgencyType(data.urgencyType, data.budgetTag) === "emergency"
      ? [
          data.offeredPrice ? `Teklif tutarı: ₺${data.offeredPrice}` : "",
          paymentPreferenceLabel !== "Belirtilmedi"
            ? `Ödeme yöntemi tercihi: ${paymentPreferenceLabel}`
            : "",
          data.approximateLocation?.trim()
            ? `Yaklaşık konum: ${data.approximateLocation.trim()}`
            : "",
        ]
      : [];

  return [
    data.shortDescription.trim(),
    ...emergencyDetails,
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
  if (!displayName.trim()) {
    return null;
  }

  const { data, error } = await supabase
    .from(table)
    .select("id")
    .ilike("name", displayName.trim())
    .limit(1)
    .maybeSingle();

  if (error) {
    warnServiceRequestError(`Service request ${table} lookup failed.`, error);
    return null;
  }

  const record = data as LookupRecord | null;
  return typeof record?.id === "string" ? record.id : null;
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
  const emergencyRequest =
    urgencyType === "emergency"
      ? createEmergencyMatchRequest({
          approximateLocation: data.approximateLocation,
          budgetTag: "acil-hizmet",
          confirmationCode: generateJobConfirmationCode(),
          district: data.district,
          notes: data.shortDescription,
          offerAmount: data.offeredPrice ? String(data.offeredPrice) : "",
          paymentPreference: data.paymentPreference,
          service: serviceCategoryName,
          timePreference: "bugun",
        })
      : null;

  return {
    user_id: userId,
    category_id: categoryId,
    district_id: districtId,
    address: data.fullAddress.trim(),
    urgency: urgencyType === "emergency" ? "urgent" : mapUrgencyLevel(data.urgencyLevel),
    urgency_type: urgencyType,
    budget_tag: emergencyRequest?.budgetTag ?? budgetTag ?? null,
    payment_preference: emergencyRequest?.paymentPreference ?? null,
    confirmation_code: emergencyRequest?.confirmationCode ?? null,
    estimated_arrival_text: emergencyRequest?.estimatedArrivalText ?? null,
    approximate_location: emergencyRequest?.approximateLocation ?? null,
    preferred_date: data.preferredDate.trim() || (urgencyType === "emergency" ? getTodayDateInput() : null),
    preferred_time: parsePreferredTime(data.preferredTimeRange),
    description: createRequestDescription(data),
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
  const { data: existingRequest } = await supabase
    .from("service_requests")
    .select("id")
    .eq("user_id", user.id)
    .eq("category_id", insertPayload.category_id)
    .eq("district_id", insertPayload.district_id)
    .in("status", [SERVICE_REQUEST_STATUSES.yeni, SERVICE_REQUEST_STATUSES.pending])
    .limit(1)
    .maybeSingle();

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
      tableName: "service_requests",
      payloadKeys: Object.keys(insertPayload),
    });
  }

  const record = insertedRequest as LookupRecord | null;
  const requestCode = createLiveRequestCode(record?.id);

  await notifyServiceRequestCreated({
    requestCode,
    requestId: typeof record?.id === "string" ? record.id : null,
  });

  const submitResult: ServiceRequestSubmitResult = {
    confirmationCode: insertPayload.confirmation_code ?? undefined,
    estimatedArrivalText: insertPayload.estimated_arrival_text ?? undefined,
    paymentPreference: insertPayload.payment_preference ?? undefined,
    requestCode,
    requestId: typeof record?.id === "string" ? record.id : null,
    urgencyType: insertPayload.urgency_type ?? "standard",
  };
  const response = createServiceSuccess(submitResult);

  return response.data ?? submitResult;
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
    return 0;
  });
}

export async function assignProviderToRequest(requestId: string, providerId: string) {
  const supabase = createServiceRequestClient();

  if (!supabase) {
    throw new DatabaseError("Supabase client is not configured.", {
      publicMessage: "Atama işlemi tamamlanamadı.",
    });
  }

  const { error } = await supabase
    .from("service_requests")
    .update({ 
      assigned_provider_id: providerId,
      status: SERVICE_REQUEST_STATUSES.ustayaYonlendirildi 
    })
    .eq("id", requestId);

  if (error) {
    throw handleServiceError(error, {
      logContext: "Assign provider to request failed.",
      publicMessage: "Atama işlemi Supabase üzerinde başarısız oldu.",
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

  const { error } = await supabase
    .from("service_requests")
    .update({
      assigned_provider_id: providerId,
      status: SERVICE_REQUEST_STATUSES.ustayaYonlendirildi,
      urgency_type: "emergency",
    })
    .eq("id", requestId);

  if (error) {
    throw handleServiceError(error, {
      logContext: "Assign provider to emergency request failed.",
      publicMessage: "Acil atama işlemi Supabase üzerinde başarısız oldu.",
    });
  }

  return true;
}

export async function getProviderAssignedRequests(providerId: string) {
  const supabase = createServiceRequestClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("service_requests")
    .select(`
      id,
      urgency,
      urgency_type,
      budget_tag,
      payment_preference,
      confirmation_code,
      estimated_arrival_text,
      approximate_location,
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
    `)
    .eq("assigned_provider_id", providerId)
    .order("created_at", { ascending: false });

  if (error) {
    warnServiceRequestError("Provider assigned requests read failed.", error);
    return [];
  }

  // Format to standard UI layout similar to AdminServiceRequest
  return (data ?? []).map((request: any) => ({
    id: request.id,
    status: request.status,
    urgency: request.urgency,
    urgencyType: request.urgency_type ?? "standard",
    budgetTag: request.budget_tag ?? null,
    paymentPreference: request.payment_preference ?? null,
    confirmationCode: request.confirmation_code ?? null,
    estimatedArrivalText: request.estimated_arrival_text ?? null,
    approximateLocation: request.approximate_location ?? null,
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

export async function updateProviderAssignedRequestStatus(
  requestId: string,
  providerId: string,
  status: "accepted" | "on_the_way" | "completed" | "cancelled" | "tamamlandi" | "iptal"
) {
  const supabase = createServiceRequestClient();

  if (!supabase) {
    return false;
  }

  const normalizedStatus = normalizeServiceRequestStatus(status);

  if (!normalizedStatus) {
    return false;
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
    normalizedStatus === SERVICE_REQUEST_STATUSES.accepted ||
    normalizedStatus === SERVICE_REQUEST_STATUSES.onTheWay
      ? new Date().toISOString()
      : null;
  const updatePayload: ServiceRequestUpdate = {
    status: normalizedStatus,
  };

  if (isEmergencyRequest && acceptedAt) {
    updatePayload.accepted_at = acceptedAt;
    updatePayload.estimated_arrival_text = calculateEstimatedArrivalText({
      acceptedAt,
      district: typeof districtName === "string" ? districtName : null,
      urgencyType: "emergency",
    });
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

