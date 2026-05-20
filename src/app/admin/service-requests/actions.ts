"use server";

import { assignAdminServiceRequest } from "@/services/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function assignServiceRequestAction(formData: FormData) {
  const requestId = formData.get("requestId") as string;
  const providerId = formData.get("providerId") as string;

  if (!requestId || !providerId) return;

  const result = await assignAdminServiceRequest(requestId, providerId);
  revalidatePath("/admin/service-requests");
  redirect(`/admin/service-requests?requestAction=${encodeURIComponent(result.code)}`);
}
