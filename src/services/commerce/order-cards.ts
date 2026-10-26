import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { CommerceOrder, PublicOffer } from "@/lib/commerce/types";
import type { OrderCardDetails } from "@/components/commerce/OrderList";
import { getReviewEligibility } from "@/services/reviews";

export async function getOrderCardDetails(db: SupabaseClient<Database>, orders: CommerceOrder[]): Promise<Record<string, OrderCardDetails>> {
  if (!orders.length) return {};
  const providerIds = [...new Set(orders.map(o => o.provider_id))];
  const reviewProviders = [...new Set(orders.filter(o => o.status === "COMPLETED" && o.payment_status === "PAID").map(o => o.provider_id))];
  const [providers, offers, services, eligibility] = await Promise.all([
    db.from("providers").select("id,profile_image_url").in("id", providerIds),
    db.rpc("commerce_offers", {}),
    db.from("service_catalog").select("id,slug").eq("is_active", true),
    Promise.all(reviewProviders.map(id => getReviewEligibility(id, db))),
  ]);
  const eligibleIds = new Set(eligibility.flat().filter(s => s.kind === "order").map(s => s.id));
  const liveOffers = (offers.data ?? []) as unknown as PublicOffer[];
  return Object.fromEntries(orders.map(o => {
    const offering = liveOffers.find(f => f.id === o.offering_id);
    const service = services.data?.find(s => s.id === offering?.service_id);
    return [o.id, { photo: providers.data?.find(p => p.id === o.provider_id)?.profile_image_url || undefined, reviewEligible: eligibleIds.has(o.id), rebookHref: service && offering ? `/services/${service.slug}?${new URLSearchParams({ provider: o.provider_id, district: o.district_id, ...(offering.variant_id ? { variant: offering.variant_id } : {}), rebook: o.id })}` : undefined }];
  }));
}
