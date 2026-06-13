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
  const windowStartIso = new Date(windowStart).toISOString();
  const resetAt = windowStart + windowMs;

  try {
    const { data: currentBucket, error: lookupError } = await supabase
      .from("rate_limits")
      .select("id, count")
      .eq("user_id", userId)
      .eq("action", safeAction)
      .eq("window_start", windowStartIso)
      .maybeSingle();

    if (lookupError) {
      throw lookupError;
    }

    const currentCount = Number(currentBucket?.count ?? 0);

    if (currentCount >= limit) {
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetAt,
      };
    }

    const nextCount = currentCount + 1;
    const writeResult = currentBucket?.id
      ? await supabase
          .from("rate_limits")
          .update({
            count: nextCount,
            updated_at: new Date(now).toISOString(),
          })
          .eq("id", currentBucket.id)
      : await supabase.from("rate_limits").insert({
          action: safeAction,
          count: nextCount,
          user_id: userId,
          window_start: windowStartIso,
        });

    if (writeResult.error) {
      throw writeResult.error;
    }

    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - nextCount),
      resetAt,
    };
  } catch (error) {
    console.error("[Fuwu] Persistent rate limit check failed; using local fallback.", {
      action: safeAction,
      error,
      userId,
    });

    return checkRateLimit({
      key: `${safeAction}:${userId}`,
      limit,
      now,
      windowMs,
    });
  }
}
