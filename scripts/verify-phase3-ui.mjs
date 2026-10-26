import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createServer } from "vite";
import { chromium, webkit } from "playwright";
import { expect } from "@playwright/test";
const root=path.resolve("e2e/fixtures/commerce-ui"), out=path.resolve("artifacts/phase3");await fs.mkdir(out,{recursive:true});
const server=await createServer({configFile:false,root,cacheDir:path.join(out,"vite-cache"),publicDir:path.resolve("public"),resolve:{alias:{"@/app/admin/marketplace/health-actions":path.join(root,"health-action.ts"),"@/app/providers/[id]/actions":path.join(root,"review-action.ts"),"@":path.resolve("src"),"next/link":path.join(root,"next-link.tsx"),"next/image":path.join(root,"next-image.tsx"),"next/navigation":path.join(root,"next-navigation.ts")}},esbuild:{jsx:"automatic"},server:{host:"127.0.0.1",port:3071,strictPort:true,fs:{allow:[process.cwd()]}}});await server.listen();
const report={scope:"Actual React components with explicitly fictional data and mocked API; no real account or payment",checks:[],screenshots:[],errors:[],failed:null};
let browser;
try {
  for(const [engine,driver] of [["chromium",chromium],["webkit",webkit]]) {
    browser=await driver.launch(engine === "webkit" ? { executablePath: path.join(out,"browser-runtime/webkit-2287/Playwright.exe") } : {});const page=await browser.newPage({viewport:{width:375,height:812},reducedMotion:"reduce"});page.on("pageerror",e=>report.errors.push(e.message));
    for(const screen of ["phase3-customer","phase3-calendar","phase3-health","phase3-store","admin","phase3-orders-error","phase3-orders-empty"]) {
      await page.goto(`http://127.0.0.1:3071/?screen=${screen}`,{waitUntil:"domcontentloaded",timeout:120000});await page.locator("h1").waitFor();await page.evaluate(()=>document.fonts.ready);
      for(const width of [320,375,390,768,1440]) {
        await page.setViewportSize({width,height:width<768?844:1000});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${engine} ${screen} fits ${width}`);
        if(engine==="chromium"&&[375,1440].includes(width)) {const file=`${screen}-${width}.png`;await page.screenshot({path:path.join(out,file),fullPage:true});report.screenshots.push(file);}
      }
      report.checks.push(`${engine} ${screen}: five responsive widths`);
      if(screen==="phase3-customer") {await expect(page.getByText("Geciken hizmet · Hizmet takibi sürüyor.",{exact:true})).toBeVisible();await expect(page.getByRole("link",{name:"Değerlendir",exact:true})).toHaveCount(1);const href=await page.getByRole("link",{name:"Yeniden Satın Al",exact:true}).getAttribute("href");assert.ok(!/price|startsAt|endsAt/.test(href));await expect(page.getByText("Ödeme doğrulandı · Sandbox")).toHaveCount(2);}
      if(screen==="phase3-calendar") {await expect(page.getByRole("navigation",{name:"Haftalık randevu günleri"}).getByRole("link")).toHaveCount(7);await expect(page.getByText("1 geciken iş",{exact:false})).toBeVisible();}
      if(screen==="phase3-health") {await expect(page.getByText("Son kontrol başarısız",{exact:true})).toBeVisible();await expect(page.getByText("Kontrol edilmedi",{exact:true})).toHaveCount(4);}
    }
    let packageBody,storeBody;
    await page.route("**/api/commerce/store/variants",async route=>{packageBody=route.request().postDataJSON();await route.fulfill({status:201,json:{id:"70000000-0000-4000-8000-000000000001"}});});
    await page.route("**/api/commerce/store",async route=>{storeBody=route.request().postDataJSON();await route.fulfill({json:{ok:true}});});
    await page.goto("http://127.0.0.1:3071/?screen=phase3-store");await page.getByLabel("Paket adı",{exact:true}).fill("TEST 3 klima");await page.getByRole("button",{name:"Paket Ekle",exact:true}).click();await expect.poll(()=>packageBody?.name).toBe("TEST 3 klima");
    const row=page.locator(".commerce-store-offering").filter({hasText:"TEST 3 klima"});await row.getByLabel("Fiyat (TL)").fill("2400");await row.getByLabel("Satışa açık").check();await page.getByLabel("Kadıköy",{exact:true}).check();await page.getByLabel("Pazartesi",{exact:true}).check();await page.getByLabel("İzin tarihi",{exact:true}).fill("2026-12-24");await page.getByRole("button",{name:"Gün Ekle",exact:false}).click();await page.getByRole("button",{name:"Mağazamı Kaydet",exact:true}).click();await expect.poll(()=>storeBody?.offerings?.[0]?.price_minor).toBe(240000);assert.equal(storeBody.offerings[0].variant_id,"70000000-0000-4000-8000-000000000001");assert.ok(storeBody.daysOff.includes("2026-12-24"));assert.equal(storeBody.hours.length,1);
    report.checks.push(`${engine}: custom package, price, working hours and day off saved through mocked API`);
    await page.goto("http://127.0.0.1:3071/?screen=phase3-dialog");await page.getByRole("button",{name:"Pencereyi Aç"}).focus();await page.keyboard.press("Enter");const dialog=page.getByRole("dialog");await expect(dialog).toBeVisible();await expect(page.getByRole("button",{name:"Kapat",exact:true})).toBeFocused();await page.keyboard.press("Shift+Tab");await expect(page.getByRole("button",{name:"İşlemi Bitir"})).toBeFocused();await page.keyboard.press("Tab");await expect(page.getByRole("button",{name:"Kapat",exact:true})).toBeFocused();await page.keyboard.press("Escape");await expect(dialog).toBeHidden();await expect(page.getByRole("button",{name:"Pencereyi Aç"})).toBeFocused();
    report.checks.push(`${engine}: modal focus trap, Escape and focus restoration`);
    await page.setViewportSize({width:375,height:812});await page.goto("http://127.0.0.1:3071/?screen=phase3-customer");await page.evaluate(()=>{document.documentElement.style.fontSize="24px";});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.evaluate(()=>{document.documentElement.style.fontSize="";});await page.setViewportSize({width:844,height:390});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));report.checks.push(`${engine}: large text and landscape`);
    await browser.close();browser=null;
  }
  assert.deepEqual(report.errors,[]);
}catch(e){report.failed=String(e.stack||e);console.error(report.failed);process.exitCode=1;}
finally {await browser?.close();await server.close();await fs.writeFile(path.join(out,"operations-browser-tests.json"),JSON.stringify(report,null,2));}
console.log(JSON.stringify(report,null,2));
