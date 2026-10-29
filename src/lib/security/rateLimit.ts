import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type RateLimitOptions = {
  key: string;
  limit: number;
  now?: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

export type DatabaseRateLimitOptions = {
  action: string;
  limit: number;
  now?: number;
  supabase: SupabaseClient<Database>;
  userId: string;
  windowMs: number;
};

const memoryBuckets = new Map<string, RateLimitBucket>();

function getBucketKey(key: string) {
  return key.replace(/[^a-z0-9:_-]/gi, "").slice(0, 120) || "anonymous";
}

export function checkRateLimit({
  key,
  limit,
  now = Date.now(),
  windowMs,
}: RateLimitOptions): RateLimitResult {
  const bucketKey = getBucketKey(key);
  const currentBucket = memoryBuckets.get(bucketKey);

  if (!currentBucket || currentBucket.resetAt <= now) {
    const resetAt = now + windowMs;
    memoryBuckets.set(bucketKey, {
      count: 1,
      resetAt,
    });

    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - 1),
      resetAt,
    };
  }

  currentBucket.count += 1;

  return {
    allowed: currentBucket.count <= limit,
    limit,
    remaining: Math.max(0, limit - currentBucket.count),
    resetAt: currentBucket.resetAt,
  };
}

export function resetRateLimit(key?: string) {
  if (!key) {
    memoryBuckets.clear();
    return;
  }

  memoryBuckets.delete(getBucketKey(key));
}

// This in-memory helper is a safe local foundation only. Use Upstash/Redis for shared
// production rate limits across Vercel regions and serverless instances.

function getWindowStart(now: number, windowMs: number) {
  return Math.floor(now / windowMs) * windowMs;
}

function getSafeAction(action: string) {
  return action.replace(/[^a-z0-9:._-]/gi, "").slice(0, 80) || "unknown";
}

export async function checkDatabaseRateLimit({
  action,
  limit,
  now = Date.now(),
  supabase,
  userId,
  windowMs,
}: DatabaseRateLimitOptions): Promise<RateLimitResult> {
  const safeAction = getSafeAction(action);
  const windowStart = getWindowStart(now, windowMs);
  const resetAt = windowStart + windowMs;

  try {
    const {data,error}=await supabase.rpc("consume_user_rate_limit", {p_action:safeAction,p_limit:limit,p_window_ms:windowMs}).abortSignal(AbortSignal.timeout(2000));
    if(error || !data || typeof data!=="object" || Array.isArray(data)) throw new Error("rate_limit_unavailable");
    const result=data as Record<string,unknown>;
    if(typeof result.allowed!=="boolean" || result.limit!==limit || !Number.isSafeInteger(result.remaining) || !Number.isSafeInteger(result.resetAt)) throw new Error("rate_limit_unavailable");
    return {allowed:result.allowed,limit,remaining:result.remaining as number,resetAt:result.resetAt as number};
  } catch {
    console.error("[Fuwu] Persistent rate limit unavailable.", {action:safeAction});
    if(process.env.NODE_ENV === "production") return {allowed:false,limit,remaining:0,resetAt};

    return checkRateLimit({
      key: `${safeAction}:${userId}`,
      limit,
      now,
      windowMs,
    });
  }
}
