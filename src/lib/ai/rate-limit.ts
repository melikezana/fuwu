import type { AssistantAnalyzeResponse } from "./assistant-schema";

export const aiAssistantRateLimitConfig = {
  action: "api.ai-assistant.analyze",
  limit: 8,
  windowMs: 10 * 60 * 1000,
} as const;

type CachedAssistantResponse = {
  expiresAt: number;
  response: AssistantAnalyzeResponse;
};

const assistantResponseCache = new Map<string, CachedAssistantResponse>();
const cacheTtlMs = 5 * 60 * 1000;

export function getCachedAssistantResponse(cacheKey: string) {
  const cached = assistantResponseCache.get(cacheKey);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    assistantResponseCache.delete(cacheKey);
    return null;
  }

  return {
    ...cached.response,
    cached: true,
  } satisfies AssistantAnalyzeResponse;
}

export function setCachedAssistantResponse(
  cacheKey: string,
  response: AssistantAnalyzeResponse,
) {
  assistantResponseCache.set(cacheKey, {
    expiresAt: Date.now() + cacheTtlMs,
    response: {
      ...response,
      cached: false,
    },
  });
}

