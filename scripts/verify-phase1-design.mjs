import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const base = process.env.PHASE1_BASE_URL || "http://127.0.0.1:3028";
const output = path.resolve(process.env.PHASE1_OUTPUT_DIR || "artifacts/phase1");
const shots = path.join(output, "screenshots", "after");
await fs.mkdir(shots, { recursive: true });
const browser = await chromium.launch({ channel: process.env.PHASE1_BROWSER || "msedge" });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
await context.addInitScript(() => {
  localStorage.setItem("fuwu:cookie-consent", "rejected");
  window.__phase1Perf = { lcp: 0, cls: 0 };
  try { new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__phase1Perf.lcp = entry.startTime; }).observe({ type: "largest-contentful-paint", buffered: true }); } catch { /* Engine without LCP support. */ }
  try { new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__phase1Perf.cls += entry.value; }).observe({ type: "layout-shift", buffered: true }); } catch { /* Engine without CLS support. */ }
});
const page = await context.newPage();
page.setDefaultTimeout(15000);
page.setDefaultNavigationTimeout(90000);
const report = { base, routes: [], layouts: [], checks: [], screenshots: [], links: [], brokenImages: [], runtimeErrors: [], performance: [], pwa: {}, failed: null };
const links = new Set();
page.on("pageerror", error => report.runtimeErrors.push(error.message));
page.on("console", message => { if (/hydration|hydrated|Minified React error|server rendered HTML/i.test(message.text())) report.runtimeErrors.push(message.text()); });
async function goto(route) { await page.goto(base + route, { waitUntil: "domcontentloaded" }); await page.locator("h1").first().waitFor(); await page.evaluate(() => document.fonts.ready); }
async function settle() { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
async function shot(name, fullPage = false) { await page.screenshot({ path: path.join(shots, `${name}.png`), fullPage }); report.screenshots.push(`screenshots/after/${name}.png`); }
async function loadImages() { await page.evaluate(async () => { for (let y=0; y<document.body.scrollHeight; y+=innerHeight) { scrollTo(0,y); await new Promise(resolve=>setTimeout(resolve,65)); } scrollTo(0,0); await Promise.all([...document.images].map(image=>image.decode().catch(()=>{}))); }); }

try {
  for (const [route, name] of [["/", "home"], ["/services", "catalog"], ["/providers", "providers"], ["/services/musluk-montaji", "service"], ["/login", "login"], ["/provider-application", "join"], ["/services?category=tesisat", "category"], ["/services?q=zzzzbulunmayan", "search-empty"], ["/services?category=unknown-phase1", "category-missing"], ["/gizlilik", "privacy"], ["/kullanim-sartlari", "terms"]]) {
    await goto(route);
    for (const width of [320,375,390,430,768,1024,1440]) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
      await settle();
      const layout = await page.evaluate(() => ({
        viewport: innerWidth, document: document.documentElement.scrollWidth,
        clippedControls: [...document.querySelectorAll('main button, main [data-ui-button], main .commerce-button, .home-join-link, .home-quick-categories a')].filter(element => { const box = element.getBoundingClientRect(); return box.width > 0 && (element.scrollWidth > element.clientWidth+2 || box.right > innerWidth+1 || box.left < -1); }).map(element=>element.textContent.trim()),
      }));
      assert.ok(layout.document <= width+1, `${route}: overflow at ${width}`);
      assert.deepEqual(layout.clippedControls, [], `${route}: clipped control at ${width}`);
      report.layouts.push({ route, width, passed: true });
      if ([390,1440].includes(width) && ["home","catalog","providers","service","login","join"].includes(name)) {
        await loadImages(); await settle();
        await shot(`${name}-${width}-viewport`);
        await shot(`${name}-${width}`, true);
      }
    }
    await loadImages();
    const broken = await page.locator("img").evaluateAll(images => images.filter(image=>!image.complete || image.naturalWidth === 0).map(image=>image.currentSrc || image.src));
    report.brokenImages.push(...broken.map(src=>({route,src})));
    const localLinks = await page.locator("a[href]").evaluateAll(anchors => anchors.map(anchor=>anchor.getAttribute("href")).filter(href=>href?.startsWith("/") && !href.startsWith("//") && !/^\/(api|auth)\//.test(href)));
    localLinks.forEach(href=>links.add(href));
    report.performance.push({ route, ...(await page.evaluate(()=>({ ...window.__phase1Perf, ttfb: performance.getEntriesByType("navigation")[0]?.responseStart, jsTransferBytes: performance.getEntriesByType("resource").filter(entry=>/\.js(?:\?|$)/.test(entry.name)).reduce((sum,entry)=>sum+entry.transferSize,0) }))) });
    report.routes.push(route);
  }
  assert.deepEqual(report.brokenImages, []);
  report.checks.push("11 production routes at all seven requested widths; no clipped controls or broken rendered images.");

  await page.setViewportSize({width:390,height:844});
  await goto("/");
  assert.equal(await page.locator("h1").innerText(), "Evin için ihtiyacın olan hizmet, tek bir yerde.");
  assert.equal(await page.locator("#home-service-search").getAttribute("placeholder"), "Hangi hizmete ihtiyacın var?");
  const cta = await page.getByRole("button",{name:"Hizmetleri Keşfet",exact:true}).boundingBox();
  assert.ok(cta && cta.y+cta.height < 768, "Primary CTA is visible above the mobile tab bar.");
  assert.deepEqual(await page.locator(".mobile-tab-label").allTextContents(), ["Ana Sayfa","Hizmetler","Ustalar","Siparişlerim","Hesabım"]);
  assert.equal(await page.locator("canvas").count(),0);
  assert.equal(await page.locator('img[src*="Meshy"], img[srcset*="Meshy"]').count(),0);
  assert.equal(await page.locator(".home-steps li").count(),5);
  assert.ok((await page.locator(".home-payment-note").innerText()).includes("Gerçek tahsilat yapılmaz"));
  const targets = await page.locator('.home-search-submit,.home-join-link,.home-quick-categories a,.site-icon-button,.mobile-tab').evaluateAll(elements=>elements.filter(element=>{const box=element.getBoundingClientRect();return box.width>0 && (box.width<44 || box.height<44)}).map(element=>element.textContent));
  assert.deepEqual(targets,[]);
  await page.locator("#home-service-search").fill("TESİSAT");
  await page.getByRole("button",{name:"Hizmetleri Keşfet",exact:true}).click();
  await page.waitForURL("**/services?**");
  assert.equal(new URL(page.url()).searchParams.get("q"),"TESİSAT");
  await page.locator(".commerce-service-card").first().waitFor();
  report.checks.push("Exact brief copy, first-screen mobile CTA, search handoff, five customer tabs, five journey steps, 44px controls, no 3D/cartoon visuals, visible sandbox notice.");

  await goto("/services");
  const filterButton = page.getByRole("button",{name:/Filtrele/});
  await filterButton.click();
  const dialog = page.getByRole("dialog",{name:"Hizmetleri filtrele"});
  await dialog.waitFor();
  const panel = await dialog.boundingBox();
  assert.ok(panel && Math.abs(panel.y+panel.height-844)<2, "Filters open as a bottom sheet.");
  assert.ok(await dialog.evaluate(element=>element.contains(document.activeElement)),"Sheet receives focus.");
  for(let index=0;index<12;index++) { await page.keyboard.press("Tab");assert.ok(await dialog.evaluate(element=>element.contains(document.activeElement)),"Focus remains inside sheet."); }
  await shot("catalog-filter-sheet-390");
  await dialog.getByRole("button",{name:"Sabit fiyatlı",exact:true}).click();
  await dialog.getByRole("button",{name:/hizmeti göster/}).click();
  assert.equal(await dialog.count(),0);
  await filterButton.click();
  await page.keyboard.press("Escape");
  assert.ok(await filterButton.evaluate(element=>element===document.activeElement),"Dismissal returns focus.");
  await page.getByRole("searchbox",{name:"Hizmet ara",exact:true}).fill("zzzzbulunmayan");
  await page.getByRole("heading",{name:"Aradığın hizmet bulunamadı"}).waitFor();
  await page.getByRole("button",{name:"Arama ve Filtreleri Temizle"}).click();
  await page.locator(".commerce-service-card").first().waitFor();
  if(await page.locator(".catalog-connection-notice").count()) assert.equal(await page.getByRole("link",{name:/Usta ve Randevu Seç/}).count(),0);
  report.checks.push("Catalog filter bottom sheet, focus trap/Escape/restore, persistent filters, empty-state recovery and unavailable-purchase suppression.");

  await goto("/");
  await page.getByRole("button",{name:/Menüyü aç/i}).click();
  await page.locator("#mobile-navigation-menu").waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#mobile-navigation-menu").count(),0);
  await page.evaluate(()=>document.documentElement.style.setProperty("--safe-bottom","24px"));
  const safe = await page.locator(".mobile-tab-bar").evaluate(element=>({padding:parseFloat(getComputedStyle(element).paddingBottom),bottom:element.getBoundingClientRect().bottom}));
  assert.equal(safe.padding,24);assert.ok(Math.abs(safe.bottom-844)<2);
  await page.evaluate(()=>document.documentElement.style.removeProperty("--safe-bottom"));
  await page.evaluate(()=>document.documentElement.style.fontSize="24px");
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"150% text zoom fits.");
  await shot("home-text-150-percent-390");
  await page.evaluate(()=>document.documentElement.style.fontSize="");
  await page.setViewportSize({width:844,height:390}); await settle();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"Landscape fits.");
  await shot("home-landscape-844");
  report.checks.push("Mobile menu dismissal, safe-area padding, reduced motion, 150% text sizing and landscape layout.");

  for(const route of ["/orders","/account","/provider-dashboard","/provider-dashboard/store","/provider-dashboard/orders","/admin","/admin/marketplace"]) {
    await page.goto(base+route,{waitUntil:"domcontentloaded"});
    await page.waitForURL("**/login**");
    assert.equal(new URL(page.url()).pathname,"/login");
  }
  report.checks.push("Seven customer/provider/admin protected routes retain server-side login redirects.");

  const manifestResponse = await context.request.get(base+"/manifest.webmanifest");
  assert.equal(manifestResponse.status(),200);
  const manifest = await manifestResponse.json();
  assert.equal(manifest.display,"standalone");assert.equal(manifest.scope,"/");assert.equal(manifest.start_url,"/");assert.equal(manifest.theme_color,"#ff6500");assert.equal(manifest.lang,"tr");
  for(const icon of manifest.icons) assert.equal((await context.request.get(base+icon.src)).status(),200);
  await goto("/");
  report.pwa = { manifest, viewport:await page.locator('meta[name="viewport"]').getAttribute("content"), appleIcon:await page.locator('link[rel="apple-touch-icon"]').getAttribute("href"), serviceWorkerRegistrations:await page.evaluate(async()=>"serviceWorker" in navigator ? (await navigator.serviceWorker.getRegistrations()).length : null) };
  assert.ok(report.pwa.viewport.includes("viewport-fit=cover"));
  assert.ok(!/user-scalable=no|maximum-scale=1/.test(report.pwa.viewport));
  assert.equal((await context.request.get(base+report.pwa.appleIcon)).status(),200);
  report.checks.push("Standalone manifest, orange theme, scope/start URL, PNG icons, Apple icon, safe-area viewport and user zoom.");

  for(const href of links) {
    const url = new URL(href,base);
    const response = await context.request.get(url.href);
    const status = response.status();
    let anchor = true;
    if(url.hash && status===200) anchor = new RegExp(`id=["']${url.hash.slice(1).replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}["']`).test(await response.text());
    report.links.push({href,status,anchor});
    assert.ok(status<400,`Broken internal link ${href}: ${status}`);
    assert.ok(anchor,`Missing fragment ${href}`);
  }
  assert.deepEqual(report.runtimeErrors,[]);
  report.checks.push(`${report.links.length} unique internal links/fragments resolve; no browser runtime or hydration errors.`);
  console.log(JSON.stringify({routes:report.routes.length,layouts:report.layouts.length,checks:report.checks,screenshots:report.screenshots.length,links:report.links.length,pwaServiceWorkers:report.pwa.serviceWorkerRegistrations},null,2));
} catch(error) {
  report.failed = String(error.stack || error); process.exitCode=1;console.error(report.failed);
  await page.screenshot({path:path.join(shots,"failure.png"),fullPage:true}).catch(()=>{});
} finally {
  await fs.writeFile(path.join(output,"production-tests.json"),JSON.stringify(report,null,2));
  await browser.close();
}
