import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PublicOffer } from "@/lib/commerce/types";

export async function getCommerceCatalog() {
  const db = await createSupabaseServerClient();
  if (!db) return { services: [], variants: [], districts: [], categories: [], offers: [] as PublicOffer[], unavailable: true };
  const signal = AbortSignal.timeout(8000);
  const [services, variants, districts, offers, categories] = await Promise.all([
    db.from("service_catalog").select("*").eq("is_active", true).order("name").abortSignal(signal),
    db.from("service_variants").select("*").eq("is_active", true).abortSignal(signal),
    db.from("districts").select("id,name").eq("is_active", true).order("name").abortSignal(signal),
    db.rpc("commerce_offers", {}).abortSignal(signal),
    db.from("service_categories").select("id,name,slug").eq("is_active", true).abortSignal(signal),
  ]);
  return { services: services.data ?? [], variants: variants.data ?? [], districts: districts.data ?? [], categories: categories.data ?? [], offers: (offers.data ?? []) as unknown as PublicOffer[], unavailable: Boolean(services.error || variants.error || districts.error || offers.error || categories.error) };
}
