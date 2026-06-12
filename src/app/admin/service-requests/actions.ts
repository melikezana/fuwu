"use server";

import { assignAdminServiceRequest } from "@/services/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function assignServiceRequestAction(formData: FormData) {
  const requestIdValue = formData.get("requestId");
  const providerIdValue = formData.get("providerId");
  const requestId = typeof requestIdValue === "string" ? requestIdValue.trim() : "";
  const providerId = typeof providerIdValue === "string" ? providerIdValue.trim() : "";
  let resultCode = "service-request-action-failed";

  try {
    if (!requestId) {
      resultCode = "service-request-missing-id";
    } else if (!providerId) {
      resultCode = "service-request-missing-provider";
    } else {
      const result = await assignAdminServiceRequest(requestId, providerId);
      resultCode = result.code;
    }
  } catch (error) {
    console.error("[Fuwu] Admin service request assignment action failed.", {
      providerId,
      requestId,
      payloadKeys: Array.from(formData.keys()),
      error,
    });
  }

  revalidatePath("/admin/service-requests");
  revalidatePath("/provider-dashboard/requests");
  revalidatePath("/dashboard/requests");
  redirect(`/admin/service-requests?requestAction=${encodeURIComponent(resultCode)}`);
}
