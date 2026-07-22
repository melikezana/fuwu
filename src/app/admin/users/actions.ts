"use server";

import { revalidatePath } from "next/cache";
import {
  updateAdminUserRole,
  type UpdateUserRoleResult,
} from "@/services/admin/users";

export async function changeUserRoleAction(
  formData: FormData,
): Promise<UpdateUserRoleResult> {
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");

  const result = await updateAdminUserRole(userId, role);

  if (result.ok) {
    revalidatePath("/admin/users");
  }

  return result;
}
