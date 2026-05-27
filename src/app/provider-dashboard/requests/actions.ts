"use server";

import { updateProviderAssignedRequestStatus } from "@/services/requests";
import { getProviderDashboardAccess } from "@/services/providers/dashboard";
import { revalidatePath } from "next/cache";

export async function providerUpdateRequestStatusAction(formData: FormData) {
  const requestId = formData.get("requestId") as string;
  const status = formData.get("status") as
    | "accepted"
    | "on_the_way"
    | "completed"
    | "cancelled"
    | "tamamlandi"
    | "iptal";

  if (!requestId || !status) return;

  const access = await getProviderDashboardAccess();
  if (!access.ok) return;

  await updateProviderAssignedRequestStatus(requestId, access.profile.id, status);
  revalidatePath("/provider-dashboard/requests");
}
