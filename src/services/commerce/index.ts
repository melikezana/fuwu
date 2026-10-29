import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isRealPublishedProvider } from "@/lib/providers/provenance";
import type { PublicOffer } from "@/lib/commerce/types";
import type { CatalogCategory } from "@/lib/commerce/catalog-navigation";

export async function getCommerceCatalog() {
  const db = await createSupabaseServerClient();
  if (!db) return { services: [], variants: [], districts: [], categories: [], offers: [] as PublicOffer[], unavailable: true };
  const signal = AbortSignal.timeout(8000);
  // Categories remain independent of commerce RPC health. Never replace real data with previews.
  const categoryRows: CatalogCategory[] = [];
  const readCategories = async () => {
    for (let offset = 0; ; offset += 500) {
      const result = await db.from("service_categories").select("*").eq("is_active", true).order("id").range(offset, offset + 499).abortSignal(signal);
      if (result.error) return { data: categoryRows, error: result.error };
      categoryRows.push(...result.data);
      if (result.data.length < 500) return { data: categoryRows, error: null };
    }
  };
  const [services, variants, districts, offers, categories, publication] = await Promise.all([
    db.from("service_catalog").select("*").eq("is_active", true).order("name").abortSignal(signal),
    db.from("service_variants").select("*").eq("is_active", true).abortSignal(signal),
    db.from("districts").select("id,name").eq("is_active", true).order("name").abortSignal(signal),
    db.rpc("commerce_offers", {}).abortSignal(signal),
    readCategories(),
    db.rpc("provider_publication_gate", {}).abortSignal(signal),
  ]);
  const visibleCategories = (categories.data ?? []).filter(category => category.is_visible !== false);
  const visibleServices = (services.data ?? []).filter(service => visibleCategories.some(category => category.id === service.category_id));
  const unavailable = Boolean(services.error || variants.error || districts.error || offers.error || categories.error || publication.error || !Array.isArray(publication.data));
  const approvedIds = new Set(Array.isArray(publication.data) ? (publication.data as { id: string; record_kind?: string }[]).filter(isRealPublishedProvider).map(p => p.id) : []);
  return { services: visibleServices, variants: variants.data ?? [], districts: districts.data ?? [], categories: categories.data ?? [],
    offers: unavailable ? [] : ((offers.data ?? []) as unknown as PublicOffer[]).filter(offer => approvedIds.has(offer.provider_id)).map(offer => ({ ...offer, rating: null, review_count: 0 })), unavailable };
}
