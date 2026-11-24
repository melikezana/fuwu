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

/** TL girişini kuruşa çevirir ("350" veya "350,50"); geçersizse null. */
function liraToMinor(value: string): number | null {
  const match = /^(\d{1,6})(?:[.,](\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}

/** Hizmet ekstrası (sepete eklenebilen ek iş). Fiyat ve görünürlük değişikliği veritabanında audit kaydı bırakır. */
export async function saveServiceAddon(form: FormData) {
  const { user, profile, supabase } = await getServerAuthContext();
  if (!user || !supabase || !hasAdminRole(profile)) throw new Error("forbidden");
  const rate = await checkRateLimitWithRedis({ action: "admin:commerce.addon", userId: user.id, supabase, limit: 40, windowMs: 60_000 });
  if (!rate.allowed) redirect("/admin/catalog?addon=failed");
  const serviceId = String(form.get("service_id") ?? "");
  const price = liraToMinor(String(form.get("price") ?? ""));
  const maxQuantity = Number(form.get("max_quantity") ?? 1), sortOrder = Number(form.get("sort_order") ?? 0);
  if (!isUuid(serviceId) || price == null || price < 100 || !Number.isInteger(maxQuantity) || maxQuantity < 1 || maxQuantity > 20 || !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10000) redirect("/admin/catalog?addon=failed");
  const { error } = await supabase.rpc("commerce_admin_save_addon", { p_addon: {
    service_id: serviceId, slug: String(form.get("slug") ?? "").trim().toLowerCase().slice(0, 60), name: String(form.get("name") ?? "").trim().slice(0, 80),
    description: String(form.get("description") ?? "").trim().slice(0, 240), price_minor: String(price), max_quantity: String(maxQuantity), sort_order: String(sortOrder), is_active: form.get("is_active") === "on",
  } });
  revalidatePath("/services"); revalidatePath("/admin/catalog");
  redirect(`/admin/catalog?addon=${error ? "failed" : "saved"}`);
}
