import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { CommerceOrder, PublicOffer } from "@/lib/commerce/types";
import type { OrderCardDetails } from "@/components/commerce/OrderList";
import { getReviewEligibility } from "@/services/reviews";

const unique = (values: string[]) => [...new Set(values)];

function rebookHrefFor(order: CommerceOrder, offering: PublicOffer | undefined, slug: string | undefined) {
  if (!offering || !slug) return undefined;
  return `/services/${slug}?${new URLSearchParams({ provider: order.provider_id, district: order.district_id, ...(offering.variant_id ? { variant: offering.variant_id } : {}), rebook: order.id })}`;
}

/** Sipariş detayı için "Yeniden Satın Al" bağlantısı: tüm kataloğu değil, yalnızca o ustanın yayındaki tekliflerini okur. */
export async function getRebookHref(db: SupabaseClient<Database>, order: CommerceOrder): Promise<string | undefined> {
  const [offers, services] = await Promise.all([
    db.rpc("commerce_offers", { p_provider_id: order.provider_id }).then(result => (result.data ?? []) as unknown as PublicOffer[]),
    db.from("service_catalog").select("id,slug").eq("is_active", true).then(result => result.data ?? []),
  ]);
  const offering = offers.find(offer => offer.id === order.offering_id);
  return rebookHrefFor(order, offering, services.find(service => service.id === offering?.service_id)?.slug);
}

/**
 * Sipariş kartlarının ek bilgileri: usta fotoğrafı, "Yeniden Satın Al" bağlantısı ve
 * değerlendirme hakkı. Yalnızca listedeki siparişler için gereken kayıtlar okunur;
 * tüm pazar yerinin teklifleri her sayfa açılışında çekilmez.
 */
export async function getOrderCardDetails(db: SupabaseClient<Database>, orders: CommerceOrder[]): Promise<Record<string, OrderCardDetails>> {
  if (!orders.length) return {};
  const completed = orders.filter(o => o.status === "COMPLETED");
  const providerIds = unique(orders.map(o => o.provider_id));
  const rebookProviders = unique(completed.map(o => o.provider_id));
  const reviewProviders = unique(completed.filter(o => o.payment_status === "PAID").map(o => o.provider_id));
  const [providers, offerLists, services, eligibility] = await Promise.all([
    db.from("providers").select("id,profile_image_url").in("id", providerIds).then(result => result.data ?? []),
    // Yeniden satın alma yalnızca tamamlanan siparişte gösterilir; sadece o ustaların yayındaki teklifleri okunur.
    Promise.all(rebookProviders.map(id => db.rpc("commerce_offers", { p_provider_id: id }).then(result => (result.data ?? []) as unknown as PublicOffer[]))),
    rebookProviders.length ? db.from("service_catalog").select("id,slug").eq("is_active", true).then(result => result.data ?? []) : Promise.resolve([] as { id: string; slug: string }[]),
    Promise.all(reviewProviders.map(id => getReviewEligibility(id, db))),
  ]);
  const photos = new Map(providers.map(p => [p.id, p.profile_image_url]));
  const liveOffers = new Map(offerLists.flat().map(offer => [offer.id, offer]));
  const slugs = new Map(services.map(s => [s.id, s.slug]));
  const eligibleIds = new Set(eligibility.flat().filter(s => s.kind === "order").map(s => s.id));
  return Object.fromEntries(orders.map(o => {
    const offering = o.status === "COMPLETED" ? liveOffers.get(o.offering_id) : undefined;
    return [o.id, {
      photo: photos.get(o.provider_id) || undefined,
      reviewEligible: eligibleIds.has(o.id),
      rebookHref: rebookHrefFor(o, offering, offering ? slugs.get(offering.service_id) : undefined),
    }];
  }));
}
