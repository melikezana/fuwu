import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const output = path.resolve("artifacts/premium-commerce");
await fs.mkdir(output, { recursive: true });
const base = process.env.COMMERCE_BASE_URL || "http://127.0.0.1:3020";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
const report = { routes: [], layouts: 0, protected: [], screenshots: [], errors: [] };
await page.addInitScript(() => { localStorage.setItem("fuwu:cookie-consent", "rejected"); sessionStorage.setItem("fuwu_splash_shown", "true"); });
page.on("pageerror", error => report.errors.push(error.message));
page.on("console", message => {
  if (/hydration|hydrated|Minified React error|server rendered HTML/i.test(message.text())) report.errors.push(message.text());
});
try {
  for (const [route, name] of [["/", "home"], ["/providers", "providers"], ["/services", "catalog"], ["/services?category=temizlik", "category-empty"], ["/services/musluk-montaji", "service"], ["/login", "login"], ["/provider-application", "join"], ["/providers/30000000-0000-4000-8000-000000000099", "profile-missing"]]) {
    await page.goto(base + route, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.locator("h1").first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${route} overflow at ${width}`);
      assert.ok(!/hizmet talep et|talep oluştur|teklif bekle/i.test((await page.locator("main").first().innerText()).toLocaleLowerCase("tr-TR")), `${route} legacy buying language`);
      report.layouts++;
      if ((width === 390 || width === 1440) && ["home", "providers", "login", "catalog", "service"].includes(name)) {
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += innerHeight) {
            scrollTo(0, y); await new Promise(resolve => setTimeout(resolve, 80));
          }
          scrollTo(0, 0);
        });
        await page.locator(name === "home" ? "#home-title" : "h1").first().waitFor();
        await page.evaluate(async () => { await Promise.all([...document.images].filter(img => img.getBoundingClientRect().top < innerHeight).map(img => img.decode().catch(() => {}))); });
        const file = `${name}-${width}.png`;
        await page.screenshot({ path: path.join(output, file), fullPage: true }); report.screenshots.push(file);
        await page.screenshot({ path: path.join(output, `${name}-${width}-viewport.png`) });
      }
    }
    report.routes.push(route);
  }
  for (const route of ["/account?view=favorites", "/account?view=payments", "/orders", "/provider-dashboard/orders", "/provider-dashboard/store", "/provider-dashboard/calendar", "/admin", "/admin/marketplace"]) {
    await page.goto(base + route, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForURL("**/login**"); report.protected.push(route);
  }
  for (const method of ["get", "post"]) {
    const response = await page.request[method](base + "/api/account/favorites", method === "post" ? { data: {} } : {});
    assert.equal(response.status(), 401);
  }
  assert.equal((await page.request.post(base + "/api/account/favorites", { headers: { Origin: "https://untrusted.invalid" }, data: {} })).status(), 403);
  await page.goto(base + "/request?service=tesisat&district=Kad%C4%B1k%C3%B6y", { waitUntil: "domcontentloaded" });
  await page.waitForURL("**/services?**");
  assert.equal(new URL(page.url()).pathname, "/services"); assert.equal(new URL(page.url()).searchParams.get("category"), "tesisat");
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.evaluate(() => { document.documentElement.style.fontSize = "24px"; });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "150% text fits"); report.layouts++;
  await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
  await page.setViewportSize({ width: 844, height: 390 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "landscape fits"); report.layouts++;
  assert.deepEqual(report.errors, []);
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.failed = String(error.stack || error); console.error(report.failed); process.exitCode = 1;
  await page.screenshot({ path: path.join(output, "surface-failure.png"), fullPage: true });
} finally { await fs.writeFile(path.join(output, "surface-tests.json"), JSON.stringify(report, null, 2)); await browser.close(); }
