"use server";

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
} from "@/lib/constants/statuses";
import { normalizeServiceValue } from "@/lib/constants/services";
import type { Database } from "@/lib/supabase/types";
import {
  createEmergencyMatchRequest as buildEmergencyMatchRequest,
  matchAndNotifyEligibleProviders,
  validateEmergencyPrice,
} from "@/services/matching";
import { getServerAuthContext, type ServerAuthContext } from "@/services/auth/server";
import { ensureProfileForUser } from "@/services/auth/profiles";
import { saveEmergencyPaymentPreference } from "@/services/payments";
import { createServiceSuccess } from "@/services/serviceResponse";
import { writeAuditLog } from "@/services/audit";
import { validateServiceRequestInput } from "@/lib/validations";
import { checkRateLimitWithRedis } from "@/lib/security/rateLimitRedis";
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

const emergencyRequestRateLimitMessage =
  "Kısa sürede çok sayıda talep oluşturdun. Lütfen biraz sonra tekrar dene.";

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
    budget: String(priceValidation.price),
    budget_tag: "acil-hizmet",
    offered_price: priceValidation.price,
    payment_method: paymentPreference,
    payment_preference: paymentPreference,
    confirmation_code: confirmationCode,
    estimated_arrival_text: emergencyRequest.estimatedArrivalText,
    approximate_location: emergencyRequest.approximateLocation,
    preferred_date: input.preferredDate.trim() || getTodayDateInput(),
    preferred_time: null,
    description: createEmergencyDescription(input, priceValidation.price),
    emergency_status: EMERGENCY_REQUEST_STATUSES.pending,
    status: SERVICE_REQUEST_STATUSES.pending,
  };
}

async function assertEmergencyRequestRateLimit(
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
    throw new ValidationError("Emergency request create rate limit exceeded.", {
      publicMessage: emergencyRequestRateLimitMessage,
      statusCode: 429,
    });
  }
}

export async function createEmergencyMatchRequest(
  input: ServiceRequestInput,
  serverAuthContext?: ServerAuthContext,
): Promise<ServiceRequestSubmitResult> {
  const validationResult = validateServiceRequestInput({
    ...input,
    budgetTag: "acil-hizmet",
    urgencyType: "emergency",
  });

  if (!validationResult.ok) {
    throw new ValidationError("Emergency request validation failed.", {
      publicMessage: validationResult.message,
    });
  }

  const requestInput = validationResult.data;
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

  await ensureProfileForUser(supabase, authContext.user, {
    fullName: requestInput.fullName,
    phone: requestInput.phoneNumber,
    preserveExistingPhone: true,
  });

  const insertPayload = await createEmergencyInsert(supabase, requestInput, authContext.user.id);

  await assertEmergencyRequestRateLimit(supabase, authContext.user.id);

  if (insertPayload.category_id && insertPayload.district_id) {
    const duplicateStatuses = [
      SERVICE_REQUEST_STATUSES.pending,
      SERVICE_REQUEST_STATUSES.assigned,
      SERVICE_REQUEST_STATUSES.accepted,
      SERVICE_REQUEST_STATUSES.inProgress,
      LEGACY_SERVICE_REQUEST_STATUSES.yeni,
      LEGACY_SERVICE_REQUEST_STATUSES.inceleniyor,
      LEGACY_SERVICE_REQUEST_STATUSES.ustayaYonlendirildi,
      LEGACY_SERVICE_REQUEST_STATUSES.onTheWay,
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
  const requestId = typeof data?.id === "string" ? data.id : null;
  const eligibleProviderCount = requestId
    ? await matchAndNotifyEligibleProviders(supabase, {
        categoryId: insertPayload.category_id,
        districtId: insertPayload.district_id,
        requestId,
        urgencyType: "emergency",
      })
    : 0;

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
        urgencyType: "emergency",
      },
    },
    supabase,
  );

  const result: ServiceRequestSubmitResult = {
    confirmationCode: insertPayload.confirmation_code ?? null,
    emergencyStatus: insertPayload.emergency_status ?? null,
    estimatedArrivalText: insertPayload.estimated_arrival_text ?? null,
      notificationMessage:
        eligibleProviderCount > 0
          ? `${eligibleProviderCount} uygun ustaya bildirim gönderildi.`
          : "Şu anda bu bölgede uygun usta bulunamadı, talebiniz admin tarafından değerlendirilecek.",
      offeredPrice: insertPayload.offered_price ?? null,
      paymentPreference: insertPayload.payment_preference ?? null,
      providerCountNotified: eligibleProviderCount,
      requestCode,
    requestId,
    urgencyType: "emergency",
  };
  const response = createServiceSuccess(result);

  return response.data ?? result;
}
