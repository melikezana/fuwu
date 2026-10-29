import fs from "node:fs/promises";
import { parseEnv } from "node:util";
import { assessProviderQuality, type QualityInput } from "../src/lib/providers/quality";
async function main() {
const env = parseEnv(await fs.readFile(".env.local", "utf8"));
const base = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!base || !anon) throw new Error("Public configuration unavailable");
const report = { at: new Date().toISOString(), scope: "Remote public anonymous GET only, no data changes. Identifiers/review signals only; no names, descriptions, contact information or secrets saved.", scanned: 0, flagged: [] as { providerId: string; reasons: string[] }[], requests: [] as object[], incomplete: false };
async function get(resource: string, query: Record<string, string>) {
  const start = performance.now();
  const response = await fetch(`${base}/rest/v1/${resource}?${new URLSearchParams(query)}`, { headers: { apikey: anon!, Authorization: `Bearer ${anon}` }, signal: AbortSignal.timeout(10000) });
  report.requests.push({ resource, status: response.status, ms: Math.round(performance.now() - start) });
  return response;
}
for (let offset = 0; offset < 2000; offset += 100) {
  const query = { select: "id,name,description,category_id,district_id,experience_years,rating,review_count,is_verified,identity_verified", is_active: "eq.true", is_approved: "eq.true", order: "id", limit: "100", offset: String(offset) };
  let response = await get("providers", query);
  if (!response.ok) {
    // Missing trust columns remain unknown, never assume verified or rated.
    query.select = "id,name,description,category_id,district_id,experience_years,rating";
    response = await get("providers", query);
  }
  if (!response.ok) { report.incomplete = true; break; }
  const rows = await response.json() as (QualityInput & { id: string })[];
  for (const row of rows) {
    let reviews = await get("rpc/public_provider_reviews", { p_provider_id: row.id });
    if (!reviews.ok) reviews = await get("reviews", { provider_id: `eq.${row.id}`, select: "rating", limit: "1000" });
    if (reviews.ok) {
      const list = await reviews.json() as { rating: number }[];
      row.actual_review_count = list.length;
      row.actual_rating = list.length ? Math.round(list.reduce((n, r) => n + r.rating, 0) / list.length * 10) / 10 : 0;
    } else report.incomplete = true;
    const reasons = assessProviderQuality(row);
    if (reasons.length) report.flagged.push({ providerId: row.id, reasons });
    report.scanned++;
  }
  if (rows.length < 100) break;
  if (offset === 1900) report.incomplete = true;
}
await fs.mkdir("artifacts/product-qa", { recursive: true });
await fs.writeFile("artifacts/product-qa/public-profile-audit.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify({ scanned: report.scanned, flagged: report.flagged.length, incomplete: report.incomplete }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
