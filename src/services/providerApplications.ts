import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

export type ProviderApplicationInput = {
  fullName: string;
  phoneNumber: string;
  serviceCategory: string;
  serviceArea: string;
  yearsOfExperience: string;
  availability: string;
  hasEquipment: string;
  shortIntroduction: string;
  referenceLink: string;
};

export type ProviderApplicationSubmitMode = "live" | "demo";

export type ProviderApplicationSubmitResult = {
  applicationCode: string;
  mode: ProviderApplicationSubmitMode;
};

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

function createDemoApplicationResult(): ProviderApplicationSubmitResult {
  return {
    applicationCode: createDemoApplicationCode(),
    mode: "demo",
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
): Promise<ProviderApplicationInsert> {
  const serviceCategoryName = parseServiceCategoryName(data.serviceCategory);
  const primaryServiceArea = parsePrimaryServiceArea(data.serviceArea);
  const [categoryId, districtId] = await Promise.all([
    findLookupId(supabase, "service_categories", serviceCategoryName),
    findLookupId(supabase, "districts", primaryServiceArea),
  ]);

  return {
    full_name: data.fullName.trim(),
    phone: data.phoneNumber.trim(),
    category_id: categoryId,
    district_id: districtId,
    experience_years: parseExperienceYears(data.yearsOfExperience),
    availability: normalizeOptionalText(data.availability),
    has_equipment: parseHasEquipment(data.hasEquipment),
    introduction: data.shortIntroduction.trim(),
    portfolio_url: normalizeOptionalText(data.referenceLink),
    status: "pending",
  };
}

export function isProviderApplicationDemoMode() {
  return !isSupabaseConfigured;
}

export async function submitProviderApplication(
  data: ProviderApplicationInput,
): Promise<ProviderApplicationSubmitResult> {
  const supabase = createProviderApplicationClient();

  if (!supabase) {
    return createDemoApplicationResult();
  }

  try {
    const insertPayload = await buildProviderApplicationInsert(supabase, data);
    const { error } = await supabase.from("provider_applications").insert(insertPayload);

    if (error) {
      warnProviderApplicationFallback(error);
      return createDemoApplicationResult();
    }

    return {
      applicationCode: createLiveApplicationCode(),
      mode: "live",
    };
  } catch (error) {
    warnProviderApplicationFallback(error);
    return createDemoApplicationResult();
  }
}
