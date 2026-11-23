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
    // Önbellek yalnızca kullanıcıdan bağımsız değerlendirmeyi tutar; bir kullanıcının konuşma
    // kimliği ya da yüklediği görselin referansı başka bir kullanıcıya dönmez.
    response: {
      ...response,
      cached: false,
      conversationId: null,
      imageReference: null,
    },
  });
}

