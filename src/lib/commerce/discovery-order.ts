import type { CatalogCategory } from "@/lib/commerce/catalog-navigation";

// Veritabanı satırları sayfalama için kimliğe göre okunur; bu sıra kullanıcıya rastgele görünür.
// Ana sayfa, katalog ve ön kayıt aynı sırayı görsün diye listeler burada tek yerden sıralanır.
// Adı eksik bir satır sıralamayı düşürüp tüm listeyi "okunamadı" durumuna çevirmesin; sona gider.
const byTurkishName = (first: { name?: string | null }, second: { name?: string | null }) => {
  const a = typeof first.name === "string" ? first.name : "";
  const b = typeof second.name === "string" ? second.name : "";
  if (!a || !b) return a ? -1 : b ? 1 : 0;
  return a.localeCompare(b, "tr", { sensitivity: "base" });
};

export function sortByTurkishName<T extends { name: string }>(rows: readonly T[]): T[] {
  return [...rows].sort(byTurkishName);
}

export const sortDistricts = sortByTurkishName;

// Admin'in verdiği sıra (sort_order) önce gelir; sırası verilmemiş ya da eşit olanlar ada göre dizilir.
export function sortCategories<T extends Pick<CatalogCategory, "name" | "sort_order">>(categories: readonly T[]): T[] {
  const order = (category: T) =>
    typeof category.sort_order === "number" && Number.isFinite(category.sort_order) && category.sort_order > 0
      ? category.sort_order
      : Number.MAX_SAFE_INTEGER;
  return [...categories].sort((first, second) => order(first) - order(second) || byTurkishName(first, second));
}
