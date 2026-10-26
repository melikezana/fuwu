import type { CatalogService, PublicOffer } from "./types";

export type ProviderPurchase = { priceMinor: number; href: string; serviceName: string };

export function providerPurchaseLinks(catalog: { services: CatalogService[]; offers: PublicOffer[]; districts: { id: string; name: string }[]; unavailable: boolean }, district = "") {
  const purchases: Record<string, ProviderPurchase> = {};
  if (catalog.unavailable) return purchases;
  const districtId = catalog.districts.find(d => d.id === district || d.name === district)?.id;
  for (const offer of catalog.offers) {
    // A card must not advertise the price of a package or district its link cannot select.
    if (district && (!districtId || !offer.district_ids.includes(districtId))) continue;
    const service = catalog.services.find(s => s.id === offer.service_id);
    if (!service || (purchases[offer.provider_id] && offer.price_minor >= purchases[offer.provider_id].priceMinor)) continue;
    const query = new URLSearchParams({ provider: offer.provider_id });
    if (offer.variant_id) query.set("variant", offer.variant_id);
    if (districtId) query.set("district", districtId);
    purchases[offer.provider_id] = { priceMinor: offer.price_minor, serviceName: service.name + (offer.variant_name ? ` · ${offer.variant_name}` : ""), href: `/services/${service.slug}?${query}` };
  }
  return purchases;
}
