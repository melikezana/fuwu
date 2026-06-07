"use server";

import { createEmergencyMatchRequest } from "@/services/requests/emergency";
import {
  createAuthenticatedServiceRequest,
  serviceRequestSubmitErrorMessage,
} from "@/services/requests";
import { getPublicErrorMessage } from "@/lib/errors";
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
    return createActionSuccess(await createAuthenticatedServiceRequest(input));
  } catch (error) {
    return createActionFailure(error, serviceRequestSubmitErrorMessage);
  }
}

export async function createEmergencyRequestAction(
  input: ServiceRequestInput,
): Promise<ServiceRequestActionResult> {
  try {
    return createActionSuccess(await createEmergencyMatchRequest(input));
  } catch (error) {
    return createActionFailure(error, emergencyRequestSubmitErrorMessage);
  }
}
