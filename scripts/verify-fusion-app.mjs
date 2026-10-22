import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { expect } from "@playwright/test";

// Read-only local Next.js verification. No accounts, remote writes, OAuth consent or payments.
const base = process.env.FUSION_BASE_URL || "http://127.0.0.1:3046";
assert.ok(["127.0.0.1","localhost"].includes(new URL(base).hostname));
const out = path.resolve(process.env.FUSION_OUTPUT_DIR || "artifacts/fusion"); await fs.mkdir(out,{recursive:true});
const report={scope:"Read-only actual Next.js pages, guest session",widths:[320,375,390,430,768,1024,1440],checks:[],screenshots:[],errors:[],failed:null};
const browser=await chromium.launch();
const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:"reduce"});
await context.addInitScript(()=>{localStorage.setItem("fuwu:cookie-consent","rejected");sessionStorage.setItem("fuwu_splash_shown","true");});
const page=await context.newPage();page.on("pageerror",error=>report.errors.push(error.message));
try {
  const routes = [["home","/"],["catalog","/services"],["service","/services/musluk-montaji"],["providers","/providers"],["login","/login"]];
  for(const [name,route] of routes) {
    const navigation = await page.goto(base+route,{waitUntil:"domcontentloaded",timeout:120000});
    if(name === "home") { const csp = navigation.headers()["content-security-policy"] || ""; assert.ok(!csp.includes("upgrade-insecure-requests"),"Active proxy permits loopback HTTP assets");assert.match(csp, /'nonce-[^']+'/);report.checks.push({name:"Active Next.js proxy loopback CSP",expected:"Nonce CSP without local HTTPS asset upgrade",actual:"PASS"}); }
    await page.locator("main h1").first().waitFor();await page.evaluate(()=>document.fonts.ready);
    for(const width of report.widths) {
      await page.setViewportSize({width,height:width<768?844:1000});
      await page.evaluate(()=>scrollTo(0,0));
      const sizes=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(sizes.scroll<=sizes.width+1,`${name} fits ${width}`);
      const oversized=await page.locator("input:not([type=hidden]),textarea,select,button.commerce-button,a.commerce-button").evaluateAll(elements=>elements.filter(element=>{const r=element.getBoundingClientRect();return r.width>0&&(r.left< -1||r.right>innerWidth+1);}).map(element=>element.getAttribute("aria-label")||element.textContent?.trim()||element.tagName));
      assert.deepEqual(oversized,[],`${name} controls fit ${width}`);
      if([390,1440].includes(width)) {
        await page.locator("img").evaluateAll(images=>Promise.all(images.filter(image=>{const r=image.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0;}).map(image=>image.decode().catch(()=>{}))));
        const screenshot=`actual-${name}-${width}.png`;await page.screenshot({path:path.join(out,screenshot),fullPage:true});report.screenshots.push(screenshot);
        await page.screenshot({path:path.join(out,`actual-${name}-${width}-viewport.png`)});
      }
    }
    if(name === "providers") { const href = await page.locator('a[href^="/providers/"]').first().getAttribute("href").catch(()=>null); if(href) routes.push(["profile",href]); else report.checks.push({name:"Public provider profile",actual:"SKIPPED: no public provider link available"}); }
    if(name === "profile") assert.equal(await page.locator("#reviews form").count(),0,"Guest has no review form");
    report.checks.push({name:`${name} at all seven widths`,expected:"No document or form overflow",actual:"PASS"});
  }
  await page.goto(base+"/",{waitUntil:"domcontentloaded"});
  await expect(page.getByRole("heading",{level:1})).toContainText("tam zamanında");
  await expect(page.getByRole("link",{name:"Hizmetleri Keşfet",exact:true})).toBeVisible();await expect(page.getByRole("link",{name:"Ustaları İncele",exact:true})).toBeVisible();
  await page.getByLabel("Hangi hizmete ihtiyacın var?",{exact:true}).fill("musluk");await page.getByRole("button",{name:"Hizmet Bul",exact:true}).click();await page.waitForURL("**/services?**");assert.equal(new URL(page.url()).searchParams.get("q"),"musluk");
  report.checks.push({name:"Homepage service search",expected:"Catalogue receives the query",actual:"PASS"});
  for(const route of ["/orders","/account?view=addresses","/dashboard","/provider-dashboard/store","/provider-dashboard/orders","/admin/marketplace?view=payments"]) {
    await page.goto(base+route,{waitUntil:"domcontentloaded"});await page.waitForURL("**/login?**");assert.equal(new URL(page.url()).searchParams.get("next"),route);
  }
  report.checks.push({name:"Protected customer, provider and admin routes",expected:"Guests return to login with full next path",actual:"PASS"});
  for(const endpoint of ["orders","checkout","store"])assert.equal((await page.request.post(base+"/api/commerce/"+endpoint,{data:{}})).status(),401);
  assert.equal((await page.request.get(base+"/api/cron/commerce-expiry")).status(),401);
  report.checks.push({name:"Guest commerce mutations and unauthenticated cron",expected:"401",actual:"PASS"});
  await page.goto(base+"/auth/callback?error=access_denied&next="+encodeURIComponent("/services/musluk-montaji?provider=chosen"),{waitUntil:"domcontentloaded"});
  assert.equal(new URL(page.url()).pathname,"/login");assert.equal(new URL(page.url()).searchParams.get("next"),"/services/musluk-montaji?provider=chosen");await expect(page.getByText("Google ile giriş tamamlanmadı. Tekrar deneyebilirsiniz.",{exact:true})).toBeVisible();
  await page.goto(base+"/auth/callback?error=access_denied&next=%2F%09%2Fevil.test",{waitUntil:"domcontentloaded"});assert.equal(new URL(page.url()).origin,base);assert.equal(new URL(page.url()).searchParams.get("next"),"/account");
  report.checks.push({name:"Actual OAuth denial and malicious redirect",expected:"Actionable login error and safe internal next",actual:"PASS"});
  const manifestResponse=await page.request.get(base+"/manifest.webmanifest");assert.equal(manifestResponse.status(),200);const manifest=await manifestResponse.json();assert.equal(manifest.display,"standalone");assert.ok(manifest.icons.length>0);report.checks.push({name:"Existing PWA manifest",expected:"Standalone display with icons",actual:"PASS"});
  assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report,null,2));
}catch(error){report.failed=String(error?.stack||error);await page.screenshot({path:path.join(out,"app-failure.png"),fullPage:true});console.error(report.failed);process.exitCode=1;}
finally{await fs.writeFile(path.join(out,"app-browser-tests.json"),JSON.stringify(report,null,2));await browser.close();}
