const REQUIRED = ["NETGSM_USERCODE", "NETGSM_PASSWORD", "NETGSM_HEADER", "SUPABASE_SEND_SMS_HOOK_SECRET"] as const;

/**
 * Doğrulama kodu SMS'i gerçekten gidebilir mi? Canlıda NetGSM ve Supabase "Send SMS" kancasının anahtarı gerekir
 * (bkz. /api/auth/sms-hook). Geliştirme ve E2E ortamında yerel Supabase telefon kodunu kendisi yönettiği için açık sayılır.
 * Kancanın Supabase panelinde açık olup olmadığı buradan okunamaz; o yüzden istemci gönderim hatasında da geri düşer.
 */
export function isAuthSmsConfigured(env: Record<string, string | undefined> = process.env): boolean {
  if (env.NODE_ENV !== "production") return true;
  if ((env.SMS_PROVIDER ?? "").trim().toLowerCase() !== "netgsm") return false;
  return REQUIRED.every(name => Boolean(env[name]?.trim()));
}
