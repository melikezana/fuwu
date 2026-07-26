import { getServerAuthContext } from "@/services/auth/server";
import { hasAdminRole } from "@/services/auth/constants";
import { handleServiceError } from "@/lib/errors";
import { sanitizeText } from "@/lib/validations";
import { writeAuditLog } from "@/services/audit";
import { checkRateLimitWithRedis } from "@/lib/security/rateLimitRedis";
import type { SupabaseClient } from "@supabase/supabase-js";

// app_settings tablosu üretilmiş tiplerde yok; bu servis için gevşek tiplenmiş
// bir istemci kullanıyoruz (sorgular bu dosyayla sınırlı ve kontrol altında).
type LooseClient = SupabaseClient;

export type SettingType = "text" | "number" | "boolean";

export type SettingDef = {
  default: string;
  key: string;
  label: string;
  type: SettingType;
};

export const SETTING_DEFS: SettingDef[] = [
  { default: "10", key: "commission_rate", label: "Komisyon Oranı (%)", type: "number" },
  { default: "", key: "support_phone", label: "Destek Telefonu", type: "text" },
  { default: "", key: "support_email", label: "Destek E-posta", type: "text" },
  { default: "", key: "announcement_banner", label: "Duyuru Bandı (site üstü mesaj)", type: "text" },
  { default: "false", key: "maintenance_mode", label: "Bakım Modu", type: "boolean" },
];

const KNOWN_KEYS = new Set(SETTING_DEFS.map((definition) => definition.key));

export type AdminSettingsData = {
  error: string | null;
  isConfigured: boolean;
  values: Record<string, string>;
};

export type SettingsActionResult = { message: string; ok: boolean };

type Gate =
  | { isConfigured: boolean; ok: false; supabase: null; userId: null }
  | { isConfigured: true; ok: true; supabase: LooseClient; userId: string };

async function gate(): Promise<Gate> {
  const ctx = await getServerAuthContext();
  if (!ctx.supabase || !ctx.user || !hasAdminRole(ctx.profile)) {
    return { isConfigured: ctx.isConfigured, ok: false, supabase: null, userId: null };
  }
  return {
    isConfigured: true,
    ok: true,
    supabase: ctx.supabase as unknown as LooseClient,
    userId: ctx.user.id,
  };
}

function withDefaults(stored: Record<string, string>): Record<string, string> {
  const values: Record<string, string> = {};
  for (const definition of SETTING_DEFS) {
    values[definition.key] = stored[definition.key] ?? definition.default;
  }
  return values;
}

export async function getAdminSettings(): Promise<AdminSettingsData> {
  const g = await gate();
  if (!g.ok || !g.supabase) {
    return {
      error: g.isConfigured ? "Bu alana erişim yetkin yok." : "Supabase bağlı değil.",
      isConfigured: g.isConfigured,
      values: withDefaults({}),
    };
  }

  try {
    const { data, error } = await g.supabase.from("app_settings").select("key, value");

    if (error) {
      handleServiceError(error, { logContext: "getAdminSettings" });
      return { error: "Ayarlar okunamadı.", isConfigured: true, values: withDefaults({}) };
    }

    const stored: Record<string, string> = {};
    for (const row of (data ?? []) as Array<{ key: string; value: string }>) {
      stored[row.key] = row.value;
    }

    return { error: null, isConfigured: true, values: withDefaults(stored) };
  } catch (error) {
    handleServiceError(error, { logContext: "getAdminSettings" });
    return { error: "Ayarlar okunamadı.", isConfigured: true, values: withDefaults({}) };
  }
}

function normalizeValue(def: SettingDef, raw: string): string {
  if (def.type === "boolean") {
    return raw === "true" || raw === "on" ? "true" : "false";
  }
  if (def.type === "number") {
    const parsed = Number(raw.replace(",", "."));
    return Number.isFinite(parsed) ? String(parsed) : def.default;
  }
  return sanitizeText(raw, 300);
}

export async function saveAdminSettings(
  input: Record<string, string>,
): Promise<SettingsActionResult> {
  const g = await gate();
  if (!g.ok || !g.supabase) {
    return { message: "Bu işlem için admin yetkisi gerekli.", ok: false };
  }

  const rateLimit = await checkRateLimitWithRedis({
    action: "admin:settings.update",
    limit: 30,
    supabase: g.supabase,
    userId: g.userId,
    windowMs: 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return { message: "Çok fazla işlem yaptın, biraz bekle.", ok: false };
  }

  const rows = SETTING_DEFS.filter((def) => KNOWN_KEYS.has(def.key)).map((def) => ({
    key: def.key,
    value: normalizeValue(def, input[def.key] ?? def.default),
    updated_at: new Date().toISOString(),
  }));

  const { error } = await g.supabase
    .from("app_settings")
    .upsert(rows, { onConflict: "key" });

  if (error) {
    handleServiceError(error, { logContext: "saveAdminSettings" });
    return { message: "Ayarlar kaydedilemedi.", ok: false };
  }

  await writeAuditLog({
    action: "settings.updated",
    actorUserId: g.userId,
    entityId: null,
    entityType: "settings",
    metadata: { keys: rows.map((row) => row.key) },
  });

  return { message: "Ayarlar kaydedildi.", ok: true };
}
