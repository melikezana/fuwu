import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isRealPublishedProvider } from "@/lib/providers/provenance";
import type { PublicOffer } from "@/lib/commerce/types";
import type { CatalogCategory } from "@/lib/commerce/catalog-navigation";
import { sortCategories, sortDistricts } from "@/lib/commerce/discovery-order";
import { customerFeeBpsFor, customerPrice, type PublicFeeRates } from "@/lib/commerce/pricing";

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
  // Ücret oranları okunamazsa vitrin hizmet bedelini gösterir; kesin toplam ödeme adımında sunucudan doğrulanır.
  const feeResult = await db.rpc("commerce_public_fee_rates" as never, {} as never).abortSignal(signal).then(r => r, () => ({ data: null, error: true }));
  const feeData = feeResult.error ? null : (feeResult.data as unknown as PublicFeeRates | null);
  const feeRates = feeData && typeof feeData === "object" && Array.isArray(feeData.categories) ? feeData : null;
  const visibleCategories = (categories.data ?? []).filter(category => category.is_visible !== false);
  const visibleServices = (services.data ?? []).filter(service => visibleCategories.some(category => category.id === service.category_id));
  const unavailable = Boolean(services.error || variants.error || districts.error || offers.error || categories.error || publication.error || !Array.isArray(publication.data));
  const approvedIds = new Set(Array.isArray(publication.data) ? (publication.data as { id: string; record_kind?: string }[]).filter(isRealPublishedProvider).map(p => p.id) : []);
  return { services: visibleServices, variants: variants.data ?? [], districts: sortDistricts(districts.data ?? []), categories: sortCategories(categories.data ?? []),
    offers: unavailable ? [] : ((offers.data ?? []) as unknown as PublicOffer[]).filter(offer => approvedIds.has(offer.provider_id)).map(offer => {
      const categoryId = visibleServices.find(service => service.id === offer.service_id)?.category_id;
      const category = visibleCategories.find(item => item.id === categoryId) as (CatalogCategory & { customer_fee_bps?: number | null }) | undefined;
      return { ...offer, customer_price_minor: customerPrice(offer.price_minor, customerFeeBpsFor(feeRates, categoryId, category?.customer_fee_bps)), rating: null, review_count: 0 };
    }), unavailable };
}
