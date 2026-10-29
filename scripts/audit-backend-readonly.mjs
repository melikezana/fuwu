import fs from "node:fs/promises";
import { parseEnv } from "node:util";

// Only anonymous GETs with limit=0. Never load a service key into an HTTP header.
const readEnv = async name => parseEnv(await fs.readFile(name, "utf8").catch(() => ""));
const names = [".env.local", ".env.test", ".env.staging", ".env.production", ".vercel/.env.preview.local", ".vercel/.env.production.local"];
const configs = await Promise.all(names.map(readEnv));
function project(url) {
  try { const u = new URL(url); return { host: u.hostname, project_ref: u.hostname.endsWith(".supabase.co") ? u.hostname.split(".")[0] : null }; }
  catch { return null; }
}
const report = {
  checked_at: new Date().toISOString(),
  scope: "Read-only anonymous schema/settings probes; zero rows. No migration ledger, PII, payment, login or mutation.",
  environments: names.map((file, i) => ({ file, supabase: project(configs[i].NEXT_PUBLIC_SUPABASE_URL), server_key_present: Boolean(configs[i].SUPABASE_SERVICE_ROLE_KEY), iyzico_keys_present: Boolean(configs[i].IYZICO_API_KEY && configs[i].IYZICO_SECRET_KEY) })),
  deployment_mapping: "BLOCKED unless a verified staging/production config is available; local config does not prove deployed identity",
  checks: [],
};
const env = configs[0];
const probes = [
  ["service_catalog", "/rest/v1/service_catalog?select=id&limit=0"],
  ["service_variants", "/rest/v1/service_variants?select=id,provider_id&limit=0"],
  ["review_sources", "/rest/v1/reviews?select=order_id,service_request_id&limit=0"],
  ["orders", "/rest/v1/orders?select=id,service_price_minor,customer_fee_minor&limit=0"],
  ["orders_identity", "/rest/v1/orders?select=id&limit=0"],
  ["orders_commerce_contract", "/rest/v1/orders?select=id,customer_id,provider_id,offering_id,total_minor&limit=0"],
  ["favorites", "/rest/v1/customer_favorite_providers?select=customer_id&limit=0"],
  ["category_visibility", "/rest/v1/service_categories?select=id,is_visible,customer_fee_bps&limit=0"],
  ["google_settings", "/auth/v1/settings"],
];
await Promise.all(probes.map(async ([name, route]) => {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) { report.checks.push({ name, status: "BLOCKED", reason: "public_config_missing" }); return; }
  try {
    const response = await fetch(env.NEXT_PUBLIC_SUPABASE_URL + route, { headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` }, signal: AbortSignal.timeout(12000) });
    const body = await response.json().catch(() => ({}));
    report.checks.push({ name, http_status: response.status, code: typeof body.code === "string" && /^[A-Z0-9_]{3,16}$/.test(body.code) ? body.code : null, ...(name === "google_settings" ? { google_enabled: body.external?.google === true } : {}) });
  } catch { report.checks.push({ name, status: "BLOCKED", reason: "network_or_timeout" }); }
}));
// OpenAPI contains schema metadata only. Store column/RPC names, never data/defaults/descriptions.
try {
  const r = await fetch(env.NEXT_PUBLIC_SUPABASE_URL + "/rest/v1/", { headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`, Accept: "application/openapi+json" }, signal: AbortSignal.timeout(12000) });
  const doc = await r.json();
  report.schema_metadata = { http_status: r.status, tables: Object.fromEntries(Object.entries(doc.definitions ?? {}).filter(([name]) => ["orders", "reviews", "service_catalog", "service_variants", "payments", "service_categories"].includes(name)).map(([name, def]) => [name, Object.keys(def.properties ?? {}).sort()])), rpc_names: Object.keys(doc.paths ?? {}).filter(p => p.startsWith("/rpc/commerce_")).sort() };
} catch { report.schema_metadata = { status: "BLOCKED", reason: "metadata_unavailable" }; }
report.checks.sort((a, b) => a.name.localeCompare(b.name));
await fs.mkdir("artifacts/backend-reliability", { recursive: true });
await fs.writeFile("artifacts/backend-reliability/external-readonly.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
