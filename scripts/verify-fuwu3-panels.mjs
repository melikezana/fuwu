import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createServer } from "vite";
import { chromium } from "playwright";
import { expect } from "@playwright/test";

const root = path.resolve("e2e/fixtures/commerce-ui"), out = path.resolve("artifacts/fuwu3/fixture-panels");
await fs.mkdir(out, { recursive: true });
const server = await createServer({ configFile: false, root, publicDir: path.resolve("public"), resolve: { alias: { "@/app/admin/marketplace/health-actions": path.join(root, "health-action.ts"), "@/app/providers/[id]/actions": path.join(root, "review-action.ts"), "@": path.resolve("src"), "next/link": path.join(root, "next-link.tsx"), "next/image": path.join(root, "next-image.tsx"), "next/navigation": path.join(root, "next-navigation.ts") } }, esbuild: { jsx: "automatic" }, server: { host: "127.0.0.1", port: 3048, strictPort: true, fs: { allow: [process.cwd()] } } });
await server.listen();
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
const report = { mode: "Real admin/provider React components, synthetic summary and mocked capacity HTTP. Role security is tested separately in PostgreSQL.", checks: [], screenshots: [], errors: [], failed: null };
page.on("pageerror", error => report.errors.push(error.message));
let capacityBody, capacityFailure = false;
await page.route("**/api/commerce/store/capacity", route => { capacityBody = route.request().postDataJSON(); return route.fulfill(capacityFailure ? { status: 409, json: { error: "store_unavailable" } } : { json: { ok: true } }); });
async function shot(name) { await page.screenshot({ path: path.join(out, name), fullPage: true }); report.screenshots.push(name); }
try {
  await page.goto("http://127.0.0.1:3048/?screen=admin");
  await expect(page.getByRole("button", { name: "Büyüme", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Ölçüm verisi yok", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Finans", exact: true }).click();
  await expect(page.getByText("Muhasebe verisi yok", { exact: true })).toBeVisible();
  await expect(page.locator("article").filter({ hasText: "Müşteri platform ücreti" })).toContainText("42,50");
  await expect(page.locator("article").filter({ hasText: "Brüt platform geliri" })).toContainText("127,50");
  for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    if ([390, 1440].includes(width)) await shot(`admin-finance-${width}-FIXTURE.png`);
  }
  await page.getByRole("button", { name: "Operasyon ve kalite", exact: true }).click(); await expect(page.getByText("Geciken hizmet", { exact: true })).toBeVisible();
  report.checks.push("Three admin views switch accessibly; service GMV, customer charge and fees remain separate, missing accounting/CAC are explicit and seven viewport widths fit.");
  await page.goto("http://127.0.0.1:3048/?screen=phase3-store");
  const input = page.getByLabel("Bir günde en fazla kaç sipariş alabilirsin?");
  await expect(page.getByText("Henüz günlük adet sınırı belirlenmedi.", { exact: false })).toBeVisible();
  await input.fill("0"); await page.getByRole("button", { name: "Günlük Sınırı Kaydet" }).click(); assert.equal(capacityBody, undefined);
  await input.fill("3"); await page.getByRole("button", { name: "Günlük Sınırı Kaydet" }).click();
  await expect(page.getByRole("status")).toContainText("Günlük sipariş sınırın kaydedildi"); assert.equal(capacityBody.limit, 3);
  await expect(page.getByText("Henüz günlük adet sınırı belirlenmedi.", { exact: false })).toHaveCount(0);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    if (width !== 320) await shot(`provider-store-capacity-${width}-FIXTURE.png`);
  }
  capacityFailure = true; await input.fill("4"); await page.getByRole("button", { name: "Günlük Sınırı Kaydet" }).click();
  await expect(page.getByRole("alert")).toContainText("Günlük sınır kaydedilemedi");
  report.checks.push("Provider capacity rejects zero, saves the chosen value with clear confirmation, clears the unset state and exposes request failure; mobile and desktop layouts fit.");
  assert.deepEqual(report.errors, []);
} catch (error) { report.failed = String(error.stack || error); await shot("failure.png"); process.exitCode = 1; }
finally { await fs.writeFile(path.join(out, "panel-tests.json"), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2)); await browser.close(); await server.close(); }
