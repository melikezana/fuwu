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
