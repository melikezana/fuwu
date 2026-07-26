"use server";

import { revalidatePath } from "next/cache";
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
