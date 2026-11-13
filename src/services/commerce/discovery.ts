import { unstable_cache } from "next/cache";
import type { CatalogCategory } from "@/lib/commerce/catalog-navigation";
import { sortCategories, sortDistricts } from "@/lib/commerce/discovery-order";
const readDiscovery = unstable_cache(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("discovery_unavailable");
  const read = async (table: string, select: string) => {
    const rows = [];
    for (let offset = 0; ; offset += 500) {
      const response = await fetch(`${url}/rest/v1/${table}?${new URLSearchParams({ select, is_active: "eq.true", order: "id", limit: "500", offset: String(offset) })}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(5000), cache: "no-store" });
      if (!response.ok) throw new Error("discovery_unavailable");
      const page = await response.json(); rows.push(...page);
      if (page.length < 500) return rows;
    }
  };
  // Ön kayıt anahtarı yalnızca okunur; hata veya kapalı durumda bağlantı gösterilmez.
  const interest = async () => {
    try {
      const response = await fetch(`${url}/rest/v1/rpc/launch_interest_health`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: "{}", signal: AbortSignal.timeout(5000), cache: "no-store" });
      const body = response.ok ? await response.json() : null;
      return Boolean(body && typeof body === "object" && body.available === true && body.version === 1);
    } catch { return false; }
  };
  const [categories, districts, launchInterestOpen] = await Promise.all([read("service_categories", "*"), read("districts", "id,name"), interest()]);
  return { categories: sortCategories(categories as CatalogCategory[]), districts: sortDistricts(districts as { id: string; name: string }[]), launchInterestOpen, unavailable: false };
}, ["public-discovery-v3"], { revalidate: 60 });
// Public discovery is identical for every visitor. Price, slots, publication and payments stay fresh.
export async function getPublicDiscovery() {
  try { return await readDiscovery(); }
  catch { return { categories: [] as CatalogCategory[], districts: [] as { id: string; name: string }[], launchInterestOpen: false, unavailable: true }; }
}
