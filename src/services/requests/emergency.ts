"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AuthError,
  DatabaseError,
  handleServiceError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { SERVICE_REQUEST_STATUSES } from "@/lib/constants/statuses";
import { normalizeServiceValue } from "@/lib/constants/services";
import type { Database } from "@/lib/supabase/types";
import {
  createEmergencyMatchRequest as buildEmergencyMatchRequest,
  validateEmergencyPrice,
} from "@/services/matching";
import { getServerAuthContext, type ServerAuthContext } from "@/services/auth/server";
import { saveEmergencyPaymentPreference } from "@/services/payments";
import { notifyEmergencyRequestDispatched } from "@/services/notifications";
import { createServiceSuccess } from "@/services/serviceResponse";
import type { ServiceRequestInput, ServiceRequestSubmitResult } from "@/types/request";

type LookupTable = "service_categories" | "districts";
type LookupRecord = {
  id?: unknown;
  name?: unknown;
  slug?: unknown;
};
type ServiceRequestInsert = Database["public"]["Tables"]["service_requests"]["Insert"];

const emergencyRequestSubmitErrorMessage =
  "Acil talep şu anda oluşturulamadı. Lütfen bilgilerini kontrol edip tekrar dene.";

const emergencyRequestLoginRequiredMessage =
  "Talep oluşturmak için giriş yapmalısın.";

function createRequestCode(id: unknown) {
  if (typeof id !== "string" || !id.trim()) {
    return `FW-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  return `FW-${id.slice(0, 8).toLocaleUpperCase("tr")}`;
}

export async function generateJobConfirmationCode(): Promise<string> {
  return `FW-${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function calculateSuggestedPrice(category: string): Promise<number> {
  const emergencyRequest = buildEmergencyMatchRequest({
    budgetTag: "acil-hizmet",
    service: category,
    timePreference: "bugun",
  });

  return emergencyRequest.offeredPrice ?? 500;
}

function parseServiceCategoryName(serviceCategory: string) {
  const categoryParts = serviceCategory.split(" - ");
  return categoryParts[categoryParts.length - 1]?.trim() ?? serviceCategory.trim();
}

async function findLookupId(
  supabase: SupabaseClient<Database>,
  table: LookupTable,
  displayName: string,
) {
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
      logContext: `Emergency request ${table} lookup failed.`,
      publicMessage: emergencyRequestSubmitErrorMessage,
    });
  }

  const requestedValue = normalizeServiceValue(requestedName);
  const record = ((data ?? []) as LookupRecord[]).find((item) => {
    const name = typeof item.name === "string" ? item.name : "";
    const slug = typeof item.slug === "string" ? item.slug : "";
    const normalizedName = normalizeServiceValue(name);
    const normalizedSlug = normalizeServiceValue(slug);

    return (
      normalizedName === requestedValue ||
      normalizedSlug === requestedValue ||
      (table === "service_categories" &&
        (normalizedName.includes(requestedValue) || requestedValue.includes(normalizedName)))
    );
  });

  return typeof record?.id === "string" ? record.id : null;
}

function getTodayDateInput() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createEmergencyDescription(input: ServiceRequestInput, offeredPrice: number) {
  return [
    `Acil hizmet talebi: ${parseServiceCategoryName(input.serviceCategory)}`,
    `Teklif tutarı: ${new Intl.NumberFormat("tr-TR", {
      maximumFractionDigits: 0,
    }).format(offeredPrice)} TL`,
    input.district.trim() ? `İlçe: ${input.district.trim()}` : "",
    input.approximateLocation?.trim()
      ? `Yaklaşık konum: ${input.approximateLocation.trim()}`
      : "",
    input.shortDescription.trim(),
  ]
    .filter(Boolean)
    .join("\n");
}

async function createEmergencyInsert(
  supabase: SupabaseClient<Database>,
  input: ServiceRequestInput,
  userId: string,
): Promise<ServiceRequestInsert> {
  const serviceName = parseServiceCategoryName(input.serviceCategory);
  const [categoryId, districtId] = await Promise.all([
    findLookupId(supabase, "service_categories", serviceName),
    findLookupId(supabase, "districts", input.district),
  ]);

  if (!categoryId) {
    throw new NotFoundError("Emergency service category lookup failed.", {
      publicMessage: "Acil hizmet için seçtiğin kategori bulunamadı.",
    });
  }

  if (!districtId) {
    throw new NotFoundError("Emergency district lookup failed.", {
      publicMessage: "Acil hizmet için seçtiğin ilçe desteklenen bölgeler arasında bulunamadı.",
    });
  }

  const priceValidation = validateEmergencyPrice(
    input.offerAmount ?? input.offeredPrice ?? null,
    serviceName,
  );

  if (!priceValidation.ok || typeof priceValidation.price !== "number") {
    throw new ValidationError("Emergency offered price is required.", {
      publicMessage: priceValidation.message ?? "Acil hizmet için teklif tutarı zorunludur.",
    });
  }

  const paymentPreference = saveEmergencyPaymentPreference(input.paymentPreference);

  if (!paymentPreference) {
    throw new ValidationError("Emergency payment preference is required.", {
      publicMessage: "Acil hizmet için ödeme tercihi zorunludur.",
    });
  }

  const confirmationCode = await generateJobConfirmationCode();
  const emergencyRequest = buildEmergencyMatchRequest({
    approximateLocation: input.approximateLocation,
    budgetTag: "acil-hizmet",
    confirmationCode,
    district: input.district,
    notes: input.shortDescription,
    offerAmount: priceValidation.price,
    paymentPreference,
    service: serviceName,
    timePreference: "bugun",
  });
  const emergencyAddress = [input.district.trim(), input.approximateLocation?.trim()]
    .filter(Boolean)
    .join(" - ");

  return {
    user_id: userId,
    category_id: categoryId,
    district_id: districtId,
    address: input.fullAddress.trim() || emergencyAddress || "Acil hizmet konumu",
    urgency: "urgent",
    urgency_type: "emergency",
    budget_tag: "acil-hizmet",
    offered_price: priceValidation.price,
    payment_preference: paymentPreference,
    confirmation_code: confirmationCode,
    estimated_arrival_text: emergencyRequest.estimatedArrivalText,
    approximate_location: emergencyRequest.approximateLocation,
    preferred_date: input.preferredDate.trim() || getTodayDateInput(),
    preferred_time: null,
    description: createEmergencyDescription(input, priceValidation.price),
    emergency_status: SERVICE_REQUEST_STATUSES.pending,
    status: SERVICE_REQUEST_STATUSES.pending,
  };
}

