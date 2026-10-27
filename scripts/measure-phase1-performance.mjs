import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const base = process.env.PHASE1_BASE_URL || "http://127.0.0.1:3028";
const output = path.resolve(process.env.PHASE1_OUTPUT_DIR || "artifacts/phase1");
const browser = await chromium.launch({ channel: process.env.PHASE1_BROWSER || "msedge" });
const measurements = [];
try {
  for (const width of [390,1440]) for (const route of ["/","/services"]) {
    const context = await browser.newContext({viewport:{width,height:width===390?844:1000},reducedMotion:"reduce"});
    await context.addInitScript(()=>{
      window.__metrics={lcp:0,cls:0,element:""};
      new PerformanceObserver(list=>{for(const entry of list.getEntries()){window.__metrics.lcp=entry.startTime;window.__metrics.element=entry.element?.tagName??"";}}).observe({type:"largest-contentful-paint",buffered:true});
      new PerformanceObserver(list=>{for(const entry of list.getEntries())if(!entry.hadRecentInput)window.__metrics.cls+=entry.value;}).observe({type:"layout-shift",buffered:true});
      localStorage.setItem("fuwu:cookie-consent","rejected");
    });
    const page=await context.newPage();
    await page.goto(base+route,{waitUntil:"domcontentloaded",timeout:90000});
    await page.locator("h1").waitFor();await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(3000);
    measurements.push({route,width,...await page.evaluate(()=>({
      ...window.__metrics,
      ttfb:performance.getEntriesByType("navigation")[0].responseStart,
      jsTransferBytes:performance.getEntriesByType("resource").filter(entry=>/\.js(?:\?|$)/.test(entry.name)).reduce((sum,entry)=>sum+entry.transferSize,0),
      imageTransferBytes:performance.getEntriesByType("resource").filter(entry=>entry.initiatorType==="img").reduce((sum,entry)=>sum+entry.transferSize,0),
    }))});
    await context.close();
  }
  await fs.mkdir(output,{recursive:true});
  await fs.writeFile(path.join(output,"performance.json"),JSON.stringify({method:"Local production, fresh browser context per route, fixed viewport, no resize/scroll, no CPU/network throttling; lab samples, not field Core Web Vitals.",measurements},null,2));
  console.log(JSON.stringify(measurements,null,2));
} finally {await browser.close();}
