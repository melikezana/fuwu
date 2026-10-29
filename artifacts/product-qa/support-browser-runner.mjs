import fs from "node:fs/promises";
import path from "node:path";
import { createServer } from "vite";
import { chromium } from "playwright";
import { expect } from "@playwright/test";
const root = path.resolve("e2e/fixtures/commerce-ui");
const server = await createServer({ configFile:false, root, cacheDir:path.resolve("artifacts/product-qa/support-vite-cache"), publicDir:path.resolve("public"), resolve:{alias:{"@/app/admin/marketplace/health-actions":path.join(root,"health-action.ts"),"@/app/providers/[id]/actions":path.join(root,"review-action.ts"),"@":path.resolve("src"),"next/link":path.join(root,"next-link.tsx"),"next/image":path.join(root,"next-image.tsx"),"next/navigation":path.join(root,"next-navigation.ts")}},esbuild:{jsx:"automatic"},server:{host:"127.0.0.1",port:3067,strictPort:true,fs:{allow:[process.cwd()]}} });
await server.listen();
const browser = await chromium.launch({channel:"msedge"});
const page = await browser.newPage({viewport:{width:390,height:844},reducedMotion:"reduce"});
page.setDefaultNavigationTimeout(120000);
const report = {scope:"Actual OrderView with fictional order, mock HTTP, and mock router refresh; not real role E2E.",checks:[],errors:[]};
page.on("pageerror",e=>report.errors.push(e.message));
let mode="error";const sent=[];
await page.route("**/api/commerce/orders/*",route=>{sent.push(route.request().postDataJSON());return route.fulfill(mode==="error"?{status:503,json:{error:"store_unavailable"}}:{json:{ok:true}});});
const open=async()=>{await page.goto("http://127.0.0.1:3067/?screen=customer",{waitUntil:"domcontentloaded"});await page.locator("h1").waitFor({timeout:60000});};
try {
  await open();
  await page.evaluate(()=>{window.__refreshCount=0;window.addEventListener("commerce-test-refresh",()=>window.__refreshCount++);});
  const support=page.getByRole("button",{name:"Sipariş İçin Destek İste",exact:true});
  await support.click();await expect(page.getByRole("alert")).toBeVisible();await expect(support).toBeEnabled();
  if(sent[0].status!=="DISPUTED")throw new Error("Wrong support transition");
  mode="ok";await support.click();await expect.poll(()=>page.evaluate(()=>window.__refreshCount)).toBe(1);
  report.checks.push("Order support failure preserves the order and re-enables retry; successful mock retry sends DISPUTED and refreshes once.");
  await open();await page.getByRole("button",{name:"Siparişi İptal Et",exact:true}).click();
  await expect.poll(()=>sent.at(-1)?.status).toBe("CANCELLED");
  report.checks.push("Customer cancellation sends CANCELLED through the existing endpoint (mock).");
  if(report.errors.length)throw new Error(report.errors.join("\n"));
} catch(error){report.failure=String(error.stack);process.exitCode=1;}
finally{await fs.writeFile("artifacts/product-qa/support-browser.json",JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();await server.close();}
