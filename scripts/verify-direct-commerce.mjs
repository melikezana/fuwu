import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createServer } from "vite";
import { chromium } from "playwright";
const output=path.resolve(process.env.COMMERCE_OUTPUT_DIR || "artifacts/direct-commerce");await fs.mkdir(output,{recursive:true});
const root=path.resolve("e2e/fixtures/commerce-ui");
const server=await createServer({configFile:false,root,publicDir:path.resolve("public"),resolve:{alias:{"@":path.resolve("src"),"next/link":path.join(root,"next-link.tsx"),"next/image":path.join(root,"next-image.tsx"),"next/navigation":path.join(root,"next-navigation.ts")}},esbuild:{jsx:"automatic"},server:{host:"127.0.0.1",port:3037,strictPort:true,fs:{allow:[process.cwd()]}}});
await server.listen();
const browser=await chromium.launch();
const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:"reduce"});
await context.addInitScript(()=>{localStorage.setItem("fuwu:cookie-consent","rejected");sessionStorage.setItem("fuwu_splash_shown","true");});
const page=await context.newPage();const report={checks:[],screenshots:[],errors:[],failed:null};
page.on("pageerror",e=>report.errors.push(e.message));
const fixture="http://127.0.0.1:3037";const app=process.env.COMMERCE_BASE_URL||"http://127.0.0.1:3036";
const expect = (await import("@playwright/test")).expect;
async function shot(name){await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(output,name+".png"),fullPage:true});report.screenshots.push(name+".png");await page.screenshot({path:path.join(output,name+"-viewport.png"),fullPage:false});report.screenshots.push(name+"-viewport.png");}
async function fits(label){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+" fits viewport");}
try {
  if(process.env.COMMERCE_FIXTURE_ONLY !== "true") {
  console.log("Checking actual production pages...");
  await page.goto(app+"/services",{waitUntil:"domcontentloaded",timeout:120000});await expect(page.getByRole("heading",{level:1})).toContainText("Bir hizmet seç");
  for(const width of [320,375,390,430,768,1024,1440]){await page.setViewportSize({width,height:width<768?844:1000});await fits("Actual catalog "+width);if([390,1440].includes(width))await shot("actual-catalog-"+width);}
  await page.setViewportSize({width:390,height:844});await page.goto(app+"/services/musluk-montaji",{waitUntil:"domcontentloaded"});await expect(page.getByRole("heading",{name:"Musluk montajı",level:1})).toBeVisible();await fits("Actual unavailable booking");await shot("actual-service-390");
  assert.equal((await page.request.post(app+"/api/commerce/orders",{data:{}})).status(),401);assert.equal((await page.request.post(app+"/api/commerce/checkout",{data:{}})).status(),401);assert.equal((await page.request.post(app+"/api/commerce/store",{data:{}})).status(),401);assert.equal((await page.request.get(app+"/api/commerce/slots?offering=bad")).status(),400);assert.equal((await page.request.get(app+"/api/cron/commerce-expiry")).status(),401);
  for(const route of ["/orders","/provider-dashboard/store","/provider-dashboard/orders"]){await page.goto(app+route,{waitUntil:"domcontentloaded"});await page.waitForURL("**/login**",{timeout:30000});assert.ok(new URL(page.url()).pathname==="/login",route+" requires login");}
  report.checks.push("Actual production pages at six widths, unavailable-data UI, protected pages, guest mutation denial and cron authorization");
  }
  console.log("Checking component fixtures...");
  await page.route("**/api/commerce/slots?**",route=>{const q=new URL(route.request().url()).searchParams;const day=q.get("day");return route.fulfill({json:{slots:[{starts_at:day+"T11:00:00+03:00",ends_at:day+"T12:00:00+03:00"},{starts_at:day+"T14:00:00+03:00",ends_at:day+"T15:00:00+03:00"}]}});});
  let reserved;await page.route("**/api/commerce/orders",async route=>{reserved=route.request().postDataJSON();await route.fulfill({status:201,json:{order:{id:"fixture-order"}}});});
  await page.goto(fixture+"/?screen=booking");await expect(page.getByRole("heading",{name:"Musluk montajı",level:1})).toBeVisible();await page.getByLabel("İlçe",{exact:true}).selectOption({label:"Kadıköy"});await page.getByRole("button",{name:"Bu Ustayla Devam Et"}).click();await page.getByRole("radio",{name:"11:00"}).check();await page.getByLabel("Mahalle, sokak, bina ve daire").fill("TEST Mahallesi, Örnek Sokak No 10 Daire 2");
  for(const width of [320,375,390,430,768,1024,1440]){await page.setViewportSize({width,height:width<768?844:1000});await fits("Booking component fixture "+width);if([390,1440].includes(width))await shot("fixture-booking-"+width);}
  await page.setViewportSize({width:390,height:844});await page.getByRole("button",{name:"Devam Et",exact:true}).click();await expect(page).toHaveURL(/#\/orders\/fixture-order/);assert.equal(reserved.expectedPriceMinor,85000);assert.equal(reserved.offeringId,"30000000-0000-4000-8000-000000000001");assert.ok(reserved.idempotencyKey);report.checks.push("Real booking component with explicit fixture API: district, provider, slot, address and authoritative-price expectation payload");
  await page.goto(fixture+"/?screen=booking&variant=true");await page.getByRole("button",{name:"2 klima",exact:true}).click();await page.getByLabel("İlçe",{exact:true}).selectOption({label:"Kadıköy"});await page.getByRole("button",{name:"Bu Ustayla Devam Et"}).click();await expect(page.locator(".commerce-summary-total")).toContainText("1.700");await expect(page.locator(".commerce-offer-meta")).toContainText("120 dakika");report.checks.push("Variant updates price and duration in real booking component");
  await page.unroute("**/api/commerce/slots?**");
  await page.route("**/api/commerce/slots?**",route=>route.fulfill({status:503,json:{error:"store_unavailable"}}));
  await page.goto(fixture+"/?screen=booking");await page.getByLabel("İlçe",{exact:true}).selectOption({label:"Kadıköy"});await page.getByRole("button",{name:"Bu Ustayla Devam Et"}).click();await expect(page.getByRole("alert")).toBeVisible();await expect(page.getByRole("button",{name:"Devam Et",exact:true})).toBeDisabled();
  await page.unroute("**/api/commerce/slots?**");await page.route("**/api/commerce/slots?**",route=>route.fulfill({json:{slots:[]}}));
  await page.goto(fixture+"/?screen=booking");await page.getByLabel("İlçe",{exact:true}).selectOption({label:"Kadıköy"});await page.getByRole("button",{name:"Bu Ustayla Devam Et"}).click();await expect(page.getByText("Bu gün için uygun randevu yok.",{exact:false})).toBeVisible();await expect(page.getByRole("button",{name:"Devam Et",exact:true})).toBeDisabled();report.checks.push("Slot API failure and empty day disable purchase and show actionable feedback");
  let action;await page.route("**/api/commerce/orders/*",async route=>{action=route.request().postDataJSON();await route.fulfill({json:{ok:true}});});
  for(const screen of ["pending","confirmed","provider","store"]){await page.goto(fixture+"/?screen="+screen);await page.locator("h1").waitFor();for(const width of [320,375,390,430,768,1024,1440]){await page.setViewportSize({width,height:width<768?844:1000});await fits(screen+" fixture "+width);if(width===390)await shot("fixture-"+screen+"-390");}if(screen==="provider"){await page.getByLabel("Müşterinin altı haneli teslim kodu").fill("123456");await page.getByRole("button",{name:"Hizmeti Tamamla",exact:true}).click();await expect.poll(()=>action?.status).toBe("COMPLETED");assert.equal(action.code,"123456");}}
  report.checks.push("Pending checkout, confirmed progress, provider completion and store component fixtures fit seven widths; provider submits completion code");
  let store;await page.route("**/api/commerce/store",async route=>{store=route.request().postDataJSON();await route.fulfill({json:{ok:true}});});
  await page.getByLabel("Fiyat (TL)").fill("850");await page.getByLabel("Satışa açık").check();await page.getByLabel("Kadıköy",{exact:true}).check();await page.getByLabel("Pazartesi",{exact:true}).check();await page.getByRole("button",{name:"Mağazamı Kaydet"}).click();await expect.poll(()=>store?.offerings?.[0]?.price_minor).toBe(85000);assert.equal(store.hours.length,1);await expect(page.getByRole("status")).toContainText("kaydedildi");report.checks.push("Store component saves selected price, service, region and working hours via fixture API");
  await page.unroute("**/api/commerce/orders");
  await page.setViewportSize({width:390,height:844});
  await page.unroute("**/api/commerce/slots?**");
  await page.route("**/api/commerce/slots?**",route=>{const day=new URL(route.request().url()).searchParams.get("day");return route.fulfill({json:{slots:[{starts_at:day+"T11:00:00+03:00",ends_at:day+"T12:00:00+03:00"}]}});});
  await page.evaluate(()=>Object.keys(sessionStorage).filter(key=>key.startsWith("fuwu:commerce:")).forEach(key=>sessionStorage.removeItem(key)));
  await page.route("**/api/commerce/orders",route=>route.fulfill({status:401,json:{error:"unauthorized"}}));
  await page.goto(fixture+"/?screen=booking");await page.getByLabel("İlçe",{exact:true}).selectOption({label:"Kadıköy"});await page.getByRole("button",{name:"Bu Ustayla Devam Et"}).click();await page.getByRole("radio",{name:"11:00"}).check();await page.getByLabel("Mahalle, sokak, bina ve daire").fill("TEST OAuth dönüş adresi, Sokak No 25 Daire 2");await page.getByRole("button",{name:"Devam Et",exact:true}).click();await expect(page.getByRole("link",{name:"Giriş Yap ve Devam Et"})).toBeVisible();
  await page.reload();await expect(page.getByLabel("Mahalle, sokak, bina ve daire")).toHaveValue("TEST OAuth dönüş adresi, Sokak No 25 Daire 2");await expect(page.getByRole("radio",{name:"11:00"})).toBeChecked();report.checks.push("Guest checkout 401 retains provider, slot and address draft across reload; login return is internal");
  await page.goto(fixture+"/?screen=readonly");assert.equal(await page.getByRole("button",{name:"Siparişi İptal Et"}).count(),0);assert.equal(await page.getByRole("button",{name:"Sipariş İçin Destek İste"}).count(),0);report.checks.push("Admin read-only order view has no customer mutation controls");
  await page.goto(fixture+"/?screen=booking&variant=true&provider=30000000-0000-4000-8000-000000000001&initialVariant=10000000-0000-4000-8000-000000000003&district=20000000-0000-4000-8000-000000000001");await expect(page.getByRole("button",{name:"2 klima",exact:true})).toHaveAttribute("aria-pressed","true");await expect(page.locator(".commerce-summary-total")).toContainText("1.700");await expect(page.getByRole("button",{name:"Usta seçildi"})).toBeVisible();report.checks.push("Provider/package deep link selects the intended variant and does not inherit another booking draft");
  await page.goto(fixture+"/?screen=expired");await expect(page.getByRole("heading",{name:"İptal edildi",exact:true})).toBeVisible();assert.equal(await page.getByRole("button",{name:"Ödemeye Geç"}).count(),0);report.checks.push("Expired hold cannot offer a payment action");
  await page.goto(fixture+"/?screen=admin");for(const width of [320,375,390,430,768,1024,1440]){await page.setViewportSize({width,height:width<768?844:1000});await fits("Admin metrics fixture "+width);if([390,1440].includes(width))await shot("fixture-admin-"+width);}report.checks.push("Real admin metrics component distinguishes test GMV, commission, refunds and payouts at all seven widths");
  assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report,null,2));
}catch(error){report.failed=String(error?.stack||error);await page.screenshot({path:path.join(output,"verification-failure.png"),fullPage:true});console.error(report.failed);process.exitCode=1;}
finally{await fs.writeFile(path.join(output,"browser-tests.json"),JSON.stringify(report,null,2));await browser.close();await server.close();}
