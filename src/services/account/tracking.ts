import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PROVIDER_APPLICATION_STATUSES,
  isProviderApplicationStatus,
  type ProviderApplicationStatus,
} from "@/lib/constants/statuses";
import type { Database } from "@/lib/supabase/types";
import { sanitizePhone, sanitizeText } from "@/lib/validations";
import { getServerAuthContext } from "@/services/auth/server";

type AccountSupabaseClient = SupabaseClient<Database>;

type NamedRelation = {
  name: string | null;
};

type MaybeRelation = NamedRelation | NamedRelation[] | null;

type ProviderApplicationRecord = Pick<
  Database["public"]["Tables"]["provider_applications"]["Row"],
  | "created_at"
  | "experience_years"
  | "full_name"
  | "id"
  | "phone"
  | "status"
> & {
  districts: MaybeRelation;
  service_categories: MaybeRelation;
  user_id?: string | null;
};

type ServiceRequestRecord = Pick<
  Database["public"]["Tables"]["service_requests"]["Row"],
  | "budget_tag"
  | "created_at"
  | "district_id"
  | "id"
  | "offered_price"
  | "payment_preference"
  | "status"
  | "urgency_type"
> & {
  assigned_provider:
    | { name: string | null }
    | { name: string | null }[]
    | null;
  districts: MaybeRelation;
  service_categories: MaybeRelation;
};

export type AccountProviderApplication = {
  category: string;
  createdAt: string;
  district: string;
  experienceYears: number;
  fullName: string;
  id: string;
  phone: string;
  status: ProviderApplicationStatus;
};

export type AccountServiceRequest = {
  assignedProviderName: string | null;
  budgetTag: string | null;
  category: string;
  createdAt: string;
  district: string;
  id: string;
  offeredPrice: number | null;
  paymentPreference: string | null;
  status: string;
  urgencyType: string | null;
};

export type AccountTrackingData = {
  applications: AccountProviderApplication[];
  error: string | null;
  isConfigured: boolean;
  requests: AccountServiceRequest[];
  userId: string | null;
};

const accountTrackingReadError =
  "Hesap hareketlerin şu anda yüklenemedi. Lütfen tekrar dene.";

export const providerApplicationStatusLabels: Record<ProviderApplicationStatus, string> = {
  [PROVIDER_APPLICATION_STATUSES.pending]: "Değerlendirmede",
  [PROVIDER_APPLICATION_STATUSES.approved]: "Onaylandı",
  [PROVIDER_APPLICATION_STATUSES.rejected]: "Reddedildi",
};

export const providerApplicationStatusMessages: Record<ProviderApplicationStatus, string> = {
  [PROVIDER_APPLICATION_STATUSES.pending]: "Başvurunuz değerlendirmede",
  [PROVIDER_APPLICATION_STATUSES.approved]:
    "Başvurunuz onaylandı. Usta paneliniz aktif.",
  [PROVIDER_APPLICATION_STATUSES.rejected]:
    "Başvurunuz reddedildi. Bilgilerinizi güncelleyerek tekrar başvurabilirsiniz.",
};

export const noProviderApplicationMessage = "Henüz usta başvurunuz yok.";

function getRelationName(relation: MaybeRelation) {
  const record = Array.isArray(relation) ? relation[0] : relation;
  return sanitizeText(record?.name ?? "", 120) || "Belirtilmedi";
}

