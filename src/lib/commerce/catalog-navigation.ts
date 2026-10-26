import { getServiceForValue, normalizeServiceValue, type Service } from "@/lib/constants/services";
import { catalogPreviews } from "@/lib/commerce/previews";
import type { CatalogService, PublicOffer } from "@/lib/commerce/types";

export type CatalogCategory = { id: string; name: string; slug: string };
export type CatalogNavigationItem = Service & { serviceCount: number; offerCount: number; preview: boolean };

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
  const categories = catalog.unavailable
    ? [...new Set(catalogPreviews.map(previewCategoryFor))].filter(Boolean).map(slug => ({ id: slug, slug, name: getServiceForValue(slug)?.title ?? slug }))
    : catalog.categories;
  const services = (catalog.unavailable ? catalogPreviews : catalog.services).filter(service => service.is_active);

  return categories.map(category => {
    const known = getServiceForValue(category.slug) ?? getServiceForValue(category.name);
    const categoryServices = services.filter(service => catalog.unavailable ? previewCategoryFor(service) === category.slug : service.category_id === category.id);
    const offerCount = catalog.unavailable ? 0 : catalog.offers.filter(offer => categoryServices.some(service => service.id === offer.service_id)).length;
    return {
      id: known?.id ?? category.id,
      category: known?.category ?? "Ev hizmetleri",
      title: known?.title ?? category.name,
      description: known?.description ?? `${category.name} hizmetlerinin kapsamını ve ustalarını incele.`,
      iconName: known?.iconName ?? "wrench",
      slug: category.slug,
      href: `/services?${new URLSearchParams({ category: category.slug })}`,
      startingHint: offerCount ? "Hizmetleri incele" : "Henüz satışa açılmadı",
      serviceCount: categoryServices.length,
      offerCount,
      preview: catalog.unavailable,
    };
  });
}

export function matchesCatalogQuery(service: CatalogService, query: string, categoryName = "") {
  const words = normalizeServiceValue(query).split(" ").filter(Boolean);
  const content = normalizeServiceValue([service.name, service.description, service.scope, categoryName].join(" "));
  return words.every(word => content.includes(word));
}

export function offersForService(offers: PublicOffer[], serviceId: string, districtId = "") {
  return offers.filter(offer => offer.service_id === serviceId && Number.isSafeInteger(offer.price_minor) && offer.price_minor > 0 && (!districtId || offer.district_ids.includes(districtId)));
}
