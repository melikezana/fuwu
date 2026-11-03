import { timingSafeEqual } from "node:crypto";

// Cron anahtarı sabit sürede karşılaştırılır; yanıt süresinden anahtar tahmin edilemez.
export function isAuthorizedCronRequest(authorization: string | null | undefined, secret = process.env.CRON_SECRET) {
  const expected = secret?.trim();
  if (!expected) return false;
  const actual = Buffer.from(authorization?.trim() ?? "");
  const wanted = Buffer.from(`Bearer ${expected}`);
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}
