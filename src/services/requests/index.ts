import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AuthError,
  DatabaseError,
  handleServiceError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { SERVICE_REQUEST_STATUSES } from "@/lib/constants/statuses";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { validateServiceRequestInput } from "@/lib/validations";
import { notifyServiceRequestCreated } from "@/services/notifications";
import { createServiceSuccess } from "@/services/serviceResponse";
import type {
  ServiceRequestInput,
  ServiceRequestSubmitResult,
  ServiceRequestUrgency,
} from "@/types/request";

type LookupTable = "service_categories" | "districts";

type LookupRecord = {
  id?: unknown;
};

type ServiceRequestInsert = Database["public"]["Tables"]["service_requests"]["Insert"];

export type {
  ServiceRequestInput,
  ServiceRequestSubmitResult,
  ServiceRequestUrgency,
} from "@/types/request";

export const serviceRequestLoginRequiredMessage =
  "Hizmet talebi oluşturmak için giriş yapmalısın.";

export const serviceRequestSubmitErrorMessage =
  "Talebin şu anda gönderilemedi. Lütfen bilgilerini kontrol edip tekrar dene.";

function createLiveRequestCode(id: unknown) {
  if (typeof id !== "string" || !id.trim()) {
    return `FW-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  return `FW-${id.slice(0, 8).toLocaleUpperCase("tr")}`;
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

function createRequestDescription(data: ServiceRequestInput) {
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

  return {
    user_id: userId,
    category_id: categoryId,
    district_id: districtId,
    address: data.fullAddress.trim(),
    urgency: mapUrgencyLevel(data.urgencyLevel),
    preferred_date: data.preferredDate.trim() || null,
    preferred_time: parsePreferredTime(data.preferredTimeRange),
    description: createRequestDescription(data),
    status: SERVICE_REQUEST_STATUSES.yeni,
  };
}

export async function submitServiceRequest(
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

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    warnServiceRequestError("Service request session check failed.", sessionError);
    throw new AuthError("Service request session check failed.", {
      cause: sessionError,
      publicMessage: serviceRequestLoginRequiredMessage,
    });
  }

  if (!session?.user.id) {
    throw new AuthError("Service request session is missing.", {
      publicMessage: serviceRequestLoginRequiredMessage,
    });
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    warnServiceRequestError("Service request user check failed.", authError);
    throw new AuthError("Service request user check failed.", {
      cause: authError,
      publicMessage: serviceRequestLoginRequiredMessage,
    });
  }

  if (!user || user.id !== authenticatedUserId || user.id !== session.user.id) {
    throw new AuthError("Service request authenticated user mismatch.", {
      publicMessage: serviceRequestLoginRequiredMessage,
    });
  }

  const insertPayload = await buildServiceRequestInsert(supabase, user.id, requestData);
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

  await notifyServiceRequestCreated({
    requestCode,
    requestId: typeof record?.id === "string" ? record.id : null,
  });

  const submitResult: ServiceRequestSubmitResult = {
    requestCode,
  };
  const response = createServiceSuccess(submitResult);

  return response.data ?? submitResult;
}
