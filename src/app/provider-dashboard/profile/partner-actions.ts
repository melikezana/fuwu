"use server";
import { revalidatePath } from "next/cache";
import { getServerAuthContext } from "@/services/auth/server";
import { checkRateLimitWithRedis } from "@/lib/security/rateLimitRedis";
import { uploadTrustDocument } from "@/services/trust/documents";
import { draftProviderDescription, PROFILE_DRAFT_NOTES_MAX } from "@/lib/ai/profile-draft";
type Result = { ok: boolean; message: string };
export async function savePartnerProfile(_: Result, form: FormData): Promise<Result> {
 try {
 const { supabase, user } = await getServerAuthContext();
 if (!supabase || !user) return { ok: false, message: "Profilini güncellemek için giriş yap." };
 const name = String(form.get("name") ?? "").trim(), description = String(form.get("description") ?? "").trim();
 if (name.length < 2 || name.length > 120 || description.length < 30 || description.length > 2000) return { ok: false, message: "Adını ve en az 30 karakterlik hizmet açıklamanı kontrol et." };
 const { data: p } = await supabase.from("providers").select("id").eq("user_id", user.id).maybeSingle();
 if (!p) return { ok: false, message: "Usta profilin bulunamadı." };
 const rate = await checkRateLimitWithRedis({ action: "partner:profile", limit: 20, windowMs: 60000, supabase, userId: user.id });
 if (!rate.allowed) return { ok: false, message: "Çok fazla işlem yapıldı. Bir dakika sonra tekrar dene." };
 const { error } = await supabase.rpc("partner_save_profile", { p_provider_id: p.id, p_name: name, p_description: description });
 if (error) return { ok: false, message: "Profil kaydedilemedi. Bağlantı veya kurulum kontrol edilmeli." };
 for (const path of ["/provider-dashboard", "/provider-dashboard/profile", "/admin/providers", "/providers"]) revalidatePath(path);
 revalidatePath("/providers/[id]", "page");
 return { ok: true, message: "Profilin kaydedildi. Yayın için yeniden incelenecek." };
 } catch {
  return { ok: false, message: "Profil sonucu doğrulanamadı. Bilgilerini kontrol edip yeniden dene." };
 }
}
export type PartnerDraftResult = { ok: boolean; message: string; description?: string };
/** Ustanın kısa notlarından hizmet açıklaması taslağı üretir. Hiçbir şey kaydetmez; yalnızca metin döner. */
export async function draftPartnerDescription(notes: string): Promise<PartnerDraftResult> {
 try {
 const { supabase, user } = await getServerAuthContext();
 if (!supabase || !user) return { ok: false, message: "Taslak için giriş yap." };
 const text = typeof notes === "string" ? notes.trim() : "";
 if (text.length < 10 || text.length > PROFILE_DRAFT_NOTES_MAX) return { ok: false, message: `Kendini ve yaptığın işleri 10–${PROFILE_DRAFT_NOTES_MAX} karakterle anlat.` };
 const { data: p } = await supabase.from("providers").select("name, service_categories(name), districts(name)").eq("user_id", user.id).maybeSingle();
 if (!p) return { ok: false, message: "Usta profilin bulunamadı." };
 const rate = await checkRateLimitWithRedis({ action: "partner:profile-draft", limit: 6, windowMs: 3600000, supabase, userId: user.id });
 if (!rate.allowed) return { ok: false, message: "Saatlik taslak sınırına ulaştın. Daha sonra tekrar dene ya da açıklamanı kendin yaz." };
 const related = (value: unknown) => { const row = Array.isArray(value) ? value[0] : value; return row && typeof row === "object" && typeof (row as { name?: unknown }).name === "string" ? (row as { name: string }).name : ""; };
 const draft = await draftProviderDescription({ name: typeof p.name === "string" ? p.name : "", category: related(p.service_categories), district: related(p.districts), notes: text });
 return { ok: true, description: draft.description, message: draft.source === "ai" ? "Taslak hazır. Okuyup düzelt; doğru olmayan bir şey varsa çıkar, sonra kaydet." : "Yapay zekâya şu an ulaşılamadı; notlarından sade bir taslak hazırladım. Düzenleyip kaydedebilirsin." };
 } catch {
  return { ok: false, message: "Taslak hazırlanamadı. Açıklamanı kendin yazabilirsin." };
 }
}
export async function attachPartnerDocument(_: Result, form: FormData): Promise<Result> {
 try {
 const { supabase, user } = await getServerAuthContext();
 if (!supabase || !user) return { ok: false, message: "Belge eklemek için giriş yap." };
 const file = form.get("document");
 if (!(file instanceof File) || file.size === 0) return { ok: false, message: "PDF, JPG veya PNG belge seç. En fazla 5 MB." };
 const rate = await checkRateLimitWithRedis({ action: "partner:document", limit: 5, windowMs: 3600000, supabase, userId: user.id });
 if (!rate.allowed) return { ok: false, message: "Saatlik belge yükleme sınırına ulaştın. Daha sonra tekrar dene." };
 const { data: application } = await supabase.from("provider_applications").select("id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
 if (!application) return { ok: false, message: "Belge eklenecek başvuru bulunamadı. Başvuru bilgilerini kontrol et." };
 const type = String(form.get("documentType") ?? "");
 if (!/^[a-z_]{3,60}$/.test(type)) return { ok: false, message: "Belgenin türünü seç." };
 const expires = String(form.get("expiresOn") ?? "");
 const date = expires ? new Date(`${expires}T00:00:00Z`) : null;
 if (expires && (!/^\d{4}-\d{2}-\d{2}$/.test(expires) || !date || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== expires)) return { ok: false, message: "Son geçerlilik tarihini kontrol et." };
 const upload = await uploadTrustDocument(file);
 if (!upload.path) return { ok: false, message: upload.message || "Belge yüklenemedi." };
 const { error } = await supabase.rpc("trust_attach_document", { p_application_id: application.id, p_path: upload.path, p_type: type, p_expires_on: expires || null });
 if (error) return { ok: false, message: "Belge özel alana yüklendi, ancak başvuruyla eşleştirilemedi. Destek ekibiyle iletişime geç." };
 for (const path of ["/provider-dashboard", "/provider-dashboard/profile", "/admin/providers", "/admin/verifications"]) revalidatePath(path);
 return { ok: true, message: "Belgen alındı. Yetkili incelemesinden sonra doğrulama durumu güncellenecek." };
 } catch {
  return { ok: false, message: "Belge işlemi doğrulanamadı. Başvuru durumunu kontrol edip yeniden dene." };
 }
}