function getAssignedProviderName(
  relation: ServiceRequestRecord["assigned_provider"],
) {
  const record = Array.isArray(relation) ? relation[0] : relation;
  return sanitizeText(record?.name ?? "", 120) || null;
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

function mapProviderApplicationRecord(
  record: ProviderApplicationRecord,
): AccountProviderApplication | null {
  const status = sanitizeText(record.status, 40);

  if (!isProviderApplicationStatus(status)) {
    return null;
  }

  return {
    category: getRelationName(record.service_categories),
    createdAt: record.created_at,
    district: getRelationName(record.districts),
    experienceYears: Number(record.experience_years ?? 0),
    fullName: sanitizeText(record.full_name, 120) || "Belirtilmedi",
    id: record.id,
    phone: sanitizePhone(record.phone) || "Belirtilmedi",
    status,
  };
}

function mapServiceRequestRecord(record: ServiceRequestRecord): AccountServiceRequest {
  return {
    assignedProviderName: getAssignedProviderName(record.assigned_provider),
    budgetTag: record.budget_tag ? sanitizeText(record.budget_tag, 80) : null,
    category: getRelationName(record.service_categories),
    createdAt: record.created_at,
    district: getRelationName(record.districts),
    id: record.id,
    offeredPrice:
      typeof record.offered_price === "number"
        ? record.offered_price
        : record.offered_price
          ? Number(record.offered_price)
          : null,
    paymentPreference: record.payment_preference
      ? sanitizeText(record.payment_preference, 80)
      : null,
    status: sanitizeText(record.status, 80) || "pending",
    urgencyType: record.urgency_type ? sanitizeText(record.urgency_type, 80) : null,
  };
}

async function getProviderApplicationsByUserId(
  supabase: AccountSupabaseClient,
  userId: string,
) {
  return supabase
    .from("provider_applications")
    .select(
      `
        id,
        user_id,
        full_name,
        phone,
        experience_years,
        status,
        created_at,
        service_categories(name),
        districts(name)
      `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
}

async function getProviderApplicationsByPhone(
  supabase: AccountSupabaseClient,
  phones: string[],
) {
  if (phones.length === 0) {
    return { data: [], error: null };
  }

  return supabase
    .from("provider_applications")
    .select(
      `
        id,
        user_id,
        full_name,
        phone,
        experience_years,
        status,
        created_at,
        service_categories(name),
        districts(name)
      `,
    )
    .in("phone", phones)
    .order("created_at", { ascending: false });
}

async function bindProviderApplicationRecordsToUser(
  supabase: AccountSupabaseClient,
  records: ProviderApplicationRecord[],
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

async function getUserProviderApplications(
  supabase: AccountSupabaseClient,
  userId: string,
  phones: string[],
) {
  const result = await getProviderApplicationsByUserId(supabase, userId);

  if (result.error && isMissingColumn(result.error, "user_id")) {
    return getProviderApplicationsByPhone(supabase, phones);
  }

  if (result.error || (result.data ?? []).length > 0) {
    return result;
  }

  const phoneResult = await getProviderApplicationsByPhone(supabase, phones);

  if (phoneResult.error) {
    return phoneResult;
  }

  const bindError = await bindProviderApplicationRecordsToUser(
    supabase,
    (phoneResult.data ?? []) as unknown as ProviderApplicationRecord[],
  );

  if (bindError) {
    console.warn("[Fuwu] Account provider application user binding failed.", bindError);
  }

  return phoneResult;
}

async function getUserServiceRequests(
  supabase: AccountSupabaseClient,
  userId: string,
) {
  return supabase
    .from("service_requests")
    .select(
      `
        id,
        status,
        urgency_type,
        budget_tag,
        offered_price,
        payment_preference,
        created_at,
        service_categories(name),
        districts(name),
        assigned_provider:providers!service_requests_assigned_provider_id_fkey(name)
      `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
}

function getFallbackPhones(
  profilePhone: string | null | undefined,
  authPhone: string | null | undefined,
  metadata: unknown,
) {
  const metadataPhone =
    metadata && typeof metadata === "object" && "phone" in metadata
      ? (metadata as { phone?: unknown }).phone
      : null;
  const metadataPhoneNumber =
    metadata && typeof metadata === "object" && "phone_number" in metadata
      ? (metadata as { phone_number?: unknown }).phone_number
      : null;

  return Array.from(
    new Set(
      [
        profilePhone,
        authPhone,
        typeof metadataPhone === "string" ? metadataPhone : null,
        typeof metadataPhoneNumber === "string" ? metadataPhoneNumber : null,
      ]
        .map((phone) => sanitizePhone(phone ?? ""))
        .filter(Boolean),
    ),
  );
}

export async function getAccountTrackingData(): Promise<AccountTrackingData> {
  const authContext = await getServerAuthContext();

  if (!authContext.supabase || !authContext.user) {
    return {
      applications: [],
      error: authContext.error,
      isConfigured: authContext.isConfigured,
      requests: [],
      userId: null,
    };
  }

  const fallbackPhones = getFallbackPhones(
    authContext.profile?.phone,
    authContext.user.phone,
    authContext.user.user_metadata,
  );
  const [applicationsResult, requestsResult] = await Promise.all([
    getUserProviderApplications(authContext.supabase, authContext.user.id, fallbackPhones),
    getUserServiceRequests(authContext.supabase, authContext.user.id),
  ]);

  if (applicationsResult.error || requestsResult.error) {
    return {
      applications: [],
      error: accountTrackingReadError,
      isConfigured: true,
      requests: [],
      userId: authContext.user.id,
    };
  }

  return {
    applications: ((applicationsResult.data ?? []) as unknown as ProviderApplicationRecord[])
      .map(mapProviderApplicationRecord)
      .filter((application): application is AccountProviderApplication => Boolean(application)),
    error: null,
    isConfigured: true,
    requests: ((requestsResult.data ?? []) as unknown as ServiceRequestRecord[]).map(
      mapServiceRequestRecord,
    ),
    userId: authContext.user.id,
  };
}
