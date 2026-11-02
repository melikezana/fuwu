import { NextResponse, type NextRequest } from "next/server";
import { checkApiRateLimit, getApiRateLimitHeaders } from "@/lib/security";
import { checkIdentifierRateLimitWithRedis } from "@/lib/security/rateLimitRedis";

// Commerce uçları için ortak hız sınırı. Oturum varsa kullanıcıya, yoksa IP'ye göre sayar.
// Sınır servisi hata verirse istek engellenmez (mevcut graceful degradation ilkesi).
export async function commerceRateLimit(request: NextRequest, action: string, limit: number, windowMs: number, userId?: string | null) {
  try {
    const result = userId
      ? await checkIdentifierRateLimitWithRedis({ action, identifier: `user:${userId}`, limit, windowMs })
      : await checkApiRateLimit(request, { action, limit, windowMs });
    if (result.allowed) return null;
    return NextResponse.json({ error: "rate_limit" }, { status: 429, headers: getApiRateLimitHeaders(result) });
  } catch {
    return null;
  }
}
