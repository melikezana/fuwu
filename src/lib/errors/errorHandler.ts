import * as Sentry from "@sentry/nextjs";
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
    return error.name;
  }

  if (isSupabaseLikeError(error) && typeof error.message === "string") {
    return "database_failure";
  }

  return "Unknown service error.";
}

function getSupabaseLogPayload(error: SupabaseLikeError) {
  return {
    code: typeof error.code === "string" ? error.code : undefined,
    status: typeof error.status === "number" ? error.status : undefined,
  };
}

function captureCriticalError(appError: AppError) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return;
  }

  if (!(appError instanceof DatabaseError) && appError.statusCode < 500) {
    return;
  }

  // Raw exceptions and their causes can contain SQL values, addresses or payment tokens.
  Sentry.captureException(new Error("Service operation failed."), {
    tags: {
      appErrorCode: appError.code,
      appErrorName: appError.name,
    },
  });
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
    captureCriticalError(error);
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

    const databaseError = new DatabaseError(
      options.message ?? "Supabase operation failed.",
      {
      cause: error,
      code: options.code ?? errorCodes.database,
      publicMessage,
      statusCode: options.statusCode ?? 500,
      },
    );

    captureCriticalError(databaseError);
    return databaseError;
  }

  logError(options.logContext ?? "Unexpected service error.", {
    error: getErrorMessage(error),
  });

  const appError = new AppError(options.message ?? "Unexpected service error.", {
    cause: error,
    code: options.code ?? errorCodes.service,
    publicMessage,
    statusCode: options.statusCode ?? 500,
  });

  captureCriticalError(appError);
  return appError;
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
