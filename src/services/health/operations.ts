import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { OperationsHealth, ProbeResult } from "@/lib/commerce/operations-health";

// Read-only external probes. Connectivity and OAuth enablement do not certify a purchase or Google login.
export async function probeExternalServices(): Promise<ProbeResult[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const [google, iyzico] = await Promise.all([
    (async (): Promise<ProbeResult> => {
      if (!url || !key) return { name: "google", passed: false, detail: "Supabase Auth yapılandırması eksik." };
      try {
        const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key }, cache: "no-store", signal: AbortSignal.timeout(8000) });
        const body = await response.json();
        return { name: "google", passed: response.ok && body?.external?.google === true, detail: response.ok && body?.external?.google === true ? "Auth API Google sağlayıcısını etkin bildiriyor. Gerçek Google giriş/callback testi ayrıca gerekli." : "Auth API Google sağlayıcısını doğrulayamadı." };
      } catch { return { name: "google", passed: false, detail: "Auth ayarları isteği başarısız veya zaman aşımına uğradı." }; }
    })(),
    (async (): Promise<ProbeResult> => {
      try {
        const response = await fetch("https://sandbox-api.iyzipay.com/payment/test", { cache: "no-store", signal: AbortSignal.timeout(8000) });
        const body = await response.json();
        return { name: "iyzico", passed: response.ok && body.status === "success", detail: "Sandbox API bağlantı kontrolü. Bu uç nokta anahtar, alt üye, ödeme, iade veya payout doğrulamaz." };
      } catch { return { name: "iyzico", passed: false, detail: "Sandbox API bağlantı isteği başarısız veya zaman aşımına uğradı." }; }
    })(),
  ]);
  return [google, iyzico];
}

export async function getOperationsHealth(db: SupabaseClient<Database>): Promise<OperationsHealth | null> {
  const { data, error } = await db.rpc("commerce_admin_health", {}).abortSignal(AbortSignal.timeout(8000));
  return error || !data ? null : data as unknown as OperationsHealth;
}
