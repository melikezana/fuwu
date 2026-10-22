"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerAuthContext } from "@/services/auth/server";
import { hasAdminRole } from "@/services/auth/constants";
import { isUuid } from "@/lib/utils/validation";
import { servicePhotos } from "@/lib/service-photos";
import { checkRateLimitWithRedis } from "@/lib/security/rateLimitRedis";

export async function saveCommerceService(form: FormData) {
  const { user, profile, supabase } = await getServerAuthContext();
  if (!user || !supabase || !hasAdminRole(profile)) throw new Error("forbidden");
  const rate = await checkRateLimitWithRedis({ action: "admin:commerce.catalog", userId: user.id, supabase, limit: 20, windowMs: 60_000 });
  if (!rate.allowed) redirect("/admin/catalog?commerce=failed");
  const id = String(form.get("id") ?? "");
  const definition = Object.fromEntries(["category_id", "slug", "name", "description", "scope", "exclusions", "image_url", "pricing_type"].map(key => [key, String(form.get(key) ?? "").trim().slice(0, 4000)]));
  if ((id && !isUuid(id)) || !Object.values(servicePhotos).some(photo => photo.src === definition.image_url)) redirect("/admin/catalog?commerce=failed");
  const { error } = await supabase.rpc("commerce_admin_save_service", { p_service_id: id || null, p_definition: { ...definition, is_active: form.get("is_active") === "on" }, p_variants: [...new Set(String(form.get("variants") ?? "").split(/\r?\n/).map(value => value.trim()).filter(Boolean))] });
  revalidatePath("/services"); revalidatePath("/admin/catalog"); revalidatePath("/");
  redirect(`/admin/catalog?commerce=${error ? "failed" : "saved"}`);
}
