import type { AssistantCategory } from "@/lib/ai/assistant-schema";
import type { CatalogService, PublicOffer } from "@/lib/commerce/types";
import type { CatalogCategory } from "@/lib/commerce/catalog-navigation";

/** Karşılaştırma satırı: aynı hizmeti sunan yayındaki bir ustanın paketi. Yalnızca katalogdaki gerçek veriden gelir. */
export type RecommendedOffer = {
  durationMinutes: number;
  href: string;
  id: string;
  priceMinor: number;
  providerName: string;
  rating: number | null;
  reviewCount: number;
  variantName: string | null;
};

export type RecommendedService = {
  id: string;
  name: string;
  description: string;
  href: string;
  startingPriceMinor: number | null;
  offerCount: number;
  /** Hizmete dahil olan işler (katalog kapsamı). */
  scope?: string;
  /** Hizmete dahil olmayanlar. */
  exclusions?: string;
  /** En uygun fiyattan başlayarak en fazla üç usta paketi. */
  offers?: RecommendedOffer[];
};

const trimText = (value: string | null | undefined, max: number) => (value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

const categorySlugs: Record<Exclude<AssistantCategory, "unknown">, string[]> = {
  electric: ["elektrik-hizmeti", "elektrik", "electrical"],
  plumbing: ["tesisat", "plumbing"],
  cleaning: ["temizlik", "hali-yikama", "cleaning"],
  white_goods: ["klima-beyaz-esya", "beyaz-esya", "climate-appliance-service"],
  locksmith: ["cilingir", "locksmith"],
  painting: ["boya-badana", "painting"],
  furniture: ["mobilya-montaj", "mobilya-montaji", "furniture-assembly"],
  moving: ["nakliye-yardimi", "nakliye", "moving-help"],
  pool_garden: ["havuz-bakimi", "bahce-bakimi", "havuz-bahce-bakimi", "pool-garden"],
  renovation: ["ev-tadilati", "tadilat", "renovation"],
};

/** Asistanın bulduğu kategoriye karşılık gelen, katalogda aktif sabit kapsamlı hizmetler (en fazla 3). */
export function recommendServices(
  category: AssistantCategory,
  catalog: { categories: CatalogCategory[]; services: CatalogService[]; offers: PublicOffer[] },
  limit = 3,
): RecommendedService[] {
  if (category === "unknown") return [];
  const slugs = new Set(categorySlugs[category]);
  const categoryIds = new Set(catalog.categories.filter(item => slugs.has(item.slug)).map(item => item.id));
  if (!categoryIds.size) return [];

  return catalog.services
    .filter(service => service.is_active && categoryIds.has(service.category_id))
    .map(service => {
      const offers = catalog.offers.filter(offer => offer.service_id === service.id);
      const prices = offers.map(offer => offer.customer_price_minor ?? offer.price_minor).filter((price): price is number => typeof price === "number" && price > 0);
      const href = `/services/${encodeURIComponent(service.slug)}`;
      const price = (offer: PublicOffer) => offer.customer_price_minor ?? offer.price_minor;
      return {
        id: service.id,
        name: service.name,
        description: service.description,
        href,
        startingPriceMinor: prices.length ? Math.min(...prices) : null,
        offerCount: offers.length,
        scope: trimText(service.scope, 320),
        exclusions: trimText(service.exclusions, 240),
        offers: offers
          .filter(offer => price(offer) > 0)
          .sort((a, b) => price(a) - price(b) || (b.rating ?? 0) - (a.rating ?? 0))
          .slice(0, 3)
          .map(offer => {
            const query = new URLSearchParams({ provider: offer.provider_id });
            if (offer.variant_id) query.set("variant", offer.variant_id);
            return {
              durationMinutes: offer.duration_minutes,
              href: `${href}?${query}`,
              id: offer.id,
              priceMinor: price(offer),
              providerName: trimText(offer.provider_name, 80),
              rating: offer.review_count > 0 ? offer.rating : null,
              reviewCount: offer.review_count,
              variantName: offer.variant_name ? trimText(offer.variant_name, 60) : null,
            };
          }),
      };
    })
    .sort((a, b) => b.offerCount - a.offerCount || a.name.localeCompare(b.name, "tr"))
    .slice(0, limit);
}
