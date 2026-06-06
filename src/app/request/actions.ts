"use server";

import { createEmergencyMatchRequest } from "@/services/requests/emergency";
import { createAuthenticatedServiceRequest } from "@/services/requests";
import type { ServiceRequestInput, ServiceRequestSubmitResult } from "@/types/request";

export async function createServiceRequestAction(
  input: ServiceRequestInput,
): Promise<ServiceRequestSubmitResult> {
  return createAuthenticatedServiceRequest(input);
}

export async function createEmergencyRequestAction(
  input: ServiceRequestInput,
): Promise<ServiceRequestSubmitResult> {
  return createEmergencyMatchRequest(input);
}
