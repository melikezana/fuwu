import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { expect } from "@playwright/test";

const base = process.env.COMMERCE_BASE_URL || "http://127.0.0.1:3046";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname));
const liveCatalog = process.env.FUWU3_READONLY_CATALOG === "true";
const out = path.resolve(liveCatalog ? "artifacts/fuwu3/after-public-backend" : "artifacts/fuwu3/after-offline");
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 390, height: 844 } });
await context.addInitScript(() => localStorage.setItem("fuwu:cookie-consent", "rejected"));
const page = await context.newPage();
const report = { mode: liveCatalog ? "Actual local app + read-only anonymous public backend; no writes or API mocks" : "Actual local app without backend credentials; no API mocks", checks: [], screenshots: [], errors: [], failed: null };
page.on("pageerror", error => report.errors.push(error.message));
page.setDefaultNavigationTimeout(120000);
async function shot(name) {
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.locator("img").evaluateAll(images => images.forEach(image => image.loading = "eager"));
  await page.waitForFunction(() => [...document.images].every(image => image.complete), null, { timeout: 15000 });
  await page.screenshot({ path: path.join(out, name), fullPage: true }); report.screenshots.push(name); }
try {
  console.log("Checking actual page layouts...");
  for (const route of ["/", "/services", "/services/musluk-montaji", "/providers", "/provider-application", "/kullanim-sartlari"]) {
    await page.goto(base + route, { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1").first()).toBeVisible();
    for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${route} overflow at ${width}`);
      if ([390, 1440].includes(width)) await shot(`${route === "/" ? "home" : route.slice(1).replaceAll("/", "-")}-${width}.png`);
    }
  }
  report.checks.push("Six real pages fit 320, 375, 390, 430, 768, 1024 and 1440px without horizontal page overflow.");
  await page.goto(base + "/services", { waitUntil: "domcontentloaded" });
  assert.equal(await page.locator(".commerce-service-card").count(), 0);
  await expect(page.locator(".catalog-connection-notice")).toContainText("Hizmet kataloğuna");
  if (liveCatalog) {
    assert.equal(await page.locator(".catalog-all-categories .home-category-card").count(), 11);
    for (const name of ["Halı Yıkama", "Bahçe Bakımı", "Havuz Bakımı"]) await expect(page.locator(".catalog-all-categories").getByRole("heading", { name, exact: true })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.locator(".catalog-all-categories").evaluate(node => getComputedStyle(node).gridTemplateColumns.split(" ").length), 2);
    await page.locator(".catalog-all-categories").getByRole("link", { name: /Halı Yıkama/ }).click();
    await expect(page).toHaveURL(/category=hali-yikama/);
    await expect(page.locator("h1")).toHaveText("Halı Yıkama");
    report.checks.push("All 11 real active categories survive missing commerce schema; Halı Yıkama, Bahçe and Havuz stay separate, mobile grid has two columns and category links work.");
  } else report.checks.push("Missing backend displays a connection error and no invented catalog, providers or purchase prices.");
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.locator("h1")).toHaveText("Evin için ne gerekiyorsa, FUWU’da.");
  const nav = page.getByRole("navigation", { name: "Mobil alt sekme navigasyonu" });
  assert.equal(await nav.getByRole("link").count(), 5);
  for (const link of await nav.getByRole("link").all()) assert.ok((await link.boundingBox()).height >= 44);
  const header = await page.locator("header").first().boundingBox(), bottom = await nav.boundingBox(); assert.ok(header.y + header.height < bottom.y);
  await page.locator("#home-service-search").focus();
  await page.evaluate(() => { Object.defineProperty(visualViewport, "height", { configurable: true, value: innerHeight - 320 }); visualViewport.dispatchEvent(new Event("resize")); });
  await expect(page.locator("html")).toHaveAttribute("data-keyboard-open", "");
  assert.equal(await nav.isVisible(), false);
  await page.evaluate(() => { delete visualViewport.height; visualViewport.dispatchEvent(new Event("resize")); });
  await expect(nav).toBeVisible();
  await page.setViewportSize({ width: 812, height: 375 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.evaluate(() => document.documentElement.style.fontSize = "200%");
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  report.checks.push("Five mobile customer tabs meet 44px height, header is clear, reduced-motion/landscape/200% text fit. Simulated visualViewport keyboard event hides and restores bottom navigation; physical iOS/Android keyboard is untested.");
  console.log("Checking actual API and route access...");
  const manifest = await (await page.request.get(base + "/manifest.webmanifest")).json(); assert.equal(manifest.display, "standalone"); assert.equal(manifest.lang, "tr");
  for (const route of ["/api/commerce/orders", "/api/commerce/checkout", "/api/commerce/store", "/api/commerce/store/capacity"]) assert.equal((await page.request.post(base + route, { data: {} })).status(), 401);
  for (const route of ["/api/commerce/orders", "/api/commerce/store/capacity"]) assert.equal((await page.request.post(base + route, { headers: { Origin: "https://untrusted.test" }, data: {} })).status(), 403);
  assert.equal((await page.request.get(base + "/api/commerce/quote?offering=invalid")).status(), 400);
  assert.equal((await page.request.get(base + "/api/commerce/quote?offering=30000000-0000-4000-8000-000000000001")).status(), 503);
  assert.equal((await page.request.get(base + "/api/cron/commerce-expiry")).status(), 401);
  for (const route of ["/orders", "/provider-dashboard/orders", "/admin/catalog", "/admin/settings", "/admin/marketplace"]) {
    const response = await page.request.get(base + route, { maxRedirects: 0 }); assert.ok([307, 308].includes(response.status())); assert.equal(new URL(response.headers().location, base).pathname, "/login");
  }
  report.checks.push("Actual APIs reject guest/cross-origin writes and malformed quote IDs; unavailable pricing fails closed. Customer, provider and admin routes require login. PWA manifest is standalone Turkish.");
  assert.deepEqual(report.errors, []);
} catch (error) { report.failed = String(error.stack || error); await shot("failure.png"); process.exitCode = 1; }
finally { await fs.writeFile(path.join(out, "application-tests.json"), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2)); await browser.close(); }

