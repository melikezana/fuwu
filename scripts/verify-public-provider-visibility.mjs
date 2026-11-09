import fs from "node:fs/promises";
import { parseEnv } from "node:util";

// 9 Kasım 2026 denetimi · P0: "Anonim/public tüm uçlarda 0 demo usta" kabul testi.
// Salt okunur: yalnızca anonim anahtarla GET ve salt okunur RPC çağrıları yapar; hiçbir kayıt değiştirmez.
// Kullanım: node scripts/verify-public-provider-visibility.mjs --site=https://www.fuwu.com.tr
//           (NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY ortamdan veya .env.local dosyasından okunur)
const env = { ...parseEnv(await fs.readFile(".env.local", "utf8").catch(() => "")), ...process.env };
const site = (process.argv.find(arg => arg.startsWith("--site="))?.slice(7) || "").replace(/\/+$/, "");
const url = (env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const confirmed = JSON.parse(await fs.readFile("docs/prelaunch-confirmed-test-providers.json", "utf8")).filter(row => row.confirmedTest).map(row => row.providerId.toLowerCase());
const seeds = Array.from({ length: 13 }, (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`);
const blocked = [...new Set([...confirmed, ...seeds])];
const report = { at: new Date().toISOString(), scope: "Anonymous read-only acceptance; no write, no service role", site: site || null, blockedIds: blocked.length, checks: [], failures: [], skipped: [] };
const pass = name => report.checks.push(name);
const fail = (name, detail) => report.failures.push({ name, detail });
const leaked = text => blocked.filter(id => String(text).toLowerCase().includes(id));
const headers = { apikey: key, Authorization: `Bearer ${key}` };

async function api(name, path, init) {
  try {
    const response = await fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...headers, ...(init?.body ? { "Content-Type": "application/json" } : {}) }, signal: AbortSignal.timeout(15000) });
    const text = await response.text();
    // Yetki reddi (401/403) veya bulunmayan nesne (404) sızıntı değildir; içerik yine de taranır.
    const ids = leaked(text);
    if (ids.length) fail(name, { status: response.status, leakedIds: ids });
    else if (response.status >= 500) fail(name, { status: response.status, reason: "server_error_not_proof" });
    else pass(`${name} → HTTP ${response.status}, 0 demo usta`);
    return response.ok ? JSON.parse(text) : null;
  } catch (error) { fail(name, { reason: error.name === "TimeoutError" ? "timeout" : "network_error" }); return null; }
}

if (!url || !key || key.split(".").length !== 3) {
  report.skipped.push("Supabase anonim uç kontrolleri: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY bulunamadı");
} else if (/service_role/.test(Buffer.from(key.split(".")[1], "base64url").toString("utf8"))) {
  throw new Error("Bu test yalnızca anonim anahtarla çalışır; service_role anahtarı reddedildi.");
} else {
  const list = `in.(${blocked.join(",")})`;
  await api("REST providers (kimliğe göre)", `providers?select=id&id=${list}`);
  const visible = await api("REST providers (tüm görünür satırlar)", "providers?select=id&limit=1000");
  if (visible) report.anonymousVisibleProviders = visible.length;
  for (const table of ["provider_gallery_images", "reviews", "provider_service_offerings", "provider_availability"]) await api(`REST ${table}`, `${table}?select=provider_id&provider_id=${list}`);
  const gate = await api("RPC provider_publication_gate", "rpc/provider_publication_gate", { method: "POST", body: "{}" });
  if (Array.isArray(gate)) {
    report.publishedProviders = gate.length;
    const notReal = gate.filter(row => row.record_kind !== "real").length;
    if (notReal) fail("RPC provider_publication_gate", { reason: "non_real_record_published", count: notReal }); else pass("Yayın kapısı yalnızca 'real' sınıflı kayıt döndürüyor");
  }
  await api("RPC commerce_offers", "rpc/commerce_offers", { method: "POST", body: "{}" });
  for (const id of confirmed) {
    await api(`RPC commerce_public_schedule ${id.slice(0, 8)}`, "rpc/commerce_public_schedule", { method: "POST", body: JSON.stringify({ p_provider_id: id }) });
    await api(`RPC commerce_offers(provider) ${id.slice(0, 8)}`, "rpc/commerce_offers", { method: "POST", body: JSON.stringify({ p_provider_id: id }) });
  }
}

if (!site) report.skipped.push("Site sayfa kontrolleri: --site=https://… verilmedi");
else {
  const page = async (name, path, expectMissing = false) => {
    try {
      const response = await fetch(site + path, { redirect: "follow", headers: { "User-Agent": "fuwu-visibility-check" }, signal: AbortSignal.timeout(20000) });
      const text = await response.text();
      const ids = expectMissing ? [] : leaked(text);
      // Yayında olmayan profil sayfası 404 ya da "bulunamadı" boş durumunu göstermeli; usta verisi içermemeli.
      const exposed = expectMissing && response.status === 200 && !/Usta Bulunamadı|Usta ağımızı kuruyoruz|bulunamadı/i.test(text);
      if (ids.length || exposed) fail(name, { status: response.status, leakedIds: ids, profileRendered: exposed });
      else if (response.status >= 500) fail(name, { status: response.status, reason: "server_error_not_proof" });
      else pass(`${name} → HTTP ${response.status}, demo usta görünmüyor`);
    } catch (error) { fail(name, { reason: error.name === "TimeoutError" ? "timeout" : "network_error" }); }
  };
  for (const path of ["/", "/providers", "/services", "/sitemap.xml"]) await page(`Sayfa ${path}`, path);
  for (const id of confirmed) await page(`Profil /providers/${id.slice(0, 8)}…`, `/providers/${id}`, true);
}

report.status = report.failures.length ? "FAIL" : report.skipped.length ? "INCOMPLETE" : "PASS";
await fs.mkdir("artifacts/prelaunch", { recursive: true });
await fs.writeFile("artifacts/prelaunch/public-provider-visibility.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify({ status: report.status, checks: report.checks.length, failures: report.failures, skipped: report.skipped }, null, 2));
if (report.status !== "PASS") process.exitCode = 1;
