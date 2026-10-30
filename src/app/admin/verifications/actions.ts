"use server";
import { revalidatePath } from "next/cache";
import { getServerAuthContext } from "@/services/auth/server";
import { hasAdminRole } from "@/services/auth/constants";
import { isUuid } from "@/lib/utils/validation";
import type { Json } from "@/lib/supabase/types";
export type TrustActionResult = { ok: boolean; message: string };
export async function trustAdminAction(_: TrustActionResult, form: FormData): Promise<TrustActionResult> {
 try {
  const { supabase, user, profile } = await getServerAuthContext();
  if (!supabase || !user || !hasAdminRole(profile)) return { ok: false, message: "Yetkili oturum gerekli." };
  const reason = String(form.get("reason") ?? "").trim();
  if (reason.length < 10 || reason.length > 1000) return { ok: false, message: "En az 10 karakterlik gerekçe yaz." };
  const kind = form.get("kind"), id = String(form.get("id") ?? "");
  let error;
  if (kind === "document" && isUuid(id)) {
   const version = Number(form.get("version")), status = String(form.get("status"));
   if (!Number.isSafeInteger(version) || version < 1 || !["in_review", "approved", "resubmit", "rejected"].includes(status)) return { ok: false, message: "Kararı kontrol et." };
   ({ error } = await supabase.rpc("trust_review_document", { p_id: id, p_version: version, p_status: status, p_reason: reason }));
  } else if (kind === "case" && isUuid(id)) {
   ({ error } = await supabase.rpc("trust_resolve_case", { p_id: id, p_status: String(form.get("status")), p_reason: reason }));
  } else if (kind === "rule") {
   const rule: Json = { id: String(form.get("ruleId") || ""), category_id: String(form.get("category") || ""), provider_id: String(form.get("provider") || ""), document_type: String(form.get("documentType") || ""), stage: String(form.get("stage") || "publication"), scope: String(form.get("scope") || ""), regulatory_rule_version: String(form.get("ruleVersion") || ""), source_url: String(form.get("sourceUrl") || ""), effective_date: String(form.get("effectiveDate") || ""), legal_status: String(form.get("legalStatus") || "draft"), required: form.get("required") === "on", enabled: form.get("enabled") === "on" };
   ({ error } = await supabase.rpc("trust_save_rule", { p_rule: rule, p_reason: reason }));
  } else if (kind === "document_type") {
   ({ error } = await supabase.rpc("trust_save_document_type", { p_type: { code: String(form.get("code") || ""), label: String(form.get("label") || ""), purpose: String(form.get("purpose") || ""), retention_days: Number(form.get("retentionDays")), enabled: form.get("enabled") === "on" }, p_reason: reason }));
  } else return { ok: false, message: "İşlem bilgileri geçersiz." };
  if (error) return { ok: false, message: error.code === "40001" ? "Belge sürümü değişti. Sayfayı yenile." : "Karar kaydedilemedi. Yetki, belge ve kurulum kontrol edilmeli." };
  for (const path of ["/admin/verifications", "/admin/provider-applications", "/provider-dashboard/profile", "/provider-dashboard", "/providers"]) revalidatePath(path);
  revalidatePath("/admin/provider-applications/[id]", "page");
  revalidatePath("/providers/[id]", "page");
  return { ok: true, message: "Gerekçeli karar işlem geçmişine kaydedildi." };
 } catch { return { ok: false, message: "İşlem sonucu doğrulanamadı. Sayfayı yenile." }; }
}
