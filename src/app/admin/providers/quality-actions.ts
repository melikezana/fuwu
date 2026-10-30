"use server";
import { redirect } from "next/navigation";
import { updateProviderStatusAction } from "./actions";
export async function reviewProviderQuality(form: FormData) {
 const status = String(form.get("status") ?? "");
 const action = ({ approved: "approve_quality", hidden: "unpublish", changes_requested: "changes_requested", pending_review: "pending_review" } as Record<string, string>)[status] ?? "invalid";
 const result = await updateProviderStatusAction({ providerId: String(form.get("providerId") ?? ""), action, reason: String(form.get("note") ?? ""), expectedVersion: String(form.get("version") ?? ""), requestId: String(form.get("requestId") ?? ""), fingerprint: String(form.get("fingerprint") ?? ""), verificationReference: String(form.get("verificationReference") ?? ""), recordKind: String(form.get("recordKind") ?? "unclassified") });
 redirect(`/admin/providers?quality=${result.ok ? "saved" : encodeURIComponent(result.code)}`);
}
