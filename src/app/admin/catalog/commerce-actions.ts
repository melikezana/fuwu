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

export async function saveCategoryPresentation(form: FormData) {
  const { user, profile, supabase } = await getServerAuthContext();
  if (!user || !supabase || !hasAdminRole(profile)) throw new Error("forbidden");
  const rate = await checkRateLimitWithRedis({ action: "admin:category.presentation", userId: user.id, supabase, limit: 30, windowMs: 60_000 });
  if (!rate.allowed) redirect("/admin/catalog?category=failed");
  const id = String(form.get("id") ?? "");
  const order = Number(form.get("sort_order"));
  if (!isUuid(id) || !Number.isInteger(order) || order < 0 || order > 10000) redirect("/admin/catalog?category=failed");
  const { error } = await supabase.rpc("commerce_admin_save_category", { p_id: id, p_name: String(form.get("name") ?? "").trim().slice(0, 60), p_slug: String(form.get("slug") ?? "").trim().slice(0, 100), p_visible: form.get("is_visible") === "on", p_featured: form.get("is_featured") === "on", p_sort: order, p_icon: String(form.get("icon_name") ?? "") });
  revalidatePath("/"); revalidatePath("/services"); revalidatePath("/admin/catalog");
  redirect(`/admin/catalog?category=${error ? "failed" : "saved"}`);
}
