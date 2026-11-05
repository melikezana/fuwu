"use server";

import { revalidatePath } from "next/cache";
import { updateSupportMessage } from "@/services/admin/support";

export async function updateSupportMessageAction(formData: FormData): Promise<void> {
  const note = formData.get("note");
  const result = await updateSupportMessage({
    id: String(formData.get("id") ?? ""),
    note: note === null ? undefined : String(note),
    status: String(formData.get("status") ?? ""),
  });
  if (result.ok) {
    revalidatePath("/admin/support");
    revalidatePath("/admin");
  }
}
