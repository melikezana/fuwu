import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { DatabaseError, handleServiceError, ValidationError } from "@/lib/errors";
import { PROVIDER_APPLICATION_STATUSES } from "@/lib/constants/statuses";
import { logInfo } from "@/lib/logger";
import type { Database } from "@/lib/supabase/types";
import { validateProviderApplicationInput } from "@/lib/validations";
import { notifyProviderApplicationSubmitted } from "@/services/notifications";
import type {
  ProviderApplicationInput,
  ProviderApplicationSubmitResult,
} from "@/types/provider";

export type {
  ProviderApplicationInput,
  ProviderApplicationSubmitResult,
} from "@/types/provider";

type ProviderApplicationInsert =
  Database["public"]["Tables"]["provider_applications"]["Insert"];

type SupabaseErrorRecord = {
  code?: unknown;
};

const providerApplicationSubmitErrorMessage =
  "Başvuru gönderilemedi. Lütfen tekrar deneyin.";
const duplicateProviderApplicationMessage =
  "Bu telefon numarasıyla aktif bir başvurunuz zaten bulunuyor.";

const providerApplicationLoginRequiredMessage =
  "Usta başvurusu göndermek için Google ile giriş yapmalısın.";

function createProviderApplicationClient(): SupabaseClient<Database> | null {
  return createSupabaseBrowserClient();
}

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

function createProviderApplicationFailure(error: unknown) {
  return handleServiceError(error, {
    logContext: "Provider application Supabase insert failed.",
    publicMessage: hasSupabaseErrorCode(error, "23505")
      ? duplicateProviderApplicationMessage
      : providerApplicationSubmitErrorMessage,
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
    throw handleServiceError(error, {
      logContext: `Provider application ${table} lookup failed.`,
      publicMessage: providerApplicationSubmitErrorMessage,
    });
  }

  const record = data as LookupRecord | null;
  return typeof record?.id === "string" ? record.id : null;
}

async function buildProviderApplicationInsert(
  supabase: SupabaseClient<Database>,
  data: ProviderApplicationInput,
  userId: string,
): Promise<ProviderApplicationInsert> {
  const serviceCategoryName = parseServiceCategoryName(data.serviceCategory);
  const primaryServiceArea = parsePrimaryServiceArea(data.serviceArea);
  const [categoryId, districtId] = await Promise.all([
    findLookupId(supabase, "service_categories", serviceCategoryName),
    findLookupId(supabase, "districts", primaryServiceArea),
  ]);

  if (!categoryId) {
    throw new NotFoundError("Provider application category lookup failed.", {
      publicMessage: "Seçtiğin hizmet kategorisi şu anda bulunamadı.",
    });
  }

  if (!districtId) {
    throw new NotFoundError("Provider application district lookup failed.", {
      publicMessage: "Seçtiğin hizmet bölgesi şu anda desteklenen bölgeler arasında bulunamadı.",
    });
  }

  const insertPayload: ProviderApplicationInsert = {
    full_name: data.fullName.trim(),
    user_id: userId,
    phone: data.phoneNumber.trim(),
    category_id: categoryId,
    district_id: districtId,
    experience_years: parseExperienceYears(data.yearsOfExperience),
    availability: normalizeOptionalText(data.availability),
    has_equipment: parseHasEquipment(data.hasEquipment),
    introduction: data.shortIntroduction.trim(),
    portfolio_url: normalizeOptionalText(data.referenceLink),
    status: PROVIDER_APPLICATION_STATUSES.pending,
  };

  return insertPayload;
}

export function isProviderApplicationDemoMode() {
  return !isSupabaseConfigured;
}

async function getProviderApplicationUserId(supabase: SupabaseClient<Database>) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw handleServiceError(error, {
      logContext: "Provider application auth user lookup failed.",
      publicMessage: providerApplicationLoginRequiredMessage,
      statusCode: 401,
    });
  }

  if (!user) {
    throw new ValidationError("Provider application requires an authenticated user.", {
      publicMessage: providerApplicationLoginRequiredMessage,
      statusCode: 401,
    });
  }

  return user.id;
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

  const applicationData = validationResult.data;
  const supabase = createProviderApplicationClient();

  if (!supabase) {
    throw new DatabaseError("Supabase client is not configured.", {
      publicMessage: "Başvuru sistemi şu anda kullanılamıyor. Lütfen tekrar deneyin.",
      statusCode: 503,
    });
  }

  try {
    const userId = await getProviderApplicationUserId(supabase);
    const profileImageUpload = await uploadProviderProfileImage(
      supabase,
      applicationData.profileImage ?? null,
    );
    const insertPayload = await buildProviderApplicationInsert(
      supabase,
      applicationData,
      userId,
    );

    const { data: existingUserApplication, error: userDuplicateCheckError } = await supabase
      .from("provider_applications")
      .select("id")
      .eq("user_id", userId)
      .eq("status", PROVIDER_APPLICATION_STATUSES.pending)
      .limit(1)
      .maybeSingle();

    if (userDuplicateCheckError) {
      throw handleServiceError(userDuplicateCheckError, {
        logContext: "Provider application user duplicate check failed.",
        publicMessage: providerApplicationSubmitErrorMessage,
      });
    }

    if (existingUserApplication?.id) {
      throw new ValidationError("Duplicate provider application detected for user.", {
        publicMessage: duplicateProviderApplicationMessage,
      });
    }

    const { data: existingPhoneApplication, error: phoneDuplicateCheckError } = await supabase
      .from("provider_applications")
      .select("id")
      .eq("phone", insertPayload.phone)
      .eq("status", PROVIDER_APPLICATION_STATUSES.pending)
      .limit(1)
      .maybeSingle();

    if (phoneDuplicateCheckError) {
      throw handleServiceError(phoneDuplicateCheckError, {
        logContext: "Provider application phone duplicate check failed.",
        publicMessage: providerApplicationSubmitErrorMessage,
      });
    }

    if (existingPhoneApplication?.id) {
      throw new ValidationError("Duplicate provider application detected.", {
        publicMessage: duplicateProviderApplicationMessage,
      });
    }

    const { error } = await supabase.from("provider_applications").insert(insertPayload);

    if (error) {
      throw createProviderApplicationFailure(error);
    }

    logInfo("Provider application inserted.", {
      categoryId: insertPayload.category_id,
      districtId: insertPayload.district_id,
      hasProfileImage: profileImageUpload.status === "uploaded",
      status: insertPayload.status,
      userId,
    });

    return notifyProviderApplicationSubmitResult({
      applicationCode: createLiveApplicationCode(),
      mode: "live",
      profileImageStatus: profileImageUpload.status,
      profileImageMessage: profileImageUpload.message,
    });
  } catch (error) {
    throw createProviderApplicationFailure(error);
  }
}
