import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";
import type { LegalParty } from "@/lib/legal/distance-contract";

const KEYS = ["name", "tax_id", "tax_office", "mersis", "address", "phone", "email"] as const;

/** FUWU'nun (aracı hizmet sağlayıcı) admin ayarlarındaki kimlik bilgileri; herkese açık örnek metinlerde gösterilir. */
export async function getIntermediaryParty(): Promise<LegalParty & { ready: boolean }> {
  const empty = { name: null, tax_id: null, tax_office: null, mersis: null, address: null, phone: null, email: null, ready: false };
  const db = createSupabaseServiceRoleClient();
  if (!db) return empty;
  try {
    const { data, error } = await db.from("app_settings").select("key,value").like("key", "legal_intermediary_%").abortSignal(AbortSignal.timeout(5000));
    if (error || !data) return empty;
    const map = Object.fromEntries(data.map(row => [row.key.replace("legal_intermediary_", ""), row.value.trim() || null]));
    const party = Object.fromEntries(KEYS.map(key => [key, map[key] ?? null])) as unknown as LegalParty;
    const ready = (party.name?.length ?? 0) >= 3 && (/^\d{10,11}$/.test(party.tax_id ?? "") || /^\d{16}$/.test(party.mersis ?? "")) && (party.address?.length ?? 0) >= 10 && (party.phone?.replace(/\D/g, "").length ?? 0) >= 10 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(party.email ?? "");
    return { ...party, ready };
  } catch { return empty; }
}

/** Kapıda ödeme admin ayarı (varsayılan kapalı). Okunamazsa kapalı sayılır; veritabanı da aynı ayarla siparişi reddeder. */
export async function getPayAtDoorEnabled(): Promise<boolean> {
  const db = createSupabaseServiceRoleClient();
  if (!db) return false;
  try {
    const { data, error } = await db.from("app_settings").select("value").eq("key", "pay_at_door_enabled").abortSignal(AbortSignal.timeout(5000)).maybeSingle();
    return !error && data?.value === "true";
  } catch { return false; }
}
