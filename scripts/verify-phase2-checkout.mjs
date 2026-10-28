import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createServer } from "vite";
import { chromium } from "playwright";
import { expect } from "@playwright/test";

const out = path.resolve(process.env.COMMERCE_OUTPUT_DIR || "artifacts/phase2");
await fs.mkdir(out, { recursive: true });
const root = path.resolve("e2e/fixtures/commerce-ui");
const server = await createServer({ configFile: false, root, publicDir: path.resolve("public"), resolve: { alias: { "@/app/admin/marketplace/health-actions": path.join(root, "health-action.ts"), "@/app/providers/[id]/actions": path.join(root, "review-action.ts"), "@": path.resolve("src"), "next/link": path.join(root, "next-link.tsx"), "next/image": path.join(root, "next-image.tsx"), "next/navigation": path.join(root, "next-navigation.ts") } }, esbuild: { jsx: "automatic" }, server: { host: "127.0.0.1", port: 3041, strictPort: true, fs: { allow: [process.cwd()] } } });
await server.listen();
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
const page = await context.newPage();
page.setDefaultTimeout(15000);
page.setDefaultNavigationTimeout(120000);
const report = { mode: "Real React components; fixture catalog, HTTP and OAuth navigation. No iyzico or Google transaction.", checks: [], screenshots: [], errors: [], failed: null };
page.on("pageerror", error => report.errors.push(error.message));
const base = "http://127.0.0.1:3041";
const provider = "30000000-0000-4000-8000-000000000001";
const district = "20000000-0000-4000-8000-000000000001";
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const nextDay = new Date(`${today}T12:00:00+03:00`); nextDay.setUTCDate(nextDay.getUTCDate() + 1);
const tomorrow = nextDay.toISOString().slice(0, 10);
let mode = "open", feeBps = 0, orderBody, checkoutBody;
const slot = day => ({ starts_at: `${day}T11:00:00+03:00`, ends_at: `${day}T12:00:00+03:00` });
await page.route("**/api/commerce/quote?**", route => {
  if (mode === "pricing-error") return route.fulfill({ status: 503, json: { error: "pricing_unavailable" } });
  const id = new URL(route.request().url()).searchParams.get("offering");
  const price = id === "10000000-0000-4000-8000-000000000003" ? 170000 : id === "70000000-0000-4000-8000-000000000001" ? 105000 : id === "70000000-0000-4000-8000-000000000002" ? 190000 : 85000;
  return route.fulfill({ json: { quote: { service_price_minor: price, customer_fee_minor: Math.round(price * feeBps / 10000), total_minor: price + Math.round(price * feeBps / 10000), commission_minor: Math.round(price / 10), provider_gross_minor: price - Math.round(price / 10), provider_commission_bps: 1000, customer_fee_bps: feeBps, terms_version: "fuwu-fees-v1" } } });
});
await page.route("**/api/commerce/slots?**", route => {
  const params = new URL(route.request().url()).searchParams;
  if (mode === "error") return route.fulfill({ status: 503, json: { error: "store_unavailable" } });
  if (params.has("days")) return route.fulfill({ json: { days: [{ day: today, slots: [] }, { day: tomorrow, slots: mode === "empty" ? [] : [slot(tomorrow)] }] } });
  return route.fulfill({ json: { slots: mode === "empty" || params.get("day") === today ? [] : [slot(params.get("day"))] } });
});
await page.route("**/api/commerce/orders", route => {
  orderBody = route.request().postDataJSON();
  if (mode === "fee-change") { feeBps = 1000; return route.fulfill({ status: 409, json: { error: "fee_changed" } }); }
  return route.fulfill(mode === "guest" ? { status: 401, json: { error: "unauthorized" } } : { status: 201, json: { order: { id: "phase2-fixture-order" } } });
});
await page.route("**/api/commerce/checkout", route => { checkoutBody = route.request().postDataJSON(); return route.fulfill(mode === "checkout-success" ? { json: { paymentPageUrl: "https://sandbox-cpp.iyzipay.com/phase2-fixture" } } : { status: 503, json: { error: "sandbox_unavailable" } }); });
await page.route("https://sandbox-cpp.iyzipay.com/phase2-fixture", route => route.fulfill({ contentType: "text/html", body: "<h1>MOCK checkout navigation only</h1>" }));
async function reset(query = "") { await page.goto(base, { waitUntil: "domcontentloaded" }); await page.evaluate(() => sessionStorage.clear()); await page.goto(`${base}/?screen=booking${query}`, { waitUntil: "domcontentloaded" }); await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 60000 }); }
const next = () => page.locator(".booking-sticky").getByRole("button", { name: "Devam Et", exact: true }).click();
async function summary() {
  await page.getByLabel("İlçe", { exact: true }).selectOption(district);
  await page.getByRole("button", { name: "Bu Ustayla Devam Et" }).first().click(); await next();
  await expect(page.getByRole("button", { name: /Yarın/ })).toBeVisible();
  await page.getByRole("button", { name: /Yarın/ }).click();
  await page.getByRole("radio", { name: "11:00" }).check(); await next();
  await page.getByLabel("Mahalle, sokak, bina ve daire").fill("TEST Phase 2 Ödeme Adresi Sokak 20 Daire 3"); await next();
}
async function shot(name) { await page.screenshot({ path: path.join(out, name + ".png"), fullPage: true }); report.screenshots.push(name + ".png"); await page.screenshot({ path: path.join(out, name + "-viewport.png"), fullPage: false }); report.screenshots.push(name + "-viewport.png"); }
try {
  await reset(`&provider=${provider}`);
  await page.getByLabel("İlçe", { exact: true }).selectOption(district);
  await expect(page.getByRole("button", { name: "Usta seçildi" })).toBeVisible();
  await page.getByLabel("İlçe", { exact: true }).selectOption("20000000-0000-4000-8000-000000000002");
  await expect(page.getByRole("button", { name: "Usta seçildi" })).toHaveCount(0);
  await page.getByLabel("İlçe", { exact: true }).selectOption(district);
  await expect(page.getByRole("button", { name: "Usta seçildi" })).toBeVisible();
  report.checks.push("Provider deep link survives region edits; an unavailable provider is never silently replaced.");
  await page.getByRole("button", { name: "Müsaitliği Gör" }).click();
  await expect(page.getByText("İlk uygun randevu:", { exact: false })).toBeVisible();
  await next();
  await expect(page.getByRole("button", { name: /Yarın/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Bugün/ })).toHaveCount(0);
  report.checks.push("Provider availability comes from HTTP slots; Today stays hidden when empty, Tomorrow is shown only after a successful slot response.");

  await reset("&variant=true&compare=true");
  await page.getByLabel("İlçe", { exact: true }).selectOption(district);
  await expect(page.locator(".commerce-offer")).toHaveCount(2);
  await expect(page.locator(".commerce-offer").nth(1)).toContainText("1.050");
  await page.getByRole("button", { name: "Bu Ustayla Devam Et" }).first().click();
  await page.getByRole("button", { name: "2 klima", exact: true }).click();
  await expect(page.locator(".commerce-summary-total")).toContainText("1.700");
  await expect(page.getByRole("button", { name: "Usta seçildi" })).toHaveCount(1);
  report.checks.push("Two providers expose different prices; switching packages retains the explicitly chosen provider and updates its price/duration.");

  await reset(); await summary();
  await expect(page.getByRole("heading", { name: "Malzeme ve ek işçilik / dahil olmayanlar" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "İptal ve iade", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "kullanım, iptal ve iade koşullarını" })).toHaveCSS("text-decoration-line", "underline");
  for (const width of [320, 360, 375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    const visible = [];
    for (const button of await page.getByRole("button", { name: "Ödemeye Geç", exact: true }).all()) if (await button.isVisible()) visible.push(button);
    assert.equal(visible.length, 1, `One primary payment CTA at ${width}`);
    const bounds = await visible[0].boundingBox(); assert.ok(bounds.height >= 44);
    if ([390, 1440].includes(width)) await shot(`checkout-${width}-FIXTURE`);
  }
  report.checks.push("Checkout scope, exclusions, address, duration, total, cancellation/refund terms and one visible payment CTA fit eight viewport widths.");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".booking-sticky").getByRole("button", { name: "Ödemeye Geç", exact: true }).click();
  await expect(page).toHaveURL(/#\/orders\/phase2-fixture-order/);
  assert.equal(orderBody.offeringId, provider); assert.equal(orderBody.expectedPriceMinor, 85000);
  assert.equal(checkoutBody.orderId, "phase2-fixture-order");
  report.checks.push("One final click creates the hold and starts the existing checkout API; initialization failure preserves access to the same order.");

  mode = "checkout-success"; await reset(); await summary();
  await page.locator(".booking-sticky").getByRole("button", { name: "Ödemeye Geç", exact: true }).click();
  await expect(page).toHaveURL("https://sandbox-cpp.iyzipay.com/phase2-fixture");
  report.checks.push("Successful mocked checkout redirects to the validated sandbox host; the sandbox page itself is intercepted test HTML.");

  mode = "guest"; await reset(); await summary();
  await page.locator(".booking-sticky").getByRole("button", { name: "Ödemeye Geç", exact: true }).click();
  await expect(page).toHaveURL(/#\/login\?next=/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Son bir kontrol" })).toBeVisible();
  await expect(page.locator(".booking-review")).toContainText("TEST Phase 2 Ödeme Adresi Sokak 20 Daire 3");
  mode = "empty"; await page.reload();
  await expect(page.locator(".booking-sticky").getByRole("button", { name: "Ödemeye Geç", exact: true })).toBeDisabled();
  await expect(page.getByText("Seçimin artık uygun değil.", { exact: false })).toBeVisible();
  await shot("oauth-stale-slot-390-FIXTURE");
  report.checks.push("Guest login navigation restores the summary, service/provider/package/date/time/address draft; a newly unavailable slot blocks payment after reload.");

  mode = "guest"; await reset(); await summary();
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException("TEST storage disabled", "SecurityError"); }; });
  await page.locator(".booking-sticky").getByRole("button", { name: "Ödemeye Geç", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Tarayıcı oturum taslağını saklayamadı");
  assert.ok(!page.url().includes("#/login"));
  await expect(page.locator(".booking-review")).toContainText("TEST Phase 2 Ödeme Adresi");
  report.checks.push("Disabled session storage prevents the login redirect and keeps selections visible, with an actionable error.");

  mode = "error"; await reset(`&provider=${provider}&district=${district}`); await next();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator(".booking-sticky").getByRole("button", { name: "Devam Et", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: /Bugün|Yarın/ })).toHaveCount(0);
  report.checks.push("Slot API failure disables purchase and hides unverified quick days.");

  await page.goto(`${base}/?screen=expired`);
  await expect(page.locator(".commerce-sticky").getByRole("button", { name: "Ödemeye Geç", exact: true })).toBeDisabled();
  await expect(page.getByRole("link", { name: "Yeni Gün ve Saat Seç" })).toBeVisible(); await shot("hold-expired-390-FIXTURE");
  report.checks.push("Expired hold disables payment and offers a fresh booking without inventing a new server status.");
  mode = "open"; feeBps = 500; await reset(); await summary();
  const pay = () => page.locator(".booking-sticky").getByRole("button", { name: "Ödemeye Geç", exact: true });
  await expect(pay()).toBeDisabled();
  const consent = page.getByRole("checkbox", { name: /FUWU platform ücretini/ });
  await expect(consent).not.toBeChecked(); await consent.check(); await expect(pay()).toBeEnabled();
  await expect(page.locator(".booking-review-summary")).toContainText("892,5");
  await shot("customer-fee-consent-390-FIXTURE"); await pay().click();
  assert.equal(orderBody.expectedTotalMinor, 89250); assert.equal(orderBody.feeConsent, true); assert.equal(orderBody.termsVersion, "fuwu-fees-v1");
  report.checks.push("5% platform fee is separate from the service price, total is 892.50 TRY, unchecked explicit consent blocks payment and exact total/version reach the order request (mock APIs).");
  mode = "fee-change"; feeBps = 500; await reset(); await summary(); await consent.check(); await pay().click();
  await expect(page.getByRole("alert")).toContainText("Platform ücreti güncellendi");
  await expect(page.locator(".booking-review-summary")).toContainText("935"); await expect(consent).not.toBeChecked(); await expect(pay()).toBeDisabled();
  report.checks.push("Server fee-change conflict refreshes the displayed quote and clears consent before another attempt.");
  mode = "pricing-error"; await reset(); await summary(); await expect(pay()).toBeDisabled();
  await expect(page.getByRole("alert").first()).toContainText("Toplam ücret doğrulanamadı");
  report.checks.push("Quote connection failure never silently charges a zero fee or enables payment.");
  assert.deepEqual(report.errors, []);
} catch (error) { report.failed = String(error.stack || error); await shot("phase2-failure"); process.exitCode = 1; }
finally { await fs.writeFile(path.join(out, "browser-tests.json"), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2)); await browser.close(); await server.close(); }
