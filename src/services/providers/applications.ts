import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
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

const demoApplicationCodePrefix = "DEMO";

function createProviderApplicationClient(): SupabaseClient<Database> | null {
  return createSupabaseBrowserClient();
}

function createDemoApplicationCode() {
  return `${demoApplicationCodePrefix}-${new Date().getFullYear()}-${Math.floor(
    1000 + Math.random() * 9000,
  )}`;
}

function createLiveApplicationCode() {
  return `FW-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function createDemoApplicationResult(profileImage?: File | null): ProviderApplicationSubmitResult {
  return {
    applicationCode: createDemoApplicationCode(),
    mode: "demo",
    profileImageStatus: "skipped",
    profileImageMessage: profileImage
      ? "Örnek modda profil görseli yüklenmedi."
      : undefined,
  };
}

function warnProviderApplicationFallback(error: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.warn("Provider application Supabase insert failed. Falling back to demo mode.", error);
  }
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
    return null;
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
    status: "pending",
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
  const supabase = createProviderApplicationClient();

  if (!supabase) {
    return notifyProviderApplicationSubmitResult(
      createDemoApplicationResult(data.profileImage),
    );
  }

  try {
    const profileImageUpload = await uploadProviderProfileImage(
      supabase,
      data.profileImage ?? null,
    );
    const insertPayload = await buildProviderApplicationInsert(supabase, data, profileImageUpload);
    const { error } = await supabase.from("provider_applications").insert(insertPayload);

    if (error) {
      if (profileImageUpload.status === "uploaded") {
        const fallbackPayload = removeProfileImageFields(insertPayload);
        const { error: fallbackError } = await supabase
          .from("provider_applications")
          .insert(fallbackPayload);

        if (!fallbackError) {
          return notifyProviderApplicationSubmitResult({
            applicationCode: createLiveApplicationCode(),
            mode: "live",
            profileImageStatus: "skipped",
            profileImageMessage:
              "Profil görseli başvuruyla kaydedilemedi; başvurun görselsiz gönderildi.",
          });
        }
      }

      warnProviderApplicationFallback(error);
      return notifyProviderApplicationSubmitResult(
        createDemoApplicationResult(data.profileImage),
      );
    }

    return notifyProviderApplicationSubmitResult({
      applicationCode: createLiveApplicationCode(),
      mode: "live",
      profileImageStatus: profileImageUpload.status,
      profileImageMessage: profileImageUpload.message,
    });
  } catch (error) {
    warnProviderApplicationFallback(error);
    return notifyProviderApplicationSubmitResult(
      createDemoApplicationResult(data.profileImage),
    );
  }
}
