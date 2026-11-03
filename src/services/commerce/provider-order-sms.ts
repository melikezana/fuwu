import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { getSmsProvider } from "@/lib/sms";
import { normalizeTurkishMobile } from "@/lib/sms/authHook";
import { logWarn } from "@/lib/logger";

const EVENT = "provider_new_order" as const;
const SMS_TIMEOUT_MS = 4000;

type OrderSummary = { service_name: string; starts_at: string; district_name: string };

/** Tek SMS'e sığar (Türkçe karakterle 155 karakter); müşterinin adı, telefonu veya açık adresi yazılmaz. */
export function providerNewOrderText(order: OrderSummary) {
  const when = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }).format(new Date(order.starts_at));
  const service = order.service_name.length > 32 ? `${order.service_name.slice(0, 31).trimEnd()}…` : order.service_name;
  const district = order.district_name.slice(0, 20);
  return `FUWU: Yeni randevun var. ${service} · ${when} · ${district}. Ayrıntılar: fuwu.com.tr/provider-dashboard/orders`;
}

function enabled() {
  return (process.env.SMS_PROVIDER ?? "").trim().toLowerCase() === "netgsm" && process.env.ORDER_SMS_ENABLED !== "false";
}

/**
 * Ödemesi doğrulanan siparişte ustaya bir kez SMS gönderir. Ödeme dönüşü ve iyzico bildirimi aynı anda
 * gelse bile veritabanındaki tekil kayıt sayesinde ikinci SMS gitmez. Hiçbir hata satın almayı etkilemez.
 */
export async function notifyProviderOfConfirmedOrder(db: SupabaseClient<Database>, orderId: string): Promise<"sent" | "skipped" | "failed"> {
  if (!enabled()) return "skipped";
  const release = async () => { await db.from("order_sms_dispatches").delete().eq("order_id", orderId).eq("event", EVENT); };
  try {
    const claim = await db.from("order_sms_dispatches").insert({ order_id: orderId, event: EVENT });
    if (claim.error) return "skipped"; // Daha önce gönderildi ya da tablo henüz yok.

    const { data: order } = await db.from("commerce_orders").select("status,provider_id,service_name,starts_at,district_name").eq("id", orderId).maybeSingle();
    if (!order || order.status !== "CONFIRMED") { await release(); return "skipped"; }
    const { data: provider } = await db.from("providers").select("phone").eq("id", order.provider_id).maybeSingle();
    const phone = normalizeTurkishMobile(provider?.phone);
    if (!phone) return "skipped";

    const sent = await getSmsProvider().sendMessage(phone.slice(2), providerNewOrderText(order), { timeoutMs: SMS_TIMEOUT_MS });
    if (!sent.ok) {
      await release(); // Sonraki ödeme bildirimi yeniden deneyebilir.
      logWarn("Provider new-order SMS could not be delivered.", { orderId });
      return "failed";
    }
    return "sent";
  } catch {
    await release().catch(() => undefined);
    logWarn("Provider new-order SMS failed unexpectedly.", { orderId });
    return "failed";
  }
}

/** Yanıt gönderildikten sonra çalıştırır; istek bağlamı yoksa (test, betik) arka planda başlatır. */
export function notifyProviderAfterResponse(db: SupabaseClient<Database>, orderId: string) {
  if (!enabled()) return;
  const task = () => notifyProviderOfConfirmedOrder(db, orderId).then(() => undefined, () => undefined);
  try { after(task); } catch { void task(); }
}
