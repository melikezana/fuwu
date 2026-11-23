import { timingSafeEqual } from "node:crypto";

// Cron anahtarı sabit sürede karşılaştırılır; yanıt süresinden anahtar tahmin edilemez.
export function isAuthorizedCronRequest(authorization: string | null | undefined, secret = process.env.CRON_SECRET) {
  const expected = secret?.trim();
  if (!expected) return false;
  const actual = Buffer.from(authorization?.trim() ?? "");
  const wanted = Buffer.from(`Bearer ${expected}`);
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}

// Tüm cron uçları için tek yetki kararı. Anahtar tanımlı olmasa da dışarıya
// yalnızca 401 döner; yapılandırma durumu yanıt kodundan okunamaz.
export function getCronAuthorizationError(request: Request, secret = process.env.CRON_SECRET) {
  if (isAuthorizedCronRequest(request.headers.get("authorization"), secret)) return null;
  return { message: "Unauthorized.", status: 401 as const, configured: Boolean(secret?.trim()) };
}
