import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { expect } from "@playwright/test";

const base = process.env.COMMERCE_BASE_URL || "http://127.0.0.1:3042";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "This probe is local-only");
const out = path.resolve(process.env.COMMERCE_OUTPUT_DIR || "artifacts/phase2");
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
await context.addInitScript(() => localStorage.setItem("fuwu:cookie-consent", "rejected"));
const page = await context.newPage();
const report = { mode: "Actual local production application, no API mocks, no configured staging backend or payment credentials", checks: [], screenshots: [], errors: [], failed: null };
page.on("pageerror", error => report.errors.push(error.message));
try {
  for (const route of ["/services", "/services/musluk-montaji"]) {
    await page.goto(base + route, { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toBeVisible();
    for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      if ([390, 1440].includes(width)) {
        const name = `actual-${route === "/services" ? "catalog" : "unavailable-service"}-${width}.png`;
        await page.screenshot({ path: path.join(out, name), fullPage: true }); report.screenshots.push(name);
      }
    }
  }
  await expect(page.getByText("Bu hizmet şu anda satın alınamıyor.", { exact: false })).toBeVisible();
  report.checks.push("Actual catalog and service page fit seven widths; missing backend is shown as unavailable without inventing providers/prices/slots.");
  for (const route of ["/api/commerce/orders", "/api/commerce/checkout", "/api/commerce/store"]) assert.equal((await page.request.post(base + route, { data: {} })).status(), 401);
  assert.equal((await page.request.post(base + "/api/commerce/orders", { headers: { Origin: "https://untrusted.test" }, data: {} })).status(), 403);
  assert.equal((await page.request.get(base + "/api/cron/commerce-expiry")).status(), 401);
  assert.equal((await page.request.post(base + "/api/commerce/payment-callback", { form: { token: "test-only-no-session" } })).status(), 503);
  report.checks.push("Actual APIs deny guest writes, cross-origin order creation and unauthorized cron; payment callback fails closed without sandbox credentials.");
  const ids = "offering=30000000-0000-4000-8000-000000000001&district=20000000-0000-4000-8000-000000000001";
  for (const query of [ids + "&day=2026-02-30", ids + "&day=2026-10-28&days=9", "offering=invalid&day=2026-10-28"]) assert.equal((await page.request.get(base + "/api/commerce/slots?" + query)).status(), 400);
  report.checks.push("Actual availability route rejects impossible calendar dates, invalid UUIDs and unbounded day ranges.");
  for (const route of ["/orders", "/provider-dashboard/orders"]) {
    const response = await page.request.get(base + route, { maxRedirects: 0 });
    assert.ok([307, 308].includes(response.status()));
    assert.equal(new URL(response.headers().location, base).pathname, "/login");
  }
  const callback = await page.request.get(base + "/auth/callback?next=%2F%2Funtrusted.test", { maxRedirects: 0 });
  const redirect = new URL(callback.headers().location); assert.equal(redirect.origin, base); assert.equal(redirect.pathname, "/login"); assert.equal(redirect.searchParams.get("next"), "/account");
  report.checks.push("Actual protected pages require login and OAuth callback rejects an external return path.");
  assert.deepEqual(report.errors, []);
} catch (error) { report.failed = String(error.stack || error); process.exitCode = 1; }
finally { await fs.writeFile(path.join(out, "application-tests.json"), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2)); await browser.close(); }