async function countEligibleEmergencyProviders(
  supabase: SupabaseClient<Database>,
  categoryId: string,
  districtId: string,
) {
  const { count: exactDistrictCount, error: exactDistrictError } = await supabase
    .from("providers")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId)
    .eq("district_id", districtId)
    .eq("is_active", true)
    .eq("is_approved", true);

  if (exactDistrictError) {
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
    return 0;
  }

  return sameCategoryCount ?? 0;
}

export async function createEmergencyMatchRequest(
  input: ServiceRequestInput,
  serverAuthContext?: ServerAuthContext,
): Promise<ServiceRequestSubmitResult> {
  const authContext = serverAuthContext ?? await getServerAuthContext();
  const supabase = authContext.supabase;

  if (!supabase) {
    throw new DatabaseError("Supabase client is not configured.", {
      publicMessage: emergencyRequestSubmitErrorMessage,
    });
  }

  if (!authContext.user) {
    throw new AuthError("Emergency request requires an authenticated user.", {
      publicMessage: emergencyRequestLoginRequiredMessage,
    });
  }

  const insertPayload = await createEmergencyInsert(supabase, input, authContext.user.id);

  if (insertPayload.category_id && insertPayload.district_id) {
    const duplicateStatuses = [
      SERVICE_REQUEST_STATUSES.pending,
      SERVICE_REQUEST_STATUSES.yeni,
      SERVICE_REQUEST_STATUSES.inceleniyor,
      SERVICE_REQUEST_STATUSES.ustayaYonlendirildi,
    ];
    const { data: duplicateRequest, error: duplicateError } = await supabase
      .from("service_requests")
      .select("id")
      .eq("user_id", authContext.user.id)
      .eq("category_id", insertPayload.category_id)
      .eq("district_id", insertPayload.district_id)
      .eq("urgency_type", "emergency")
      .in("status", duplicateStatuses)
      .limit(1)
      .maybeSingle();

    if (duplicateError) {
      throw handleServiceError(duplicateError, {
        logContext: "Emergency request duplicate lookup failed.",
        publicMessage: emergencyRequestSubmitErrorMessage,
      });
    }

    if (duplicateRequest) {
      throw new ValidationError("Duplicate active emergency request.", {
        publicMessage:
          "Aynı kategori ve ilçe için açık bir acil talebin zaten var.",
      });
    }
  }

  const { data, error } = await supabase
    .from("service_requests")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error) {
    throw handleServiceError(error, {
      logContext: "Emergency request insert failed.",
      payloadKeys: Object.keys(insertPayload),
      publicMessage: emergencyRequestSubmitErrorMessage,
      tableName: "service_requests",
    });
  }

  const requestCode = createRequestCode(data?.id);
  const eligibleProviderCount = await countEligibleEmergencyProviders(
    supabase,
    insertPayload.category_id,
    insertPayload.district_id,
  );

  await notifyEmergencyRequestDispatched({
    eligibleProviderCount,
    notificationChannels: ["provider_dashboard", "push", "sms", "whatsapp"],
    requestCode,
    requestId: typeof data?.id === "string" ? data.id : null,
  });

  const result: ServiceRequestSubmitResult = {
    confirmationCode: insertPayload.confirmation_code ?? null,
    emergencyStatus: insertPayload.emergency_status ?? null,
    estimatedArrivalText: insertPayload.estimated_arrival_text ?? null,
      notificationMessage: "Uygun ustalara bildirim gönderildi.",
      offeredPrice: insertPayload.offered_price ?? null,
      paymentPreference: insertPayload.payment_preference ?? null,
      providerCountNotified: eligibleProviderCount,
      requestCode,
    requestId: typeof data?.id === "string" ? data.id : null,
    urgencyType: "emergency",
  };
  const response = createServiceSuccess(result);

  return response.data ?? result;
}
