import type { AssistantCategory } from "@/lib/ai/assistant-schema";
import type { CatalogService, PublicOffer } from "@/lib/commerce/types";
import type { CatalogCategory } from "@/lib/commerce/catalog-navigation";

export type RecommendedService = {
  id: string;
  name: string;
  description: string;
  href: string;
  startingPriceMinor: number | null;
  offerCount: number;
};

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
      return {
        id: service.id,
        name: service.name,
        description: service.description,
        href: `/services/${encodeURIComponent(service.slug)}`,
        startingPriceMinor: prices.length ? Math.min(...prices) : null,
        offerCount: offers.length,
      };
    })
    .sort((a, b) => b.offerCount - a.offerCount || a.name.localeCompare(b.name, "tr"))
    .slice(0, limit);
}
