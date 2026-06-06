"use server";

import { createEmergencyMatchRequest } from "@/services/requests/emergency";
import type { ServiceRequestInput, ServiceRequestSubmitResult } from "@/types/request";

export async function createEmergencyRequestAction(
  input: ServiceRequestInput,
): Promise<ServiceRequestSubmitResult> {
  return createEmergencyMatchRequest(input);
}
