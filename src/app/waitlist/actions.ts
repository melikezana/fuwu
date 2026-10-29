"use server";
import { revalidatePath } from "next/cache";
import { saveWaitlistPreference, withdrawWaitlistPreference } from "@/services/waitlist";
export async function saveInterestAction(form: FormData) {
  const result = await saveWaitlistPreference({ districtId: String(form.get("districtId") ?? ""), categoryId: String(form.get("categoryId") ?? ""), consent: form.get("consent") === "on", version: String(form.get("version") ?? ""), website: String(form.get("website") ?? "") });
  if (result.ok) revalidatePath("/admin");
  return result;
}
export async function withdrawInterestAction() {
  const result = await withdrawWaitlistPreference();
  if (result.ok) revalidatePath("/admin");
  return result;
}
