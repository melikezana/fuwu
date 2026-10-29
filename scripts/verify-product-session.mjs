import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { chromium } from "playwright";
import { expect } from "@playwright/test";
const root = path.resolve("e2e/fixtures/commerce-ui");
const server = await createServer({ configFile: false, root, publicDir: path.resolve("public"), resolve: { alias: { "@/lib/supabase/client": path.join(root,"session-client.ts"), "@/app/admin/marketplace/health-actions": path.join(root,"health-action.ts"), "@/app/providers/[id]/actions": path.join(root,"review-action.ts"), "@": path.resolve("src"), "next/link": path.join(root,"next-link.tsx"), "next/image": path.join(root,"next-image.tsx"), "next/navigation": path.join(root,"next-navigation.ts") } }, esbuild: { jsx: "automatic" }, server: { host: "127.0.0.1", port: 3058, strictPort: true, fs: { allow: [process.cwd()] } } });
await server.listen();
const browser = await chromium.launch({channel:"msedge"});
const page = await browser.newPage({viewport:{width:390,height:844},reducedMotion:"reduce"});
const report = { scope:"Actual session provider and navigation components, explicitly mocked HTTP and Auth event emitter; not Google/real-role E2E.",checks:[],errors:[] };
page.on("pageerror",e=>report.errors.push(e.message));
let requests=0, role="provider";
await page.route("**/api/auth/user", route => {requests++; return route.fulfill({json:{authenticated:true,profile:{id:"fixture-user",role,full_name:"TEST Usta"}}});});
try {
  await page.goto("http://127.0.0.1:3058/?screen=auth-shell");
  await expect(page.getByTestId("header-profile")).toHaveText("provider");
  await expect(page.getByTestId("second-profile")).toHaveText("provider");
  await expect(page.getByRole("link",{name:"Takvim",exact:true})).toBeVisible();
  assert.equal(requests,1,"one shared profile request, including StrictMode");
  await page.waitForFunction(()=>typeof window.__QA_AUTH_EVENT==="function");
  await page.evaluate(()=>window.__QA_AUTH_EVENT("SIGNED_OUT"));
  await expect(page.getByTestId("header-profile")).toHaveText("guest");
  await expect(page.getByRole("link",{name:"Hizmetler",exact:true})).toBeVisible();
  role="customer";
  await page.evaluate(()=>window.dispatchEvent(new StorageEvent("storage",{key:"sb-fixture-auth-token"})));
  await expect(page.getByTestId("header-profile")).toHaveText("customer");
  report.checks.push("Two consumers plus navigation share one verified profile; logout and cross-tab token updates change role navigation.");
  await page.goto("http://127.0.0.1:3058/?screen=auth-shell&sdk-failure=true");
  await expect(page.getByTestId("header-profile")).toHaveText("customer");
  report.checks.push("A failed optional SDK chunk retains the profile verified by the server API.");
  assert.deepEqual(report.errors,[]);
} catch(error){report.failure=String(error.stack);process.exitCode=1;}
finally{await fs.writeFile("artifacts/product-qa/session-browser.json",JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();await server.close();}
