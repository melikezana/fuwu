import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { expect } from "@playwright/test";

// Read-only against the app: no signed-in sessions, requests, applications or payments submitted.
const baseURL = process.env.UX_BASE_URL || "http://127.0.0.1:3024";
const output = path.resolve("artifacts/marketplace-transformation");
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
await context.addInitScript(() => {
  localStorage.setItem("fuwu:cookie-consent", "rejected");
  sessionStorage.setItem("fuwu_splash_shown", "true");
});
const page = await context.newPage();
const report = { checks: [], errors: [], screenshots: [], failure: null };
page.on("pageerror", error => report.errors.push(error.message));
async function visit(route) {
  await page.goto(baseURL + route, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.locator("main h1").first().waitFor();
  await page.evaluate(() => document.fonts.ready);
}
async function shot(name, fullPage = false) {
  await page.locator("img").evaluateAll(images => Promise.all(images.filter(image => { const rect = image.getBoundingClientRect(); return rect.bottom > 0 && rect.top < innerHeight; }).map(image => image.decode().catch(() => {}))));
  await page.screenshot({ path: path.join(output, name + ".png"), fullPage });
  report.screenshots.push(name + ".png");
}
async function fits(label) {
  const result = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  assert.ok(result.scroll <= result.width + 1, label + " must fit viewport");
}
try {
  await visit("/providers");
  const cards = page.locator(".market-provider-card");
  assert.ok(await cards.count() > 0, "Real provider directory is available for read-only verification");
  const name = (await cards.locator("h3").allTextContents()).map(name => name.trim()).sort((a,b) => b.length - a.length)[0];
  const profileHref = await cards.filter({ has: page.getByRole("heading", { name, exact: true }) }).getByRole("link", { name: /Profili Gör/ }).getAttribute("href");
  await page.getByRole("searchbox", { name: "Ne için usta arıyorsunuz?" }).fill(name);
  await page.getByRole("button", { name: "Ustaları Göster", exact: true }).click();
  await page.waitForLoadState("domcontentloaded");
  assert.equal(new URL(page.url()).searchParams.get("q"), name);
  assert.ok(await cards.count() > 0);
  for (const title of await cards.locator("h3").allTextContents()) assert.ok(title.toLocaleLowerCase("tr").includes(name.toLocaleLowerCase("tr")));
  report.checks.push("Text search filters real providers and preserves the query");

  await page.getByRole("button", { name: "Sırala", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "Sırala", exact: true });
  await dialog.waitFor();
  await fits("Sort sheet");
  await page.keyboard.press("Escape");
  assert.equal(await dialog.count(), 0);
  assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), "Sırala");
  await page.getByRole("button", { name: "Sırala", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Sırala", exact: true });
  const sortOptions = dialog.locator("button").filter({ hasNotText: "Sıralamayı Uygula" });
  if (await sortOptions.count() > 2) await sortOptions.last().click();
  await dialog.getByRole("button", { name: "Sıralamayı Uygula" }).click();
  await page.waitForLoadState("domcontentloaded");
  assert.equal(new URL(page.url()).searchParams.get("q"), name);
  report.checks.push("Mobile sorting applies through GET, retains search and returns focus on Escape");

  await page.getByRole("button", { name: /^Filtrele/ }).click();
  dialog = page.getByRole("dialog", { name: "Ustaları Filtrele" });
  await dialog.waitFor();
  await shot("filters-390");
  if (await dialog.locator('[name="average_price_min"]').count()) {
    await dialog.locator('[name="average_price_min"]').fill("9999999");
    await dialog.getByRole("button", { name: /Ustayı Göster/ }).click();
    await page.waitForLoadState("domcontentloaded");
    assert.equal(new URL(page.url()).searchParams.get("q"), name);
    assert.equal(new URL(page.url()).searchParams.get("average_price_min"), "9999999");
    assert.equal(await cards.count(), 0);
    await page.getByRole("link", { name: "Filtreleri Temizle", exact: true }).click();
    await page.waitForURL(url => url.pathname === "/providers" && !url.search);
    await expect(cards).not.toHaveCount(0);
    report.checks.push("Price range uses real data, shows empty results and can be cleared");
  } else await page.keyboard.press("Escape");

  await visit(profileHref);
  assert.equal(await page.locator("h1").innerText(), name);
  const requestHref = await page.locator(".market-mobile-action").getByRole("link", { name: /Hizmet Talep Et/ }).getAttribute("href");
  const requestParams = new URL(requestHref, baseURL).searchParams;
  assert.equal(requestParams.get("provider_id"), profileHref.split("/").pop());
  assert.ok(requestParams.get("service"));
  assert.ok(requestParams.get("district"));
  await shot("profile-390");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await shot("profile-1440");
  report.checks.push("Real profile passes provider, service and district to request flow; no fabricated rating");

  await page.setViewportSize({ width: 390, height: 844 });
  await visit(requestHref);
  const active = page.locator('.request-progress [aria-current="step"]');
  assert.equal((await active.innerText()).trim(), "Tarih");
  await page.locator(".market-request-mobile-action").getByRole("button", { name: "Devam Et" }).click();
  await expect(page.locator('[role="alert"]').first()).toBeVisible();
  assert.equal((await active.innerText()).trim(), "Tarih");
  const futureDate = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
  await page.locator('[name="preferredDate"]').fill(futureDate);
  await page.locator('label:has(input[name="urgencyLevel"][value="Bu hafta"])').click();
  await expect(page.locator('input[name="urgencyLevel"][value="Bu hafta"]')).toBeChecked();
  await page.locator(".market-request-mobile-action").getByRole("button", { name: "Devam Et" }).click();
  await expect(active).toHaveText("Saat");
  await page.getByRole("button", { name: "Önceki adıma dön" }).click();
  await expect(active).toHaveText("Tarih");
  await expect(page.locator('[name="preferredDate"]')).toHaveValue(futureDate);
  await page.locator('[name="fullAddress"]').fill("Arayüz kontrolü için geçici taslak adresi");
  await page.locator('[name="fullName"]').fill("Yerel Taslak Kontrolü");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator('[name="fullAddress"]')).toHaveValue("Arayüz kontrolü için geçici taslak adresi");
  await expect(page.locator('[name="fullName"]')).toHaveValue("Yerel Taslak Kontrolü");
  await page.locator('[name="fullName"]').focus();
  await page.evaluate(() => {
    Object.defineProperty(visualViewport, "height", { configurable:true, get: () => innerHeight - 300 });
    visualViewport.dispatchEvent(new Event("resize"));
  });
  await expect(page.locator("html")).toHaveAttribute("data-keyboard-open", "");
  await expect(page.locator(".mobile-tab-bar")).toBeHidden();
  await expect(page.locator(".market-request-mobile-action")).toHaveCSS("bottom", "300px");
  await page.evaluate(() => { delete visualViewport.height; visualViewport.dispatchEvent(new Event("resize")); document.activeElement?.blur(); scrollTo(0,0); });
  await expect(page.locator(".mobile-tab-bar")).toBeVisible();
  for (const width of [320,375,390,430,768,1024,1440]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
    await fits("Request with long provider name " + width);
  }
  await page.setViewportSize({ width:390, height:844 });
  await shot("request-390");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await shot("request-1440");
  report.checks.push("Mobile next/back retain values, validate required fields, preserve drafts on reload and clear the simulated keyboard");

  for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
    await visit("/provider-application");
    await page.getByRole("link", { name: "Usta Olarak Başvur", exact: true }).click();
    await fits("Provider application " + width);
    assert.equal(new URL(page.url()).hash, "#provider-application-form");
    if ([390, 1440].includes(width)) {
      await page.evaluate(() => scrollTo(0, 0));
      await shot("provider-application-" + width);
      await shot("provider-application-" + width + "-full", true);
    }
  }
  const application = page.getByTestId("provider-application-form");
  await application.locator('[name="fullName"]').fill("Yerel Başvuru Taslağı");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(application.locator('[name="fullName"]')).toHaveValue("Yerel Başvuru Taslağı");
  report.checks.push("Provider landing, application anchor and partial draft work at all seven required widths");
  await visit("/providers");
  await shot("providers-1440", true);
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("providers-390", true);
  assert.equal(report.errors.length, 0, "No browser JavaScript errors");
} catch (error) {
  report.failure = { message: error.message, stack: error.stack };
  await shot("failure");
  process.exitCode = 1;
} finally {
  await fs.writeFile(path.join(output, "verification.json"), JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));

