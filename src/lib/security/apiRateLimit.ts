import type { NextRequest } from "next/server";
import { checkIdentifierRateLimitWithRedis } from "@/lib/security/rateLimitRedis";

type ApiRateLimitOptions = {
  action: string;
  limit: number;
  windowMs: number;
};

function getRequestIdentifier(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();

  return forwardedFor || realIp || "anonymous";
}

export async function checkApiRateLimit(
  request: NextRequest,
  options: ApiRateLimitOptions,
) {
  return checkIdentifierRateLimitWithRedis({
    ...options,
    identifier: getRequestIdentifier(request),
  });
}

export function getApiRateLimitHeaders(result: {
  limit: number;
  remaining: number;
  resetAt: number;
}) {
  return {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    "Retry-After": String(Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))),
  };
}
