import type { SupabaseClient } from "@supabase/supabase-js";
import { DatabaseError, getPublicErrorMessage, handleServiceError, ValidationError } from "@/lib/errors";
import { PROVIDER_APPLICATION_STATUSES } from "@/lib/constants/statuses";
import { logInfo } from "@/lib/logger";
import {
  createSupabaseServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { validateProviderApplicationInput } from "@/lib/validations";
import { notifyProviderApplicationSubmitted } from "@/services/notifications";
import { getServerAuthContext } from "@/services/auth/server";
import type {
  ProviderApplicationInput,
  ProviderApplicationOption,
  ProviderApplicationSubmitResult,
} from "@/types/provider";

export type {
  ProviderApplicationInput,
  ProviderApplicationSubmitResult,
} from "@/types/provider";

type ProviderApplicationInsert =
  Database["public"]["Tables"]["provider_applications"]["Insert"];

type ProviderApplicationLookupTable = "service_categories" | "districts";

type SupabaseErrorRecord = {
  code?: unknown;
  message?: unknown;
};

export type ProviderApplicationFormOptions = {
  categories: ProviderApplicationOption[];
  districts: ProviderApplicationOption[];
  error: string | null;
  isConfigured: boolean;
};

const providerApplicationSubmitErrorMessage =
  "Başvuru gönderilemedi. Lütfen tekrar deneyin.";
const duplicateProviderApplicationMessage =
  "Bu telefon numarasıyla aktif bir başvurunuz zaten bulunuyor.";
const providerApplicationLoginRequiredMessage =
  "Usta başvurusu göndermek için Google ile giriş yapmalısın.";
const providerApplicationOptionsErrorMessage =
  "Başvuru seçenekleri şu anda yüklenemedi. Lütfen tekrar deneyin.";

const providerApplicationInsertKeys: Array<keyof ProviderApplicationInsert> = [
  "full_name",
  "phone",
  "category_id",
  "district_id",
  "experience_years",
  "availability",
  "has_equipment",
  "introduction",
  "portfolio_url",
  "status",
  "user_id",
];

function createLiveApplicationCode() {
  return `FW-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function hasSupabaseErrorCode(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as SupabaseErrorRecord).code === code
  );
}

function getSupabaseErrorMessage(error: unknown) {
  return typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as SupabaseErrorRecord).message === "string"
    ? (error as SupabaseErrorRecord).message
    : null;
}

function createProviderApplicationFailure(error: unknown) {
  return handleServiceError(error, {
    logContext: "Provider application Supabase write failed.",
    publicMessage: hasSupabaseErrorCode(error, "23505")
      ? duplicateProviderApplicationMessage
      : providerApplicationSubmitErrorMessage,
    tableName: "provider_applications",
    payloadKeys: providerApplicationInsertKeys,
  });
}

function parseExperienceYears(experienceYears: string) {
  const parsedValue = Number(experienceYears);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return 0;
  }

  return Math.floor(parsedValue);
}

function parseHasEquipment(hasEquipment: string) {
  return hasEquipment.trim() === "true";
}

function normalizeOptionalText(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue || null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function mapLookupOptions(
  rows: Array<Pick<Database["public"]["Tables"]["service_categories"]["Row"], "id" | "name">>,
) {
  return rows
    .map((row) => ({
      id: row.id,
      name: row.name.trim(),
    }))
    .filter((row) => row.id && row.name);
}

async function assertActiveLookupExists(
  supabase: SupabaseClient<Database>,
  table: ProviderApplicationLookupTable,
  id: string,
  publicMessage: string,
) {
  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw handleServiceError(error, {
      logContext: `Provider application ${table} id lookup failed.`,
      publicMessage: providerApplicationSubmitErrorMessage,
      tableName: table,
    });
  }

  if (!data?.id) {
    throw new ValidationError(`Provider application ${table} id was not found.`, {
      publicMessage,
    });
  }
}

async function assertLookupIdsAreActive(
  supabase: SupabaseClient<Database>,
  data: ProviderApplicationInput,
) {
  if (!isUuid(data.categoryId)) {
    throw new ValidationError("Provider application category id is invalid.", {
      publicMessage: "Lütfen geçerli bir hizmet kategorisi seç.",
    });
  }

  if (!isUuid(data.districtId)) {
    throw new ValidationError("Provider application district id is invalid.", {
      publicMessage: "Lütfen geçerli bir ilçe seç.",
    });
  }

  await Promise.all([
    assertActiveLookupExists(
      supabase,
      "service_categories",
      data.categoryId,
      "Seçtiğin hizmet kategorisi şu anda bulunamadı.",
    ),
    assertActiveLookupExists(
      supabase,
      "districts",
      data.districtId,
      "Seçtiğin hizmet bölgesi şu anda desteklenen bölgeler arasında bulunamadı.",
    ),
  ]);
}

function buildProviderApplicationInsert(
  data: ProviderApplicationInput,
  userId: string,
): ProviderApplicationInsert {
  return {
    full_name: data.fullName,
    phone: data.phone,
    category_id: data.categoryId,
    district_id: data.districtId,
    experience_years: parseExperienceYears(data.experienceYears),
    availability: normalizeOptionalText(data.availability),
    has_equipment: parseHasEquipment(data.hasEquipment),
    introduction: data.introduction,
    portfolio_url: normalizeOptionalText(data.portfolioUrl),
    status: PROVIDER_APPLICATION_STATUSES.pending,
    user_id: userId,
  };
}

export function isProviderApplicationDemoMode() {
  return !isSupabaseServerConfigured;
}

export async function getProviderApplicationFormOptions(): Promise<ProviderApplicationFormOptions> {
  if (!isSupabaseServerConfigured) {
    return {
      categories: [],
      districts: [],
      error: providerApplicationOptionsErrorMessage,
      isConfigured: false,
    };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      categories: [],
      districts: [],
      error: providerApplicationOptionsErrorMessage,
      isConfigured: false,
    };
  }

  const [categoriesResult, districtsResult] = await Promise.all([
    supabase
      .from("service_categories")
      .select("id, name")
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("districts")
      .select("id, name")
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ]);

  const firstError = categoriesResult.error ?? districtsResult.error;

  if (firstError) {
    const appError = handleServiceError(firstError, {
      logContext: "Provider application lookup options read failed.",
      publicMessage: providerApplicationOptionsErrorMessage,
    });

    return {
      categories: [],
      districts: [],
      error: getPublicErrorMessage(appError, providerApplicationOptionsErrorMessage),
      isConfigured: true,
    };
  }

  return {
    categories: mapLookupOptions(categoriesResult.data ?? []),
    districts: mapLookupOptions(districtsResult.data ?? []),
    error: null,
    isConfigured: true,
  };
}

async function getProviderApplicationSupabase() {
  const authContext = await getServerAuthContext();

  if (!authContext.supabase) {
    throw new DatabaseError("Supabase client is not configured.", {
      publicMessage: providerApplicationOptionsErrorMessage,
      statusCode: 503,
    });
  }

  if (!authContext.user) {
    throw new ValidationError("Provider application requires an authenticated user.", {
      publicMessage: providerApplicationLoginRequiredMessage,
      statusCode: 401,
    });
  }

  return {
    supabase: authContext.supabase,
    userId: authContext.user.id,
  };
}

async function assertNoPendingDuplicate(
  supabase: SupabaseClient<Database>,
  insertPayload: ProviderApplicationInsert,
) {
  const [
    { data: existingUserApplication, error: userDuplicateCheckError },
    { data: existingPhoneApplication, error: phoneDuplicateCheckError },
  ] = await Promise.all([
    supabase
      .from("provider_applications")
      .select("id")
      .eq("user_id", insertPayload.user_id)
      .eq("status", PROVIDER_APPLICATION_STATUSES.pending)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("provider_applications")
      .select("id")
      .eq("phone", insertPayload.phone)
      .eq("status", PROVIDER_APPLICATION_STATUSES.pending)
      .limit(1)
      .maybeSingle(),
  ]);

  if (userDuplicateCheckError) {
    throw handleServiceError(userDuplicateCheckError, {
      logContext: "Provider application user duplicate check failed.",
      publicMessage: providerApplicationSubmitErrorMessage,
      tableName: "provider_applications",
    });
  }

  if (phoneDuplicateCheckError) {
    throw handleServiceError(phoneDuplicateCheckError, {
      logContext: "Provider application phone duplicate check failed.",
      publicMessage: providerApplicationSubmitErrorMessage,
      tableName: "provider_applications",
    });
  }

  if (existingUserApplication?.id || existingPhoneApplication?.id) {
    throw new ValidationError("Duplicate provider application detected.", {
      publicMessage: duplicateProviderApplicationMessage,
    });
  }
}

async function notifyProviderApplicationSubmitResult(
  result: ProviderApplicationSubmitResult,
) {
  await notifyProviderApplicationSubmitted({
    applicationCode: result.applicationCode,
    source: result.mode,
  });

  return result;
}

export async function submitProviderApplication(
  data: ProviderApplicationInput,
): Promise<ProviderApplicationSubmitResult> {
  const validationResult = validateProviderApplicationInput(data);

  if (!validationResult.ok) {
    throw new ValidationError("Provider application validation failed.", {
      publicMessage: validationResult.message,
    });
  }

  try {
    const applicationData = validationResult.data;
    const { supabase, userId } = await getProviderApplicationSupabase();

    await assertLookupIdsAreActive(supabase, applicationData);

    const insertPayload = buildProviderApplicationInsert(applicationData, userId);

    await assertNoPendingDuplicate(supabase, insertPayload);

    const { error } = await supabase.from("provider_applications").insert(insertPayload);

    if (error) {
      logInfo("Provider application insert returned Supabase error.", {
        code: hasSupabaseErrorCode(error, String(error.code)) ? error.code : undefined,
        message: getSupabaseErrorMessage(error),
        payloadKeys: providerApplicationInsertKeys,
      });
      throw error;
    }

    logInfo("Provider application inserted.", {
      categoryId: insertPayload.category_id,
      districtId: insertPayload.district_id,
      status: insertPayload.status,
      userId,
    });

    return notifyProviderApplicationSubmitResult({
      applicationCode: createLiveApplicationCode(),
      mode: "live",
    });
  } catch (error) {
    throw createProviderApplicationFailure(error);
  }
}
