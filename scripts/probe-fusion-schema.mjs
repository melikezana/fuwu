import fs from "node:fs";

// Read-only schema probes, using only the public anon key. No data rows are requested.
const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const value = line.trim(), i = value.indexOf("=");
  if (i > 0 && !value.startsWith("#")) env[value.slice(0, i)] = value.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}
const results = [];
for (const [label, route] of [
  ["commerce schema", "/rest/v1/service_catalog?select=id&limit=0"],
  ["fusion operations schema", "/rest/v1/customer_addresses?select=id&limit=0"],
  ["review source columns", "/rest/v1/reviews?select=order_id,service_request_id&limit=0"],
]) {
  try {
    const response = await fetch(env.NEXT_PUBLIC_SUPABASE_URL + route, {
      headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
      signal: AbortSignal.timeout(12000),
    });
    const body = await response.json().catch(() => ({}));
    results.push({ label, status: response.status, code: body?.code || null, detail: response.ok ? "schema query succeeded; no data rows requested" : body?.message || "failed" });
  } catch (error) { results.push({ label, error: error.name, cause: error.cause?.code }); }
}
const report = { scope: "Read-only public API schema detection, not verification of applied migration versions. No DB URL/service key or migration ledger access is available.", results };
fs.mkdirSync("artifacts/fusion-quality", { recursive: true });
fs.writeFileSync("artifacts/fusion-quality/target-readonly-probe.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
