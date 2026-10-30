"use server";
import { getServerAuthContext } from "@/services/auth/server";
import { isUuid } from "@/lib/utils/validation";
export async function reportProviderAccount(_: { ok: boolean; message: string }, form: FormData) {
 try {
  const { user, supabase } = await getServerAuthContext();
  if (!user || !supabase) return { ok: false, message: "Bildirim yapmak için giriş yap." };
  const id = String(form.get("providerId") || ""), reason = String(form.get("reason") || "").trim();
  if (!isUuid(id) || reason.length < 10 || reason.length > 2000) return { ok: false, message: "Gerekçeni en az 10 karakterle açıkla." };
  const { error } = await supabase.rpc("trust_report_account", { p_provider_id: id, p_reason: reason });
  return error ? { ok: false, message: "Bildirim kaydedilemedi. Yetki, bağlantı veya işlem sınırı kontrol edilmeli." } : { ok: true, message: "Bildirim alındı. Güvenlik ekibi gerekçeli inceleme yapacak." };
 } catch { return { ok: false, message: "Bağlantı kurulamadı. Yeniden dene." }; }
}
