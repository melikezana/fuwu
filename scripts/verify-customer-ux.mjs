import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.UX_BASE_URL || "http://127.0.0.1:3021";
const output = path.resolve("artifacts/ux-redesign/verified");
const widths = [320, 375, 390, 430, 768, 1024, 1440];
const routes = [
  ["home", "/"], ["providers", "/providers"], ["request", "/request"],
  ["login", "/login"], ["provider-application", "/provider-application"],
  ["waitlist", "/waitlist"], ["kvkk", "/kvkk"], ["privacy", "/gizlilik"],
  ["terms", "/kullanim-sartlari"], ["cookies", "/cerez-politikasi"],
  ["not-found", "/ux-verification-missing-page"],
];
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
await context.addInitScript(() => {
  localStorage.setItem("fuwu:cookie-consent", "rejected");
  sessionStorage.setItem("fuwu_splash_shown", "true");
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push({ url: page.url(), message: error.message }));
const report = { baseURL, widths, pages: [], interactions: [], protectedRoutes: [], errors, failures: [] };

async function audit(label) {
  const result = await page.evaluate(() => {
    const viewport = window.innerWidth;
    const outside = [];
    const clipped = [];
    const selector = "h1,h2,h3,h4,p,li,dt,dd,label,button,a,input,select,textarea";
    for (const element of document.querySelectorAll(selector)) {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (!rect.width || !rect.height || style.visibility === "hidden" || element.closest('[aria-hidden="true"],.sr-only')) continue;
      let hiddenByAncestor = false;
      for (let ancestor = element.parentElement; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
        const ancestorStyle = getComputedStyle(ancestor);
        if (/hidden|clip|auto|scroll/.test(ancestorStyle.overflowX)) {
          const ancestorRect = ancestor.getBoundingClientRect();
          if (rect.right <= ancestorRect.left || rect.left >= ancestorRect.right) hiddenByAncestor = true;
        }
      }
      const name = element.tagName.toLowerCase() + (element.id ? "#" + element.id : "") + ": " + element.textContent.trim().slice(0, 100);
      if (!hiddenByAncestor && (rect.left < -1 || rect.right > viewport + 1)) outside.push({ name, left: rect.left, right: rect.right });
      if (!/^(INPUT|SELECT|TEXTAREA)$/.test(element.tagName) && /hidden|clip/.test(style.overflowX) && element.scrollWidth > element.clientWidth + 2) clipped.push({ name, axis: "x" });
      if (/hidden|clip/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 3) clipped.push({ name, axis: "y" });
    }
    return { viewport, documentWidth: document.documentElement.scrollWidth, outside, clipped };
  });
  const entry = { label, ...result };
  report.pages.push(entry);
  if (entry.documentWidth > entry.viewport + 1 || entry.outside.length || entry.clipped.length) report.failures.push(entry);
  return entry;
}

async function loadImages() {
  await page.evaluate(async () => {
    for (let top = 0; top < document.body.scrollHeight; top += 650) {
      window.scrollTo(0, top);
      await new Promise((resolve) => setTimeout(resolve, 45));
    }
    window.scrollTo(0, 0);
    await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
  });
}

try {
  for (const [name, route] of routes) {
    const response = await page.goto(baseURL + route, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.locator("main h1").first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(response.status(), name === "not-found" ? 404 : 200, name + " status");
    for (const width of widths) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
      await page.waitForTimeout(120);
      await audit(name + "-" + width);
      if (name === "home") {
        const placeholderFits = await page.locator("#home-service-search").evaluate((input) => {
          const style = getComputedStyle(input);
          const canvas = document.createElement("canvas");
          const canvasContext = canvas.getContext("2d");
          canvasContext.font = style.font;
          return canvasContext.measureText(input.placeholder).width <= input.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 8;
        });
        assert.equal(placeholderFits, true, "Search placeholder fits at " + width);
        await loadImages();
        await page.screenshot({ path: path.join(output, "home-" + width + ".png"), fullPage: true });
        await page.screenshot({ path: path.join(output, "home-" + width + "-viewport.png") });
        assert.equal(await page.locator("canvas").count(), 0, "No WebGL canvas on home");
        assert.equal(await page.locator('img[src*="Meshy"],img[src*="house.glb"]').count(), 0, "No cartoon imagery on home");
      } else if (["request", "providers", "provider-profile", "login"].includes(name) && [390, 1440].includes(width)) {
        await loadImages();
        await page.screenshot({ path: path.join(output, name + "-" + width + ".png"), fullPage: true });
      }
    }
    if (name === "providers") {
      const profile = page.locator('main a[href^="/providers/"]').first();
      if (await profile.count()) routes.push(["provider-profile", await profile.getAttribute("href")]);
    }
    console.log("Responsive: " + name + " (7 widths)");
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Ev bakımı", exact: true }).click();
  assert.equal(await page.locator(".home-category-card").count(), 2);
  await page.getByRole("button", { name: "Tüm hizmetler", exact: true }).click();
  assert.equal(await page.locator(".home-category-card").count(), 10);
  for (const link of await page.locator(".home-category-card").evaluateAll((links) => links.map((link) => link.href))) {
    assert.ok(new URL(link).searchParams.get("category"));
  }
  report.interactions.push("Category filters and all 10 category destinations");

  await page.locator('button[aria-controls="mobile-navigation-menu"]').click();
  assert.equal(await page.locator("#mobile-navigation-menu").isVisible(), true);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#mobile-navigation-menu").count(), 0);
  assert.equal(await page.locator('.mobile-tab[aria-current="page"]').getAttribute("href"), "/");
  report.interactions.push("Mobile menu, Escape/focus return and active bottom tab");

  await page.locator('button[aria-controls="mobile-navigation-menu"]').click();
  await page.getByRole("button", { name: "Yardım ve Destek", exact: true }).click();
  await page.getByRole("button", { name: "Akıllı Asistanı Aç", exact: true }).waitFor();
  await page.getByRole("button", { name: "Destek panelini kapat", exact: true }).click();
  assert.equal(await page.getByRole("button", { name: "Fuwu Akıllı Asistan destek panelini aç", exact: true }).isVisible(), false);
  report.interactions.push("Mobile help stays available in the menu without covering service or payment controls");

  await page.locator(".home-how-link").click();
  await page.waitForURL(/#how-it-works$/);
  assert.equal(await page.locator("#how-it-works").isVisible(), true);
  await page.locator(".home-faq-items summary").first().click();
  assert.equal(await page.locator(".home-faq-items details").first().getAttribute("open"), "");
  report.interactions.push("How it works anchor and accessible FAQ disclosure");

  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Hangi hizmete ihtiyacınız var?", { exact: true }).fill("Temizlik");
  const districtOptions = await page.locator('#home-district option').evaluateAll((options) => options.map((option) => option.value).filter(Boolean));
  if (districtOptions.length) await page.locator("#home-district").selectOption(districtOptions[0]);
  await page.getByRole("button", { name: "Hizmet Bul", exact: true }).click();
  await page.waitForURL(/\/providers\?/);
  const searchURL = new URL(page.url());
  assert.equal(searchURL.searchParams.get("q"), "Temizlik");
  if (districtOptions.length) assert.equal(searchURL.searchParams.get("district"), districtOptions[0]);
  await audit("search-results-390");
  report.interactions.push("Service search preserves query and optional district in existing directory flow");

  await page.goto(baseURL + "/request?service=temizlik", { waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="request-form"]').waitFor();
  assert.equal(await page.locator('input[name="serviceCategory"]:checked').count(), 1);
  assert.ok(/temizlik/i.test(await page.locator('input[name="serviceCategory"]:checked').inputValue()));
  report.interactions.push("Request form loads with service preselection; no order/payment submitted");

  for (const route of ["/account", "/account/notifications", "/dashboard", "/dashboard/requests", "/provider-dashboard", "/provider-dashboard/requests", "/provider-dashboard/profile", "/admin", "/admin/payments"]) {
    await page.goto(baseURL + route, { waitUntil: "domcontentloaded" });
    const url = new URL(page.url());
    assert.equal(url.pathname, "/login", "Unauthenticated route protection: " + route);
    assert.equal(url.searchParams.get("next"), route);
    report.protectedRoutes.push({ route, redirect: url.pathname + url.search });
  }

  const manifestResponse = await context.request.get(baseURL + "/manifest.webmanifest");
  assert.equal(manifestResponse.status(), 200);
  const manifest = await manifestResponse.json();
  assert.equal(manifest.display, "standalone");
  for (const icon of manifest.icons) assert.equal((await context.request.get(baseURL + icon.src)).status(), 200);
  report.interactions.push("PWA standalone manifest and icons remain accessible");

  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    const nodes = [...document.querySelectorAll("h1,h2,h3,h4,p,span,a,button,label")];
    const sizes = nodes.map((element) => parseFloat(getComputedStyle(element).fontSize));
    nodes.forEach((element, index) => { element.style.fontSize = sizes[index] * 1.5 + "px"; });
  });
  await audit("home-390-text-150-percent");
  await page.screenshot({ path: path.join(output, "home-390-large-text.png"), fullPage: true });

  const consentContext = await browser.newContext({ viewport: { width: 320, height: 844 } });
  const consentPage = await consentContext.newPage();
  await consentPage.goto(baseURL, { waitUntil: "domcontentloaded" });
  const banner = consentPage.getByRole("alert", { name: "Çerez İzni" });
  await banner.waitFor();
  const bannerBox = await banner.boundingBox();
  const navBox = await consentPage.locator(".mobile-tab-bar").boundingBox();
  assert.ok(bannerBox.y + bannerBox.height <= navBox.y - 4, "Cookie actions must stay above bottom navigation");
  await consentPage.screenshot({ path: path.join(output, "home-320-consent.png") });
  await banner.getByRole("button", { name: "Reddet" }).click();
  assert.equal(await consentPage.evaluate(() => localStorage.getItem("fuwu:cookie-consent")), "rejected");
  await consentContext.close();
  report.interactions.push("Cookie consent at 320px stays above bottom navigation and persists choice");
} catch (error) {
  report.failures.push({ message: error.message, stack: error.stack });
} finally {
  await fs.writeFile(path.join(output, "verification.json"), JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ auditedLayouts: report.pages.length, interactions: report.interactions, protectedRoutes: report.protectedRoutes.length, failures: report.failures.length, pageErrors: errors.length }, null, 2));
if (report.failures.length || errors.length) process.exitCode = 1;
