import type { SupabaseClient } from "@supabase/supabase-js";
import { AuthError, DatabaseError, getPublicErrorMessage, handleServiceError, ValidationError } from "@/lib/errors";
import { PROVIDER_APPLICATION_STATUSES } from "@/lib/constants/statuses";
import { logInfo } from "@/lib/logger";
import { checkRateLimitWithRedis } from "@/lib/security/rateLimitRedis";
import {
  createSupabaseServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { validateProviderApplicationInput } from "@/lib/validations";
import { ensureProfileForUser } from "@/services/auth/profiles";
import { writeAuditLog } from "@/services/audit";
import { notifyProviderApplicationSubmitted } from "@/services/notifications";
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
  details?: unknown;
  hint?: unknown;
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
const providerApplicationOptionsErrorMessage =
  "Başvuru seçenekleri şu anda yüklenemedi. Lütfen tekrar deneyin.";

const providerApplicationInsertKeys: Array<keyof ProviderApplicationInsert> = [
  "full_name",
  "user_id",
  "phone",
  "category_id",
  "district_id",
  "experience_years",
  "availability",
  "has_equipment",
  "introduction",
  "portfolio_url",
  "status",
];

const providerApplicationRateLimitMessage =
  "Bugün çok sayıda başvuru gönderdin. Lütfen daha sonra tekrar dene.";

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

function getSupabaseDebugValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function getSupabaseDebugPayload(error: unknown) {
  const record =
    typeof error === "object" && error !== null
      ? (error as SupabaseErrorRecord)
      : {};

  return {
    code: getSupabaseDebugValue(record.code),
    details: getSupabaseDebugValue(record.details),
    hint: getSupabaseDebugValue(record.hint),
    message: getSupabaseDebugValue(record.message),
  };
}

function logProviderApplicationSupabaseError(context: string, error: unknown) {
  console.error(`[Fuwu] ${context}`, getSupabaseDebugPayload(error));
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

async function getRequiredProviderApplicationUserId(
  supabase: SupabaseClient<Database>,
  profileDetails: Pick<ProviderApplicationInput, "fullName" | "phone">,
) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw handleServiceError(error, {
      logContext: "Provider application auth lookup failed.",
      publicMessage: "Giriş yaparak devam etmelisin.",
    });
  }

  if (!user) {
    throw new AuthError("Provider application requires an authenticated user.", {
      publicMessage: "Giriş yaparak devam etmelisin.",
    });
  }

  try {
    await ensureProfileForUser(supabase, user, {
      fullName: profileDetails.fullName,
      phone: profileDetails.phone,
    });
    return user.id;
  } catch (error) {
    throw handleServiceError(error, {
      logContext: "Provider application profile ensure failed.",
      publicMessage: "Hesap bilgilerin doğrulanamadı. Lütfen tekrar giriş yap.",
    });
  }
}

function buildProviderApplicationInsert(
  data: ProviderApplicationInput,
  userId: string,
): ProviderApplicationInsert {
  return {
    full_name: data.fullName,
    user_id: userId,
    phone: data.phone,
    category_id: data.categoryId,
    district_id: data.districtId,
    experience_years: parseExperienceYears(data.experienceYears),
    availability: normalizeOptionalText(data.availability),
    has_equipment: parseHasEquipment(data.hasEquipment),
    introduction: data.introduction,
    portfolio_url: normalizeOptionalText(data.portfolioUrl),
    status: PROVIDER_APPLICATION_STATUSES.pending,
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
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    throw new DatabaseError("Supabase client is not configured.", {
      publicMessage: providerApplicationOptionsErrorMessage,
      statusCode: 503,
    });
  }

  return {
    supabase,
  };
}

async function assertNoPendingDuplicate(
  supabase: SupabaseClient<Database>,
  insertPayload: ProviderApplicationInsert,
) {
  if (insertPayload.user_id) {
    const { data: existingUserApplication, error: userDuplicateCheckError } =
      await supabase
        .from("provider_applications")
        .select("id")
        .eq("user_id", insertPayload.user_id)
        .in("status", [
          PROVIDER_APPLICATION_STATUSES.pending,
          PROVIDER_APPLICATION_STATUSES.approved,
        ])
        .limit(1)
        .maybeSingle();

    if (userDuplicateCheckError) {
      logProviderApplicationSupabaseError(
        "Provider application user duplicate check failed.",
        userDuplicateCheckError,
      );

      throw handleServiceError(userDuplicateCheckError, {
        logContext: "Provider application user duplicate check failed.",
        publicMessage: providerApplicationSubmitErrorMessage,
        tableName: "provider_applications",
      });
    }

    if (existingUserApplication?.id) {
      throw new ValidationError("Duplicate provider application detected for user.", {
        publicMessage: duplicateProviderApplicationMessage,
      });
    }
  }

  const { data: existingPhoneApplication, error: phoneDuplicateCheckError } =
    await supabase
      .from("provider_applications")
      .select("id")
      .eq("phone", insertPayload.phone)
      .eq("status", PROVIDER_APPLICATION_STATUSES.pending)
      .limit(1)
      .maybeSingle();

  if (phoneDuplicateCheckError) {
    logProviderApplicationSupabaseError(
      "Provider application phone duplicate check failed.",
      phoneDuplicateCheckError,
    );

    throw handleServiceError(phoneDuplicateCheckError, {
      logContext: "Provider application phone duplicate check failed.",
      publicMessage: providerApplicationSubmitErrorMessage,
      tableName: "provider_applications",
    });
  }

  if (existingPhoneApplication?.id) {
    throw new ValidationError("Duplicate provider application detected.", {
      publicMessage: duplicateProviderApplicationMessage,
    });
  }
}

async function assertProviderApplicationRateLimit(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  const result = await checkRateLimitWithRedis({
    action: "provider_application_submit",
    limit: 3,
    supabase,
    userId,
    windowMs: 24 * 60 * 60 * 1000,
  });

  if (!result.allowed) {
    throw new ValidationError("Provider application submit rate limit exceeded.", {
      publicMessage: providerApplicationRateLimitMessage,
      statusCode: 429,
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
    const { supabase } = await getProviderApplicationSupabase();

    await assertLookupIdsAreActive(supabase, applicationData);

    const userId = await getRequiredProviderApplicationUserId(supabase, applicationData);
    const insertPayload = buildProviderApplicationInsert(applicationData, userId);

    await assertProviderApplicationRateLimit(supabase, userId);
    await assertNoPendingDuplicate(supabase, insertPayload);

    const { data: insertedApplication, error } = await supabase
      .from("provider_applications")
      .insert(insertPayload)
      .select("id")
      .single();

    if (error) {
      logProviderApplicationSupabaseError(
        "Provider application insert returned Supabase error.",
        error,
      );
      logInfo("Provider application insert payload keys.", {
        payloadKeys: providerApplicationInsertKeys,
      });
      throw error;
    }

    logInfo("Provider application inserted.", {
      categoryId: insertPayload.category_id,
      districtId: insertPayload.district_id,
      status: insertPayload.status,
    });

    await writeAuditLog(
      {
        action: "provider_application.submitted",
        actorUserId: userId,
        entityId: insertedApplication.id,
        entityType: "provider_application",
        metadata: {
          categoryId: insertPayload.category_id,
          districtId: insertPayload.district_id,
          status: insertPayload.status,
        },
      },
      supabase,
    );

    return notifyProviderApplicationSubmitResult({
      applicationCode: createLiveApplicationCode(),
      mode: "live",
    });
  } catch (error) {
    throw createProviderApplicationFailure(error);
  }
}
