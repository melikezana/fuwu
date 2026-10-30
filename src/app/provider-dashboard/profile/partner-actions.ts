"use server";
import { revalidatePath } from "next/cache";
import { getServerAuthContext } from "@/services/auth/server";
import { checkRateLimitWithRedis } from "@/lib/security/rateLimitRedis";
import { uploadProviderVerificationDocument } from "@/services/storage/providerVerificationDocuments";
type Result = { ok: boolean; message: string };
export async function savePartnerProfile(_: Result, form: FormData): Promise<Result> {
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
}
export async function attachPartnerDocument(_: Result, form: FormData): Promise<Result> {
 const { supabase, user } = await getServerAuthContext();
 if (!supabase || !user) return { ok: false, message: "Belge eklemek için giriş yap." };
 const file = form.get("document");
 if (!(file instanceof File) || file.size === 0) return { ok: false, message: "PDF, JPG veya PNG belge seç. En fazla 5 MB." };
 const rate = await checkRateLimitWithRedis({ action: "partner:document", limit: 5, windowMs: 3600000, supabase, userId: user.id });
 if (!rate.allowed) return { ok: false, message: "Saatlik belge yükleme sınırına ulaştın. Daha sonra tekrar dene." };
 const { data: application } = await supabase.from("provider_applications").select("id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
 if (!application) return { ok: false, message: "Belge eklenecek başvuru bulunamadı. Başvuru bilgilerini kontrol et." };
 const upload = await uploadProviderVerificationDocument(supabase, file);
 if (upload.status !== "uploaded") return { ok: false, message: upload.message || "Belge yüklenemedi." };
 const { error } = await supabase.rpc("partner_attach_document", { p_application_id: application.id, p_path: upload.path });
 if (error) return { ok: false, message: "Belge özel alana yüklendi, ancak başvuruyla eşleştirilemedi. Destek ekibiyle iletişime geç." };
 for (const path of ["/provider-dashboard", "/provider-dashboard/profile", "/admin/providers", "/admin/verifications"]) revalidatePath(path);
 return { ok: true, message: "Belgen alındı. Yetkili incelemesinden sonra doğrulama durumu güncellenecek." };
}
