import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.PREMIUM_BASE_URL||'http://127.0.0.1:3033';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const {default:lighthouse}=await import(pathToFileURL(path.resolve('artifacts/premium-mobile/lighthouse-runtime/node_modules/lighthouse/core/index.js')).href);
const out=path.resolve('artifacts/premium-mobile/performance');await fs.mkdir(out,{recursive:true});
const buildId=(await fs.readFile('.next/BUILD_ID','utf8')).trim();
const measuredAt=new Date().toISOString();
const browser=await chromium.launch({channel:'msedge',args:['--remote-debugging-port=9236']});
const measurements=[];
let failure=null;
try {
  for(const [route,desktop] of [['/',false],['/services',false],['/',true]]) {
    const name=(route==='/'?'home':'services')+(desktop?'-desktop':'-mobile');
    const result=await lighthouse(base+route,{port:9236,output:['json','html'],logLevel:'error',onlyCategories:['performance','accessibility','best-practices'],...(desktop?{formFactor:'desktop',screenEmulation:{mobile:false,width:1440,height:900,deviceScaleFactor:1,disabled:false},throttling:{rttMs:40,throughputKbps:10240,cpuSlowdownMultiplier:1,requestLatencyMs:0,downloadThroughputKbps:0,uploadThroughputKbps:0}}:{})});
    await fs.writeFile(path.join(out,name+'.json'),result.report[0]);await fs.writeFile(path.join(out,name+'.html'),result.report[1]);
    const audits=result.lhr.audits;
    measurements.push({route,mode:desktop?'desktop':'mobile',performance:result.lhr.categories.performance.score,accessibility:result.lhr.categories.accessibility.score,lcp_ms:audits['largest-contentful-paint'].numericValue,cls:audits['cumulative-layout-shift'].numericValue,tbt_ms:audits['total-blocking-time'].numericValue,fcp_ms:audits['first-contentful-paint'].numericValue,errors:result.lhr.runtimeError||null,warnings:result.lhr.runWarnings});
    console.log(JSON.stringify(measurements.at(-1)));
  }
}catch(e){failure=String(e.stack||e);process.exitCode=1;console.error(failure);}
finally{await fs.writeFile(path.join(out,'measurements.json'),JSON.stringify({buildId,measuredAt,method:'Local production build, Microsoft Edge / Chromium, Lighthouse lab measurements; mobile default simulated throttling, desktop 1440px with settings recorded in raw report. Public read-only backend and sandbox notice preserved. These are not field Core Web Vitals.',INP:'BLOCKED: no real-user session sample; Lighthouse TBT is not INP.',measurements,failure},null,2));await browser.close().catch(()=>{});}
