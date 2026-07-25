"use server";

import { revalidatePath } from "next/cache";
import { deleteAdminReview, type AdminActionResult } from "@/services/admin/sections";

export async function deleteReviewAction(
  formData: FormData,
): Promise<AdminActionResult> {
  const id = String(formData.get("reviewId") ?? "");
  const result = await deleteAdminReview(id);
  if (result.ok) {
    revalidatePath("/admin/reviews");
  }
  return result;
}
