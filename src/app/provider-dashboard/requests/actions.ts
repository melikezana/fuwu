"use server";

import { updateProviderAssignedRequestStatus } from "@/services/requests";
import { getServerAuthContext } from "@/services/auth/server";
import { getProviderDashboardAccess } from "@/services/providers/dashboard";
import { isUuid } from "@/lib/utils/validation";
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

  if (!requestId || !isUuid(requestId) || !status) return;

  const access = await getProviderDashboardAccess();
  if (!access.ok) return;
  const authContext = await getServerAuthContext();
  if (!authContext.supabase) return;

  await updateProviderAssignedRequestStatus(requestId, access.profile.id, status, authContext.supabase);
  revalidatePath("/provider-dashboard/requests");
}
