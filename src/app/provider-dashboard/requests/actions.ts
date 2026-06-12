"use server";

import {
  respondToProviderAssignedRequest,
  updateProviderAssignedRequestStatus,
} from "@/services/requests";
import { getServerAuthContext } from "@/services/auth/server";
import { getProviderDashboardAccess } from "@/services/providers/dashboard";
import { isUuid } from "@/lib/utils/validation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const providerRequestsPath = "/provider-dashboard/requests";

type ProviderRequestStatusInput =
  | "accepted"
  | "rejected"
  | "on_the_way"
  | "completed"
  | "cancelled"
  | "tamamlandi"
  | "iptal";

function getProviderActionRedirectUrl(code: string) {
  return `${providerRequestsPath}?requestAction=${encodeURIComponent(code)}`;
}

export async function providerUpdateRequestStatusAction(formData: FormData) {
  const requestIdValue = formData.get("requestId");
  const statusValue = formData.get("status");
  const requestId = typeof requestIdValue === "string" ? requestIdValue.trim() : "";
  const status =
    typeof statusValue === "string"
      ? (statusValue.trim() as ProviderRequestStatusInput)
      : "";
  let resultCode = "request-action-failed";

  try {
    if (!requestId || !isUuid(requestId) || !status) {
      resultCode = "request-invalid-id";
    } else {
      const access = await getProviderDashboardAccess();

      if (!access.ok) {
        resultCode = "provider-not-authorized";
      } else {
        const authContext = await getServerAuthContext();

        if (!authContext.supabase) {
          resultCode = "supabase-not-configured";
        } else if (status === "accepted" || status === "rejected") {
          const result = await respondToProviderAssignedRequest(
            requestId,
            access.profile.id,
            status === "accepted" ? "accept" : "reject",
            authContext.supabase,
          );
          resultCode = result.code;
        } else {
          const ok = await updateProviderAssignedRequestStatus(
            requestId,
            access.profile.id,
            status,
            authContext.supabase,
          );
          resultCode = ok ? "request-updated" : "request-action-failed";
        }
      }
    }
  } catch (error) {
    console.error("[Fuwu] Provider request action failed.", {
      action: status,
      providerId: undefined,
      requestId,
      error,
    });
  }

  revalidatePath(providerRequestsPath);
  revalidatePath("/provider-dashboard");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/requests");
  revalidatePath("/account");
  revalidatePath("/account/requests");
  revalidatePath("/admin/service-requests");
  redirect(getProviderActionRedirectUrl(resultCode));
}
