"use server";

import {
  AppError,
  AuthError,
  errorCodes,
  getPublicErrorMessage,
  handleServiceError,
} from "@/lib/errors";
import { submitProviderApplication } from "@/services/providers/applications";
import type {
  ProviderApplicationInput,
  ProviderApplicationSubmitActionResult,
} from "@/types/provider";

const providerApplicationSubmitErrorMessage =
  "Başvuru gönderilemedi. Lütfen tekrar deneyin.";

function getRecordMessage(value: unknown) {
  return typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string"
    ? value.message
    : null;
}

function getDebugMessage(error: unknown) {
  if (error instanceof AppError) {
    const causeMessage = getRecordMessage((error as Error & { cause?: unknown }).cause);

    return causeMessage ? `${error.message}: ${causeMessage}` : error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return getRecordMessage(error) ?? "Unknown provider application submit error.";
}

export async function submitProviderApplicationAction(
  input: ProviderApplicationInput,
): Promise<ProviderApplicationSubmitActionResult> {
  try {
    const result = await submitProviderApplication(input);

    return {
      ok: true,
      result,
    };
  } catch (error) {
    const appError = handleServiceError(error, {
      logContext: "Provider application submit action failed.",
      publicMessage: providerApplicationSubmitErrorMessage,
    });
    const debugMessage = getDebugMessage(appError);

    if (process.env.NODE_ENV !== "production") {
      console.error("[Fuwu] Provider application submit action failed.", debugMessage);
    }

    return {
      errorCode:
        appError instanceof AuthError || appError.code === errorCodes.auth
          ? "auth-required"
          : appError.statusCode === 429
            ? "rate-limit"
            : appError.code === errorCodes.validation
              ? "validation"
              : "server",
      message: getPublicErrorMessage(appError, providerApplicationSubmitErrorMessage),
      ok: false,
    };
  }
}
