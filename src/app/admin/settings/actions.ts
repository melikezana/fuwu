"use server";

import { revalidatePath } from "next/cache";
import { getServerAuthContext } from "@/services/auth/server";
import { hasAdminRole } from "@/services/auth/constants";
import {
  SETTING_DEFS,
  saveAdminSettings,
  type SettingsActionResult,
} from "@/services/admin/settings";

export async function saveSettingsAction(
  formData: FormData,
): Promise<SettingsActionResult> {
  const input: Record<string, string> = {};
  for (const def of SETTING_DEFS) {
    input[def.key] = String(formData.get(def.key) ?? "");
  }

  const result = await saveAdminSettings(input);
  if (result.ok) revalidatePath("/admin/settings");
  return result;
}

export async function clearLegacyAnnouncementAction(expected: string): Promise<SettingsActionResult> {
  const { supabase, user, profile } = await getServerAuthContext();
  if (!supabase || !user || !hasAdminRole(profile)) return { ok: false, message: "Bu işlem için admin yetkisi gerekli." };
  const { data, error } = await supabase.rpc("clear_legacy_announcement", { p_expected: expected }).abortSignal(AbortSignal.timeout(8000));
  if (error || data !== true) return { ok: false, message: "Duyuru temizlenemedi. Güncel değeri ve şemayı kontrol et." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Eski duyuru temizlendi. Diğer ayarlar korunuyor." };
}
