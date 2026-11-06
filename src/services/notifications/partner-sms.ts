import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { getSmsProvider } from "@/lib/sms";
import { normalizeTurkishMobile } from "@/lib/sms/authHook";
import { logWarn } from "@/lib/logger";

const SMS_TIMEOUT_MS = 4000;

function enabled() {
  return (process.env.SMS_PROVIDER ?? "").trim().toLowerCase() === "netgsm" && process.env.PARTNER_SMS_ENABLED !== "false";
}

/** Tek SMS'e sığar; kişisel veri içermez. */
export const applicantApprovedText = "FUWU: Usta başvurun onaylandı. Profilini, belgelerini ve hizmetlerini tamamla, yayına hazırlan: fuwu.com.tr/provider-dashboard";

export function adminNewApplicationText(category: string, district: string) {
  const safe = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value);
  return `FUWU: Yeni usta başvurusu · ${safe(category, 28)} · ${safe(district, 20)}. İncele: fuwu.com.tr/admin/provider-applications`;
}

async function send(phone: unknown, text: string, context: string) {
  const normalized = normalizeTurkishMobile(phone);
  if (!normalized) return "skipped" as const;
  try {
    const result = await getSmsProvider().sendMessage(normalized.slice(2), text, { timeoutMs: SMS_TIMEOUT_MS });
    if (!result.ok) logWarn("Partner SMS could not be delivered.", { context });
    return result.ok ? ("sent" as const) : ("failed" as const);
  } catch {
    logWarn("Partner SMS failed unexpectedly.", { context });
    return "failed" as const;
  }
}

function runAfterResponse(task: () => Promise<unknown>) {
  const safeTask = () => task().then(() => undefined, () => undefined);
  try { after(safeTask); } catch { void safeTask(); }
}

/** Onaylanan ustaya SMS: uygulama içi bildirimi çoğu usta görmez. Hiçbir hata onayı etkilemez. */
export function notifyApplicantApprovedBySms(phone: string | null | undefined) {
  if (!enabled()) return;
  runAfterResponse(() => send(phone, applicantApprovedText, "applicant_approved"));
}

/**
 * Yeni başvuruda kurucuya SMS (ADMIN_ALERT_PHONE). Ad, telefon gibi başvuran bilgisi yazılmaz;
 * yalnızca kategori ve ilçe adı gönderilir.
 */
export function notifyAdminOfNewApplication(db: SupabaseClient<Database>, ids: { categoryId: string; districtId: string }) {
  const adminPhone = process.env.ADMIN_ALERT_PHONE;
  if (!enabled() || !adminPhone) return;
  runAfterResponse(async () => {
    const [category, district] = await Promise.all([
      db.from("service_categories").select("name").eq("id", ids.categoryId).maybeSingle(),
      db.from("districts").select("name").eq("id", ids.districtId).maybeSingle(),
    ]);
    return send(adminPhone, adminNewApplicationText(category.data?.name ?? "Kategori", district.data?.name ?? "İstanbul"), "admin_new_application");
  });
}
