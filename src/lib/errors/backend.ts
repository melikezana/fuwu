import { logError } from "@/lib/logger";

type SupabaseLikeError = {
  code?: unknown;
  details?: unknown;
  hint?: unknown;
  message?: unknown;
};

export const SAFE_BACKEND_ERROR_MESSAGES = {
  generic: "İşlem tamamlanamadı. Lütfen tekrar deneyin.",
  forbidden: "Bu işlem için yetkin yok.",
  invalid: "Geçersiz işlem.",
  notFound: "Kayıt bulunamadı.",
} as const;

export type BackendErrorLogContext = {
  action: string;
  actorUserId?: string | null;
  context: string;
  error: unknown;
  payload?: Record<string, unknown>;
  payloadKeys?: string[];
  table?: string;
};

function isSupabaseLikeError(error: unknown): error is SupabaseLikeError {
  return (
    typeof error === "object" &&
    error !== null &&
    ("code" in error || "details" in error || "hint" in error || "message" in error)
  );
}

function getSupabaseErrorDetails(error: unknown) {
  if (!isSupabaseLikeError(error)) {
    return undefined;
  }

  return {
    code: typeof error.code === "string" ? error.code : undefined,
    details: typeof error.details === "string" ? error.details : undefined,
    hint: typeof error.hint === "string" ? error.hint : undefined,
    message: typeof error.message === "string" ? error.message : undefined,
  };
}

function getErrorSummary(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
    };
  }

  if (isSupabaseLikeError(error)) {
    return getSupabaseErrorDetails(error);
  }

  return {
    message: "Unknown backend error.",
  };
}

export function logBackendError({
  action,
  actorUserId,
  context,
  error,
  payload,
  payloadKeys,
  table,
}: BackendErrorLogContext) {
  logError(context, {
    action,
    actorUserId,
    error: getErrorSummary(error),
    payloadKeys: payloadKeys ?? (payload ? Object.keys(payload) : undefined),
    supabase: getSupabaseErrorDetails(error),
    table,
  });
}
