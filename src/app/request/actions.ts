"use server";

import { createEmergencyMatchRequest } from "@/services/requests/emergency";
import {
  cancelAuthenticatedServiceRequest,
  createAuthenticatedServiceRequest,
  serviceRequestSubmitErrorMessage,
} from "@/services/requests";
import { getPublicErrorMessage } from "@/lib/errors";
import { getServerAuthContext } from "@/services/auth/server";
import type { ServiceRequestInput, ServiceRequestSubmitResult } from "@/types/request";

export type ServiceRequestActionResult =
  | {
      data: ServiceRequestSubmitResult;
      ok: true;
    }
  | {
      message: string;
      ok: false;
    };

const emergencyRequestSubmitErrorMessage =
  "Acil çağrı şu anda başlatılamadı. Seçimlerin korunarak devam edebilirsin.";

function createActionSuccess(data: ServiceRequestSubmitResult): ServiceRequestActionResult {
  return {
    data,
    ok: true,
  };
}

function createActionFailure(error: unknown, fallbackMessage: string): ServiceRequestActionResult {
  return {
    message: getPublicErrorMessage(error, fallbackMessage),
    ok: false,
  };
}

export async function createServiceRequestAction(
  input: ServiceRequestInput,
): Promise<ServiceRequestActionResult> {
  try {
    const authContext = await getServerAuthContext();

    return createActionSuccess(await createAuthenticatedServiceRequest(input, authContext));
  } catch (error) {
    return createActionFailure(error, serviceRequestSubmitErrorMessage);
  }
}

export async function createEmergencyRequestAction(
  input: ServiceRequestInput,
): Promise<ServiceRequestActionResult> {
  try {
    const authContext = await getServerAuthContext();

    return createActionSuccess(await createEmergencyMatchRequest(input, authContext));
  } catch (error) {
    return createActionFailure(error, emergencyRequestSubmitErrorMessage);
  }
}

export async function cancelServiceRequestAction(
  requestId: string,
): Promise<{ message?: string; ok: boolean }> {
  try {
    const authContext = await getServerAuthContext();

    await cancelAuthenticatedServiceRequest(requestId, authContext);

    return { ok: true };
  } catch (error) {
    return {
      message: getPublicErrorMessage(error, "İşlem tamamlanamadı. Lütfen tekrar deneyin."),
      ok: false,
    };
  }
}
