import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const phase = process.argv.includes('--before') ? 'before' : 'after';
const require = createRequire(import.meta.url);
const axeSource = await fs.readFile(require.resolve('axe-core'),'utf8');
const base = process.env.PREMIUM_BASE_URL || 'http://127.0.0.1:3029';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname));
const out = path.resolve('artifacts/premium-mobile', phase);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
await context.addInitScript(() => localStorage.setItem('fuwu:cookie-consent', 'rejected'));
const page = await context.newPage();
page.setDefaultNavigationTimeout(120000);
const report = { phase, mode: 'Actual Next.js app; public backend read only; no mocked catalog', pages: [], errors: [], accessibility: [], blocked: [] };
page.on('pageerror', e => report.errors.push(e.message));
const routes = [['home','/'],['services','/services'],['category','/services?category=hali-yikama'],['providers','/providers'],['purchase','/services/musluk-montaji'],['join','/provider-application'],['google-login','/login']];
try {
  for (const [name, route] of routes) {
    await page.goto(base + route, { waitUntil: 'domcontentloaded' });
    await page.locator('h1').first().waitFor({timeout:60000});
    const entry = { route, heading: await page.locator('h1').allTextContents(), widths: [], brokenImages: [] };
    if (name === 'services') {
      report.categories = await page.locator('.catalog-all-categories .home-category-card').evaluateAll(nodes => nodes.map(n => ({ title: n.querySelector('h3')?.textContent, href: n.getAttribute('href'), image: n.querySelector('img')?.getAttribute('src') })));
    }
    if (name === 'providers') {
      const profile = await page.locator('.market-provider-identity h3 a').first().getAttribute('href').catch(() => null);
      if (profile) routes.push(['profile', profile]);
      else report.blocked.push('No public provider profile was returned.');
    }
    for (const width of (phase === 'before' ? [390,1440] : [320,360,375,390,430,768,1024,1440])) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += innerHeight) { scrollTo(0, y); await new Promise(resolve => requestAnimationFrame(resolve)); } scrollTo(0, 0); });
      await page.waitForFunction(() => [...document.images].filter(i => i.getBoundingClientRect().width).every(i => i.complete), null, { timeout: 15000 }).catch(() => {});
      entry.widths.push({ width, overflow: await page.evaluate(() => document.documentElement.scrollWidth - innerWidth) });
      if ([390,1440].includes(width)) {
        await page.addStyleTag({ content: 'nextjs-portal { display:none!important; }' });
        await page.screenshot({ path: path.join(out, `${name}-${width}.png`), fullPage: true });
      }
    }
    entry.brokenImages = await page.locator('img').evaluateAll(nodes => nodes.filter(n => n.complete && !n.naturalWidth).map(n => n.getAttribute('src')));
    report.pages.push(entry);
    if(phase==='after') {
      await page.setViewportSize({width:390,height:844});
      await page.evaluate(axeSource);
      report.accessibility.push({route,...await page.evaluate(async()=>{const r=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});return {violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:r.incomplete.map(v=>v.id)};})});
    }
    console.log(name, JSON.stringify(entry.widths));
  }
  for (const route of ['/account','/orders','/provider-dashboard','/provider-dashboard/calendar','/provider-dashboard/earnings','/admin','/admin/marketplace']) {
    const r = await page.request.get(base + route, { maxRedirects: 0 });
    report.blocked.push({ route, status: r.status(), location: r.headers().location?.split('?')[0] });
  }
  if(phase==='after') {
    await page.goto(base,{waitUntil:'domcontentloaded'});await page.locator('#home-service-search').waitFor();
    report.firstCategoryY=await page.locator('.home-category-card').first().evaluate(n=>n.getBoundingClientRect().top);
    const nav=page.getByRole('navigation',{name:'Mobil alt sekme navigasyonu'});
    assert.equal(await nav.getByRole('link').count(),5);
    for(const a of await nav.getByRole('link').all())assert.ok((await a.boundingBox()).height>=48);
    await page.locator('#home-service-search').fill('Elektrik');
    await page.getByRole('button',{name:'Hizmetleri Gör',exact:true}).click();await page.waitForURL(/\/services\?q=Elektrik/);
    report.searchVerified=true;
    await page.getByRole('button',{name:'Filtrele',exact:true}).click();
    const dialog=page.getByRole('dialog');await dialog.waitFor();
    for(let i=0;i<10;i++)await page.keyboard.press('Tab');
    assert.ok(await dialog.evaluate(node=>node.contains(document.activeElement)),'Dialog contains keyboard focus');
    await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
    report.keyboardDialogVerified=true;
    await page.setViewportSize({width:812,height:375});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.setViewportSize({width:375,height:812});await page.evaluate(()=>document.documentElement.style.fontSize='200%');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    report.landscapeAnd200PercentText=true;
    const manifest=await (await page.request.get(base+'/manifest.webmanifest')).json();assert.equal(manifest.display,'standalone');assert.equal(manifest.lang,'tr');
    for(const icon of manifest.icons)assert.equal((await page.request.get(new URL(icon.src,base).href)).status(),200);
    report.pwaVerified=true;
    assert.ok(report.pages.every(p=>p.widths.every(w=>w.overflow<=1)&&!p.brokenImages.length));
    assert.deepEqual(report.errors,[]);
    assert.deepEqual(report.accessibility.flatMap(a=>a.violations),[],'Public WCAG automated violations');
  }
} catch (e) { report.failure = String(e.stack); process.exitCode = 1; }
finally { await fs.writeFile(path.join(out, 'public-audit.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report)); await browser.close(); }
