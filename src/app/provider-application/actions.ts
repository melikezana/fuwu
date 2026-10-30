"use server";

import {
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

    if (process.env.NODE_ENV !== "production") {
      console.error("[Fuwu] Provider application submit action failed.", { code: appError.code, status: appError.statusCode });
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
