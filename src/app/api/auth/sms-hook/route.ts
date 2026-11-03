import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getSmsProvider } from "@/lib/sms";
import { authSmsText, smsHookRecipient, verifyStandardWebhook, type SmsHookPayload } from "@/lib/sms/authHook";
import { checkIdentifierRateLimitWithRedis } from "@/lib/security/rateLimitRedis";
import { logWarn } from "@/lib/logger";

// Supabase Auth › Hooks › Send SMS (HTTPS). Doğrulama kodlarını NetGSM üzerinden gönderir.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 20 * 1024;
const PROVIDER_TIMEOUT_MS = 4000; // Supabase kancaya en fazla 5 saniye bekler.
const limits = [
  { action: "auth.sms.burst", limit: 5, windowMs: 15 * 60 * 1000 },
  { action: "auth.sms.daily", limit: 15, windowMs: 24 * 60 * 60 * 1000 },
] as const;

const reply = (status: number, body: object) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
// Supabase hata gövdesi: { error: { http_code, message } }. Mesaj kullanıcıya gösterilebilir; iç ayrıntı içermez.
const fail = (status: number, message: string) => reply(status, { error: { http_code: status, message } });

export async function POST(request: NextRequest) {
  const secrets = process.env.SUPABASE_SEND_SMS_HOOK_SECRET;
  if (!secrets) return fail(503, "SMS gönderimi şu anda yapılandırılmadı.");
  if (Number(request.headers.get("content-length") || 0) > MAX_BODY_BYTES) return fail(413, "İstek çok büyük.");
  const body = await request.text();
  if (Buffer.byteLength(body) > MAX_BODY_BYTES) return fail(413, "İstek çok büyük.");

  const signed = verifyStandardWebhook(secrets, {
    id: request.headers.get("webhook-id"),
    timestamp: request.headers.get("webhook-timestamp"),
    signature: request.headers.get("webhook-signature"),
  }, body);
  if (!signed) return fail(401, "İstek doğrulanamadı.");

  let payload: SmsHookPayload;
  try { payload = JSON.parse(body) as SmsHookPayload; } catch { return fail(400, "Geçersiz istek."); }
  const otp = payload?.sms?.otp;
  if (typeof otp !== "string" || !/^\d{6,10}$/.test(otp)) return fail(400, "Geçersiz doğrulama kodu.");
  const phone = smsHookRecipient(payload ?? {});
  if (!phone) return fail(400, "Kod yalnızca Türkiye cep telefonu numaralarına gönderilir.");

  // Canlıda sahte sağlayıcı kodu göndermiş gibi davranmasın: kullanıcı kodu hiç almadan beklerdi.
  if (process.env.NODE_ENV === "production" && (process.env.SMS_PROVIDER ?? "").trim().toLowerCase() !== "netgsm") {
    return fail(503, "SMS gönderimi şu anda yapılandırılmadı.");
  }

  // Numara başına sınır: kısa sürede tekrar tekrar kod isteyerek SMS faturası şişirilemez. Numara ham tutulmaz.
  const identifier = crypto.createHash("sha256").update(phone).digest("hex").slice(0, 32);
  for (const limit of limits) {
    const result = await checkIdentifierRateLimitWithRedis({ ...limit, identifier });
    if (!result.allowed) return fail(429, "Bu numaraya çok fazla kod istendi. Biraz sonra tekrar dene.");
  }

  let provider;
  try { provider = getSmsProvider(); } catch { return fail(503, "SMS gönderimi şu anda yapılandırılmadı."); }
  const sent = await provider.sendOtp(phone.slice(2), otp, { message: authSmsText(otp), timeoutMs: PROVIDER_TIMEOUT_MS });
  if (!sent.ok) {
    logWarn("Auth SMS could not be delivered to the provider.", { phoneSuffix: phone.slice(-2) });
    return fail(502, "Kod gönderilemedi. Biraz sonra tekrar dene.");
  }
  return reply(200, {});
}
