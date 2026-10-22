import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium, webkit, devices } from "playwright";

// Engine/device emulation only: no real Google consent, account, payment or physical device.
const base = process.env.FUSION_BASE_URL || "http://127.0.0.1:3067";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname));
const engine = process.env.FUSION_MOBILE_ENGINE === "webkit" ? "webkit" : "chromium";
const out = path.resolve("artifacts/fusion-quality/mobile"); await fs.mkdir(out, { recursive: true });
const report = { scope: "Local real Next.js pages in mobile browser engine emulation, guest only; not physical Safari/Chrome OAuth E2E", engine, checks: [], errors: [], failed: null };
const browser = await (engine === "webkit" ? webkit : chromium).launch();
const descriptor = devices[engine === "webkit" ? "iPhone 13" : "Pixel 7"];
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: descriptor.userAgent, isMobile: true, hasTouch: true, deviceScaleFactor: descriptor.deviceScaleFactor, reducedMotion: "reduce" });
await context.addInitScript(() => { localStorage.setItem("fuwu:cookie-consent", "rejected"); sessionStorage.setItem("fuwu_splash_shown", "true"); });
const page = await context.newPage(); page.on("pageerror", error => report.errors.push(error.message));
try {
  for (const [name, route] of [["home", "/"], ["service", "/services/musluk-montaji"], ["login", "/login"]]) {
    await page.goto(base + route, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.locator("main h1").first().waitFor();
    for (const [width, height] of [[390, 844], [844, 390]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${engine} ${name} fits ${width}`);
      if (name === "service" && width === 390) {
        const sizes = await page.locator(".commerce-field input,.commerce-field select,.commerce-field textarea").evaluateAll(nodes => nodes.map(node => parseFloat(getComputedStyle(node).fontSize)));
        assert.ok(sizes.length > 0 && sizes.every(size => size >= 16), `Mobile booking controls avoid sub-16px text: ${JSON.stringify(sizes)}`);
      }
      if (width === 390 && name !== "home") await page.screenshot({ path: path.join(out, `${engine}-${name}-390.png`), fullPage: true });
    }
    report.checks.push(`${name}: portrait/landscape, no horizontal overflow`);
  }
  await page.goto(base + "/account?view=active", { waitUntil: "domcontentloaded" });
  await page.waitForURL("**/login?**"); assert.equal(new URL(page.url()).searchParams.get("next"), "/account?view=active");
  report.checks.push("Protected account retains complete login return path");
  await page.goto(base + "/auth/callback?error=access_denied&next=%2Fservices%2Fmusluk-montaji%3Fprovider%3Dchosen", { waitUntil: "domcontentloaded" });
  assert.equal(new URL(page.url()).pathname, "/login"); assert.equal(new URL(page.url()).searchParams.get("next"), "/services/musluk-montaji?provider=chosen");
  report.checks.push("OAuth cancellation keeps the booking return path and origin");
  assert.deepEqual(report.errors, []);
} catch (error) { report.failed = String(error.stack || error); process.exitCode = 1; }
finally { await fs.writeFile(path.join(out, `${engine}-tests.json`), JSON.stringify(report, null, 2)); await browser.close(); }
console.log(JSON.stringify(report, null, 2));
