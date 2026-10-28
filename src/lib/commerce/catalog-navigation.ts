import { getServiceForValue, normalizeServiceValue, type Service } from "@/lib/constants/services";
import type { CatalogService, PublicOffer } from "@/lib/commerce/types";

export type CatalogCategory = { id: string; name: string; slug: string; is_active?: boolean; is_visible?: boolean; is_featured?: boolean; sort_order?: number; icon_name?: Service["iconName"] | null; description?: string | null };
export type CatalogNavigationItem = Service & { serviceCount: number; offerCount: number; preview: boolean; featured?: boolean; sortOrder?: number };

// Existing scoped preview definitions. These never stand in for live offers.
const previewCategories: Record<string, string> = {
  "musluk-montaji": "tesisat",
  "klima-bakimi": "klima-beyaz-esya",
  "elektrik-ariza-tespiti": "elektrik-hizmeti",
  "mobilya-montaji": "mobilya-montaj",
};

export function previewCategoryFor(service: CatalogService) {
  return previewCategories[service.slug] ?? "";
}

export function getCatalogNavigation(catalog: {
  categories: CatalogCategory[];
  services: CatalogService[];
  offers: PublicOffer[];
  unavailable: boolean;
}): CatalogNavigationItem[] {
  const categories = catalog.categories.filter(category => category.is_active !== false && category.is_visible !== false);
  const services = catalog.services.filter(service => service.is_active);

  return categories.map(category => {
    const known = getServiceForValue(category.slug) ?? getServiceForValue(category.name);
    const separatePool = category.slug === "havuz-bakimi";
    const categoryServices = services.filter(service => service.category_id === category.id);
    const offerCount = catalog.unavailable ? 0 : catalog.offers.filter(offer => categoryServices.some(service => service.id === offer.service_id)).length;
    return {
      id: separatePool ? category.id : known?.id ?? category.id,
      category: known?.category ?? "Ev hizmetleri",
      title: category.name,
      description: category.description || known?.description || `${category.name} hizmetlerinin kapsamını ve ustalarını incele.`,
      iconName: category.icon_name ?? (separatePool ? "droplets" : category.slug === "hali-yikama" ? "rug" : known?.iconName ?? "wrench"),
      slug: category.slug,
      href: `/services?${new URLSearchParams({ category: category.slug })}`,
      startingHint: offerCount ? "Hizmetleri incele" : "Henüz satışa açılmadı",
      serviceCount: categoryServices.length,
      offerCount,
      preview: catalog.unavailable,
      featured: category.is_featured ?? true,
      sortOrder: category.sort_order ?? 0,
    };
  }).sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, "tr"));
}

export function featuredCategories(items: CatalogNavigationItem[], limit = 6) {
  return items.filter(item => item.featured !== false).slice(0, limit);
}

export function matchesCatalogQuery(service: CatalogService, query: string, categoryName = "") {
  const words = normalizeServiceValue(query).split(" ").filter(Boolean);
  const content = normalizeServiceValue([service.name, service.description, service.scope, categoryName].join(" "));
  return words.every(word => content.includes(word));
}

export function offersForService(offers: PublicOffer[], serviceId: string, districtId = "") {
  return offers.filter(offer => offer.service_id === serviceId && Number.isSafeInteger(offer.price_minor) && offer.price_minor > 0 && (!districtId || offer.district_ids.includes(districtId)));
}
