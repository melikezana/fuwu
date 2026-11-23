import { getServiceForValue, normalizeServiceValue, type Service } from "@/lib/constants/services";
import type { CatalogService, PublicOffer } from "@/lib/commerce/types";
import { detectCategory, hasEmergencySignal } from "@/lib/ai/fallback-analysis";
import { assistantCategorySlugs } from "@/lib/ai/service-recommendations";

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
  const categories = catalog.categories.filter(category => category.is_active !== false);
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

export function featuredCategories(items: CatalogNavigationItem[], limit = 8) {
  const priority = ["tesisat", "elektrik-hizmeti", "temizlik", "boya-badana", "mobilya-montaj", "klima-beyaz-esya", "hali-yikama", "cilingir"];
  const rank = (slug: string) => priority.includes(slug) ? priority.indexOf(slug) : priority.length;
  return [...items].sort((a,b) => rank(a.slug)-rank(b.slug) || (a.sortOrder ?? 0)-(b.sortOrder ?? 0)).slice(0,limit);
}

// Türkçe ekler ("tesisatçı", "musluklar", "boyacıya") birebir eşleşmeyi bozar. Kelime içerikte yoksa
// sonundan en fazla 4 harf kısaltılarak (kök en az 4 harf kalacak şekilde) yeniden denenir.
function wordMatches(content: string, word: string) {
  if (content.includes(word)) return true;
  for (let cut = 1; cut <= 4 && word.length - cut >= 4; cut += 1) {
    if (content.includes(word.slice(0, word.length - cut))) return true;
  }
  return false;
}

// Aramada anlam taşımayan dolgu sözcükleri.
const stopWords = new Set(["ve", "ile", "bir", "icin", "lazim", "gerek", "gerekli", "ariyorum", "istiyorum", "var", "yok", "cok", "en", "iyi", "ucuz", "acil", "hemen", "evde", "evim", "evimde", "benim"]);

export function matchesCatalogQuery(service: CatalogService, query: string, categoryName = "") {
  const words = normalizeServiceValue(query).split(" ").filter(word => word && !stopWords.has(word));
  if (!words.length) return true;
  const content = normalizeServiceValue([service.name, service.description, service.scope, categoryName].join(" "));
  return words.every(word => wordMatches(content, word));
}

export type CatalogQueryIntent = {
  /** Sorun anlatımından tahmin edilen katalog kategori slug'ları ("musluk damlatıyor" → tesisat). */
  categorySlugs: string[];
  /** Acil durum işareti (gaz kokusu, kıvılcım, su baskını…): katalog yerine acil yönlendirme gösterilir. */
  emergency: boolean;
};

export function resolveCatalogQueryIntent(query: string): CatalogQueryIntent {
  const text = query.trim();
  if (!text) return { categorySlugs: [], emergency: false };
  const category = detectCategory(text);
  return {
    categorySlugs: category === "unknown" ? [] : assistantCategorySlugs[category],
    emergency: hasEmergencySignal(text),
  };
}

/**
 * Aramayı iki yoldan eşleştirir: hizmet metninde geçen kelimeler (ek toleranslı) ya da anlatılan
 * soruna karşılık gelen kategori. Metin eşleşmeleri önce gelir.
 */
export function searchCatalogServices<T extends CatalogService>(services: T[], query: string, categoryNameFor: (service: T) => string, categorySlugFor: (service: T) => string) {
  if (!query.trim()) return { services, intent: { categorySlugs: [], emergency: false } as CatalogQueryIntent, byIntent: false };
  const intent = resolveCatalogQueryIntent(query);
  const direct = services.filter(service => matchesCatalogQuery(service, query, categoryNameFor(service)));
  const slugs = new Set(intent.categorySlugs);
  const inferred = slugs.size ? services.filter(service => !direct.includes(service) && slugs.has(categorySlugFor(service))) : [];
  return { services: [...direct, ...inferred], intent, byIntent: direct.length === 0 && inferred.length > 0 };
}

export function offersForService(offers: PublicOffer[], serviceId: string, districtId = "") {
  return offers.filter(offer => offer.service_id === serviceId && Number.isSafeInteger(offer.price_minor) && offer.price_minor > 0 && (!districtId || offer.district_ids.includes(districtId)));
}
