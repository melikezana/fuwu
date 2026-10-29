import { unstable_cache } from "next/cache";
import type { CatalogCategory } from "@/lib/commerce/catalog-navigation";
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
  const [categories, districts] = await Promise.all([read("service_categories", "*"), read("districts", "id,name")]);
  return { categories: categories as CatalogCategory[], districts: districts as { id: string; name: string }[], unavailable: false };
}, ["public-discovery-v1"], { revalidate: 60 });
// Public discovery is identical for every visitor. Price, slots, publication and payments stay fresh.
export async function getPublicDiscovery() {
  try { return await readDiscovery(); }
  catch { return { categories: [] as CatalogCategory[], districts: [] as { id: string; name: string }[], unavailable: true }; }
}
