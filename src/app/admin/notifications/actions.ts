"use server";

import { revalidatePath } from "next/cache";
import {
  sendAdminNotification,
  type SendNotificationResult,
} from "@/services/admin/notifications";

export async function sendNotificationAction(
  formData: FormData,
): Promise<SendNotificationResult> {
  const target = String(formData.get("target") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const title = String(formData.get("title") ?? "");
  const body = String(formData.get("body") ?? "");

  const result = await sendAdminNotification({ body, target, title, userId });
  if (result.ok) revalidatePath("/admin/notifications");
  return result;
}
