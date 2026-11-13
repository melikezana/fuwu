"use server";
import { revalidatePath } from "next/cache";
import { saveWaitlistPreference, withdrawWaitlistMarketingConsent, withdrawWaitlistPreference } from "@/services/waitlist";

export async function saveInterestAction(form: FormData) {
  const result = await saveWaitlistPreference({
    districtId: String(form.get("districtId") ?? ""),
    categoryId: String(form.get("categoryId") ?? ""),
    noticeAcknowledged: form.get("noticeAcknowledged") === "on",
    noticeVersion: String(form.get("noticeVersion") ?? ""),
    marketingEmail: form.get("marketingEmail") === "on",
    marketingVersion: String(form.get("marketingVersion") ?? ""),
    website: String(form.get("website") ?? ""),
  });
  if (result.ok) { revalidatePath("/admin"); revalidatePath("/waitlist"); }
  return result;
}

export async function withdrawInterestAction() {
  const result = await withdrawWaitlistPreference();
  if (result.ok) { revalidatePath("/admin"); revalidatePath("/waitlist"); }
  return result;
}

export async function withdrawMarketingAction() {
  const result = await withdrawWaitlistMarketingConsent();
  if (result.ok) { revalidatePath("/admin"); revalidatePath("/waitlist"); }
  return result;
}
