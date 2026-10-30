"use server";
import { revalidatePath } from "next/cache";
import { runProviderControl } from "@/services/admin/provider-control";
import type { ProviderControlInput } from "@/lib/providers/control";
export async function updateProviderStatusAction(input: ProviderControlInput) {
 const result = await runProviderControl(input);
 if (result.ok) {
  for (const path of ["/", "/providers", "/services", "/admin", "/admin/providers", "/admin/verifications", "/provider-dashboard"]) revalidatePath(path);
  revalidatePath("/providers/[id]", "page");
 }
 return result;
}
