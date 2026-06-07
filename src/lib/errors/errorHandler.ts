import { logError, logWarn } from "@/lib/logger";
import { AppError } from "./AppError";
import {
  DatabaseError,
  errorCodes,
  type AppErrorCode,
  publicErrorMessages,
} from "./errorTypes";

type SupabaseLikeError = {
  code?: unknown;
  details?: unknown;
  hint?: unknown;
  message?: unknown;
  status?: unknown;
};

export type HandleServiceErrorOptions = {
  code?: AppErrorCode;
  logContext?: string;
  message?: string;
  publicMessage?: string;
  statusCode?: number;
  tableName?: string;
  payloadKeys?: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSupabaseLikeError(error: unknown): error is SupabaseLikeError {
  return (
    isRecord(error) &&
    typeof error.message === "string" &&
    ("code" in error || "details" in error || "hint" in error || "status" in error)
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (isSupabaseLikeError(error) && typeof error.message === "string") {
    return error.message;
  }

  return "Unknown service error.";
}

function getSupabaseLogPayload(error: SupabaseLikeError) {
  return {
    code: typeof error.code === "string" ? error.code : undefined,
    details: typeof error.details === "string" ? error.details : undefined,
    hint: typeof error.hint === "string" ? error.hint : undefined,
    message: typeof error.message === "string" ? error.message : undefined,
    status: typeof error.status === "number" ? error.status : undefined,
  };
}

export function handleServiceError(
  error: unknown,
  options: HandleServiceErrorOptions = {},
): AppError {
  const publicMessage = options.publicMessage ?? publicErrorMessages.service;

  if (error instanceof AppError) {
    logWarn(options.logContext ?? "Handled service error.", {
      code: error.code,
      statusCode: error.statusCode,
    });
    return error;
  }

  if (isSupabaseLikeError(error)) {
    const isDev = process.env.NODE_ENV !== "production";
    logError(options.logContext ?? "Supabase service error.", {
      error: getSupabaseLogPayload(error),
      diagnostics: isDev ? {
        table: options.tableName,
        keys: options.payloadKeys,
      } : undefined,
    });

    return new DatabaseError(options.message ?? "Supabase operation failed.", {
      cause: error,
      code: options.code ?? errorCodes.database,
      publicMessage,
      statusCode: options.statusCode ?? 500,
    });
  }

  logError(options.logContext ?? "Unexpected service error.", {
    error: getErrorMessage(error),
  });

  return new AppError(options.message ?? "Unexpected service error.", {
    cause: error,
    code: options.code ?? errorCodes.service,
    publicMessage,
    statusCode: options.statusCode ?? 500,
  });
}

export function getPublicErrorMessage(
  error: unknown,
  fallbackMessage: string = publicErrorMessages.service,
) {
  if (error instanceof AppError) {
    return error.publicMessage;
  }

  return fallbackMessage;
}

export function getErrorStatusCode(error: unknown, fallbackStatusCode = 500) {
  if (error instanceof AppError) {
    return error.statusCode;
  }

  return fallbackStatusCode;
}
