import crypto from "node:crypto";

/**
 * Supabase Auth "Send SMS" kancası yardımcıları.
 * Supabase her doğrulama kodunu bu kanca üzerinden gönderir: giriş, kayıt ve telefon değişikliği.
 * İstek Standard Webhooks biçiminde imzalanır; imzası tutmayan istek SMS göndermez.
 */

const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;

export type SmsHookPayload = {
  sms?: { otp?: unknown; phone?: unknown };
  user?: { phone?: unknown; new_phone?: unknown; phone_change?: unknown };
};

type WebhookHeaders = { id: string | null; timestamp: string | null; signature: string | null };

function secretKey(secret: string): Buffer | null {
  const encoded = secret.trim().replace(/^v1,/, "").replace(/^whsec_/, "");
  if (!encoded || !/^[A-Za-z0-9+/=_-]+$/.test(encoded)) return null;
  const key = Buffer.from(encoded, "base64");
  return key.length >= 16 ? key : null;
}

/** Standard Webhooks v1 imzası: HMAC-SHA256(gizli anahtar, "id.zaman.gövde"), sabit sürede karşılaştırılır. */
export function verifyStandardWebhook(secrets: string | undefined, headers: WebhookHeaders, body: string, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  if (!secrets || !headers.id || !headers.timestamp || !headers.signature) return false;
  if (!/^\d{1,12}$/.test(headers.timestamp) || Math.abs(nowSeconds - Number(headers.timestamp)) > TIMESTAMP_TOLERANCE_SECONDS) return false;
  const signed = `${headers.id}.${headers.timestamp}.${body}`;
  // Supabase anahtar değişiminde birden çok anahtarı "|" ile ayırarak gönderir.
  return secrets.split("|").some(secret => {
    const key = secretKey(secret);
    if (!key) return false;
    const expected = crypto.createHmac("sha256", key).update(signed).digest();
    return headers.signature!.split(" ").some(part => {
      const [version, value] = part.split(",", 2);
      if (version !== "v1" || !value) return false;
      const candidate = Buffer.from(value, "base64");
      return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
    });
  });
}

/** Yalnızca Türkiye cep numaraları: 905XXXXXXXXX. Diğer her şey reddedilir (SMS pompalama koruması). */
export function normalizeTurkishMobile(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("0090")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("05")) digits = `9${digits}`;
  if (digits.length === 10 && digits.startsWith("5")) digits = `90${digits}`;
  return /^905\d{9}$/.test(digits) ? digits : null;
}

/**
 * Kodun gideceği numara. Telefon değişikliğinde kod yeni numaraya gider; ilk dolu alan esas alınır
 * ve yabancı numaraysa başka alana geçilmeden reddedilir.
 */
export function smsHookRecipient(payload: SmsHookPayload): string | null {
  const candidates = [payload.sms?.phone, payload.user?.new_phone, payload.user?.phone_change, payload.user?.phone];
  const first = candidates.find(value => typeof value === "string" && value.trim() !== "");
  return first === undefined ? null : normalizeTurkishMobile(first);
}

export const authSmsText = (otp: string) => `FUWU doğrulama kodun: ${otp}. Bu kodu kimseyle paylaşma; FUWU kodunu asla sormaz.`;
