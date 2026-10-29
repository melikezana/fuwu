"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerAuthContext } from "@/services/auth/server";
import { hasAdminRole } from "@/services/auth/constants";
import { isUuid } from "@/lib/utils/validation";
import { checkRateLimitWithRedis } from "@/lib/security/rateLimitRedis";
export async function reviewProviderQuality(form: FormData) {
  const { supabase, user, profile } = await getServerAuthContext();
  if (!supabase || !user || !hasAdminRole(profile)) redirect("/admin/providers?quality=forbidden#profile-quality");
  const id = String(form.get("providerId") || "");
  const note = String(form.get("note") || "").trim();
  const status = String(form.get("status") || "");
  const fingerprint = String(form.get("fingerprint") || "");
  const reference = String(form.get("verificationReference") || "").trim();
  const recordKind = String(form.get("recordKind") || "unclassified");
  if (!["real", "test", "unclassified"].includes(recordKind)) redirect("/admin/providers?quality=invalid#profile-quality");
  if (!isUuid(id) || !/^[a-f0-9]{32}$/.test(fingerprint) || note.length < 10 || note.length > 1000 || reference.length > 500 || !["approved", "changes_requested", "hidden", "pending_review"].includes(status)) redirect("/admin/providers?quality=invalid#profile-quality");
  const rate = await checkRateLimitWithRedis({ supabase, userId: user.id, action: "provider.quality_review", limit: 30, windowMs: 60000 });
  if (!rate.allowed) redirect("/admin/providers?quality=rate#profile-quality");
  const { error } = await supabase.rpc("review_provider_publication", { p_provider_id: id, p_fingerprint: fingerprint, p_status: status, p_note: note, p_verification_reference: reference || null, p_record_kind: recordKind });
  if (error) redirect("/admin/providers?quality=failed#profile-quality");
  for (const path of ["/", "/providers", "/services", "/admin/providers"]) revalidatePath(path);
  revalidatePath(`/providers/${id}`);
  redirect("/admin/providers?quality=saved#profile-quality");
}
