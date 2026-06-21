import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import {
  checkRateLimit,
  checkDatabaseRateLimit,
  type DatabaseRateLimitOptions,
  type RateLimitResult,
} from "@/lib/security/rateLimit";

export type IdentifierRateLimitOptions = {
  action: string;
  identifier: string;
  limit: number;
  windowMs: number;
};

type RedisClient = InstanceType<typeof Redis>;

let redisClient: RedisClient | null = null;
let redisClientResolved = false;

const rateLimiterCache = new Map<string, Ratelimit>();

function getSafeRedisKey(value: string, fallback: string) {
  return value.replace(/[^a-z0-9:._-]/gi, "").slice(0, 160) || fallback;
}

function getRedisClient() {
  if (redisClientResolved) {
    return redisClient;
  }

  redisClientResolved = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    redisClient = null;
    return redisClient;
  }

  redisClient = new Redis({
    token,
    url,
  });

  return redisClient;
}

function toUpstashDuration(windowMs: number): Duration {
  const safeWindowMs = Math.max(1, Math.ceil(windowMs));

  if (safeWindowMs % (24 * 60 * 60 * 1000) === 0) {
    return `${safeWindowMs / (24 * 60 * 60 * 1000)} d` as Duration;
  }

  if (safeWindowMs % (60 * 60 * 1000) === 0) {
    return `${safeWindowMs / (60 * 60 * 1000)} h` as Duration;
  }

  if (safeWindowMs % (60 * 1000) === 0) {
    return `${safeWindowMs / (60 * 1000)} m` as Duration;
  }

  if (safeWindowMs % 1000 === 0) {
    return `${safeWindowMs / 1000} s` as Duration;
  }

  return `${safeWindowMs} ms` as Duration;
}

function getRateLimiter(limit: number, windowMs: number, redis: RedisClient) {
  const safeLimit = Math.max(1, Math.floor(limit));
  const safeWindowMs = Math.max(1, Math.ceil(windowMs));
  const cacheKey = `${safeLimit}:${safeWindowMs}`;
  const cachedRateLimiter = rateLimiterCache.get(cacheKey);

  if (cachedRateLimiter) {
    return cachedRateLimiter;
  }

  const rateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(safeLimit, toUpstashDuration(safeWindowMs)),
    prefix: `fuwu:ratelimit:${safeLimit}:${safeWindowMs}`,
    timeout: 1500,
  });

  rateLimiterCache.set(cacheKey, rateLimiter);
  return rateLimiter;
}

function getRedisIdentifier(action: string, userId: string) {
  const safeAction = getSafeRedisKey(action, "unknown");
  const safeUserId = getSafeRedisKey(userId, "anonymous");

  return `${safeAction}:${safeUserId}`;
}

async function fallbackToDatabaseRateLimit(options: DatabaseRateLimitOptions) {
  return checkDatabaseRateLimit(options);
}

export async function checkRateLimitWithRedis(
  options: DatabaseRateLimitOptions,
): Promise<RateLimitResult> {
  const redis = getRedisClient();

  if (!redis) {
    return fallbackToDatabaseRateLimit(options);
  }

  try {
    const rateLimiter = getRateLimiter(options.limit, options.windowMs, redis);
    const result = await rateLimiter.limit(
      getRedisIdentifier(options.action, options.userId),
    );

    void result.pending.catch((error) => {
      console.error("[Fuwu] Upstash rate limit pending task failed.", {
        action: options.action,
        error,
      });
    });

    if (result.reason === "timeout") {
      return fallbackToDatabaseRateLimit(options);
    }

    return {
      allowed: result.success,
      limit: result.limit,
      remaining: Math.max(0, result.remaining),
      resetAt: result.reset,
    };
  } catch (error) {
    console.error("[Fuwu] Upstash rate limit check failed; using database fallback.", {
      action: options.action,
      error,
      userId: options.userId,
    });

    return fallbackToDatabaseRateLimit(options);
  }
}

export async function checkIdentifierRateLimitWithRedis({
  action,
  identifier,
  limit,
  windowMs,
}: IdentifierRateLimitOptions): Promise<RateLimitResult> {
  const safeAction = getSafeRedisKey(action, "unknown");
  const safeIdentifier = getSafeRedisKey(identifier, "anonymous");
  const fallback = () =>
    checkRateLimit({
      key: `${safeAction}:${safeIdentifier}`,
      limit,
      windowMs,
    });
  const redis = getRedisClient();

  if (!redis) {
    return fallback();
  }

  try {
    const rateLimiter = getRateLimiter(limit, windowMs, redis);
    const result = await rateLimiter.limit(`${safeAction}:${safeIdentifier}`);

    void result.pending.catch((error) => {
      console.error("[Fuwu] API rate limit pending task failed.", {
        action: safeAction,
        error,
      });
    });

    if (result.reason === "timeout") {
      return fallback();
    }

    return {
      allowed: result.success,
      limit: result.limit,
      remaining: Math.max(0, result.remaining),
      resetAt: result.reset,
    };
  } catch (error) {
    console.error("[Fuwu] API rate limit check failed; using local fallback.", {
      action: safeAction,
      error,
    });

    return fallback();
  }
}
