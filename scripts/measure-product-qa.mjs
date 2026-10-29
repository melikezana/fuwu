import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
const stage = process.argv.includes("--after") ? "after" : "before";
const out = path.resolve("artifacts/product-qa", stage);
await fs.mkdir(out, { recursive: true });
const base = "http://127.0.0.1:3117";
const { default: lighthouse } = await import(pathToFileURL(path.resolve("artifacts/premium-mobile/lighthouse-runtime/node_modules/lighthouse/core/index.js")).href);
const browser = await chromium.launch({ channel: "msedge", args: ["--remote-debugging-port=9247"] });
const report = { stage, buildId: (await fs.readFile(".next/BUILD_ID", "utf8")).trim(), at: new Date().toISOString(), scope: "LOCAL production build, anonymous remote Supabase reads only. Lighthouse mobile simulated throttling. Not live deployment/field CWV. No RUM INP sample.", runs: [] };
try {
  for (const [route, run] of [["/", 1], ["/", 2], ["/", 3], ["/services", 1]]) {
    const result = await lighthouse(base + route, { port: 9247, output: "json", logLevel: "error", onlyCategories: ["performance", "accessibility"], disableStorageReset: false });
    const a = result.lhr.audits;
    const name = `${route === "/" ? "home" : "services"}-${run}`;
    await fs.writeFile(path.join(out, `${name}.json`), result.report);
    const entry = { route, run, performance: result.lhr.categories.performance.score, accessibility: result.lhr.categories.accessibility.score, lcp_ms: a["largest-contentful-paint"].numericValue, cls: a["cumulative-layout-shift"].numericValue, tbt_ms: a["total-blocking-time"].numericValue, ttfb_ms: a["server-response-time"]?.numericValue, bytes: a["total-byte-weight"]?.numericValue, lcpBreakdown: a["lcp-breakdown-insight"]?.details, renderBlocking: a["render-blocking-insight"]?.details, unusedJs: a["unused-javascript"]?.details?.items?.map(i => ({ url: new URL(i.url).pathname, bytes: i.totalBytes, wasted: i.wastedBytes })), runtimeError: result.lhr.runtimeError, warnings: result.lhr.runWarnings };
    report.runs.push(entry); console.log(name, entry.lcp_ms, entry.cls, entry.ttfb_ms);
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("fuwu:cookie-consent", "rejected"));
  for (const [name, route] of [["home", "/"], ["services", "/services"], ["providers", "/providers"], ["login", "/login"]]) {
    await page.goto(base + route); await page.locator("h1").first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(out, `${name}-390.png`), fullPage: true });
  }
} catch (e) { report.failure = String(e.stack); process.exitCode = 1; }
finally {
  report.acceptance = { lcpTargetMs: 2500, clsTarget: .1, allLcpPass: report.runs.length === 4 && report.runs.every(r => r.lcp_ms <= 2500), allClsPass: report.runs.length === 4 && report.runs.every(r => r.cls <= .1), inp: "UNAVAILABLE: no real-user data" };
  if (stage === "after" && (!report.acceptance.allLcpPass || !report.acceptance.allClsPass)) process.exitCode = 1;
  await fs.writeFile(path.join(out, "performance.json"), JSON.stringify(report, null, 2)); await browser.close();
}
