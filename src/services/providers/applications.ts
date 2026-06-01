import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { DatabaseError, handleServiceError, NotFoundError, ValidationError } from "@/lib/errors";
import { PROVIDER_APPLICATION_STATUSES } from "@/lib/constants/statuses";
import { logInfo } from "@/lib/logger";
import type { Database } from "@/lib/supabase/types";
import { validateProviderApplicationInput } from "@/lib/validations";
import {
  uploadProviderProfileImage,
  type ProviderImageUploadResult,
} from "@/services/storage";
import { notifyProviderApplicationSubmitted } from "@/services/notifications";
import type {
  ProviderApplicationInput,
  ProviderApplicationSubmitResult,
} from "@/types/provider";

export type {
  ProviderApplicationInput,
  ProviderApplicationSubmitResult,
} from "@/types/provider";

type LookupTable = "service_categories" | "districts";

type LookupRecord = {
  id?: unknown;
};

type ProviderApplicationInsert =
  Database["public"]["Tables"]["provider_applications"]["Insert"];

type SupabaseErrorRecord = {
  code?: unknown;
};

const providerApplicationSubmitErrorMessage =
  "Başvuru gönderilemedi. Lütfen tekrar deneyin.";
const duplicateProviderApplicationMessage =
  "Bu telefon numarasıyla aktif bir başvurunuz zaten bulunuyor.";

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

function parseServiceCategoryName(serviceCategory: string) {
  const categoryParts = serviceCategory.split(" - ");
  return categoryParts[categoryParts.length - 1]?.trim() ?? serviceCategory.trim();
}

function parsePrimaryServiceArea(serviceArea: string) {
  return serviceArea.split(/[,\n;/]+/)[0]?.trim() ?? serviceArea.trim();
}

function parseExperienceYears(yearsOfExperience: string) {
  const parsedValue = Number(yearsOfExperience);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return 0;
  }

  return Math.floor(parsedValue);
}

function parseHasEquipment(hasEquipment: string) {
  return hasEquipment.trim().toLocaleLowerCase("tr") === "evet";
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
  profileImageUpload: ProviderImageUploadResult,
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
    phone: data.phoneNumber.trim(),
    whatsapp: data.whatsappNumber.trim(),
    category_id: categoryId,
    district_id: districtId,
    experience_years: parseExperienceYears(data.yearsOfExperience),
    description: data.shortIntroduction.trim(),
    availability: normalizeOptionalText(data.availability),
    has_equipment: parseHasEquipment(data.hasEquipment),
    introduction: data.shortIntroduction.trim(),
    portfolio_url: normalizeOptionalText(data.referenceLink),
    status: PROVIDER_APPLICATION_STATUSES.pending,
  };

  if (profileImageUpload.status === "uploaded") {
    insertPayload.profile_image_path = profileImageUpload.path;
    insertPayload.profile_image_url = profileImageUpload.publicUrl;
  }

  return insertPayload;
}

function removeProfileImageFields(insertPayload: ProviderApplicationInsert) {
  const { profile_image_path, profile_image_url, ...fallbackPayload } = insertPayload;
  void profile_image_path;
  void profile_image_url;
  return fallbackPayload;
}

export function isProviderApplicationDemoMode() {
  return !isSupabaseConfigured;
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
    const profileImageUpload = await uploadProviderProfileImage(
      supabase,
      applicationData.profileImage ?? null,
    );
    const insertPayload = await buildProviderApplicationInsert(
      supabase,
      applicationData,
      profileImageUpload,
    );

    // Anti-spam duplicate phone check
    const { data: existingApplication, error: duplicateCheckError } = await supabase
      .from("provider_applications")
      .select("id")
      .eq("phone", insertPayload.phone)
      .eq("status", PROVIDER_APPLICATION_STATUSES.pending)
      .limit(1)
      .maybeSingle();

    if (duplicateCheckError) {
      throw handleServiceError(duplicateCheckError, {
        logContext: "Provider application duplicate check failed.",
        publicMessage: providerApplicationSubmitErrorMessage,
      });
    }

    if (existingApplication?.id) {
      throw new ValidationError("Duplicate provider application detected.", {
        publicMessage: duplicateProviderApplicationMessage,
      });
    }

    const { error } = await supabase.from("provider_applications").insert(insertPayload);

    if (error) {
      if (profileImageUpload.status === "uploaded") {
        const fallbackPayload = removeProfileImageFields(insertPayload);
        const { error: fallbackError } = await supabase
          .from("provider_applications")
          .insert(fallbackPayload);

        if (!fallbackError) {
          logInfo("Provider application inserted without profile image.", {
            categoryId: fallbackPayload.category_id,
            districtId: fallbackPayload.district_id,
            status: fallbackPayload.status,
          });

          return notifyProviderApplicationSubmitResult({
            applicationCode: createLiveApplicationCode(),
            mode: "live",
            profileImageStatus: "skipped",
            profileImageMessage:
              "Profil görseli başvuruyla kaydedilemedi; başvurun görselsiz gönderildi.",
          });
        }
      }

      throw createProviderApplicationFailure(error);
    }

    logInfo("Provider application inserted.", {
      categoryId: insertPayload.category_id,
      districtId: insertPayload.district_id,
      hasProfileImage: profileImageUpload.status === "uploaded",
      status: insertPayload.status,
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
