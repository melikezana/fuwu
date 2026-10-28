import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { expect } from '@playwright/test';
const require = createRequire(import.meta.url);
const before = process.argv.includes('--before');
const out = path.resolve('artifacts/premium-mobile', before ? 'before-components' : 'after-components');
await fs.mkdir(out, { recursive: true });
const root = path.resolve('e2e/fixtures/commerce-ui');
const original = new Map();
const server = await createServer({ configFile: false, root, cacheDir: path.resolve('artifacts/premium-mobile/vite-audit-cache'), publicDir: path.resolve('public'), plugins: before ? [{name:'original-committed-components',enforce:'pre',transform(code,id) {
  const file = path.relative(process.cwd(),id.split('?')[0]).replaceAll('\\','/');
  if(file==='src/styles/mobile-experience.css') return '';
  if(!/^(src\/|e2e\/fixtures\/commerce-ui\/main.tsx)/.test(file)||!file.endsWith('.tsx')) return;
  if(!original.has(file)) {try { original.set(file,execFileSync('git',['show',`HEAD:${file}`],{encoding:'utf8'})); }catch {original.set(file,null);} }
  return original.get(file) || undefined;
}}] : [], resolve: { alias: { '@/app/admin/marketplace/health-actions':path.join(root,'health-action.ts'), '@/app/providers/[id]/actions':path.join(root,'review-action.ts'), '@':path.resolve('src'), 'next/link':path.join(root,'next-link.tsx'), 'next/image':path.join(root,'next-image.tsx'), 'next/navigation':path.join(root,'next-navigation.ts') } }, esbuild:{jsx:'automatic'},server:{host:'127.0.0.1',port:3053,strictPort:true,fs:{allow:[process.cwd()]}} });
await server.listen();
const browser = await chromium.launch();
const page = await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
page.setDefaultNavigationTimeout(120000);
page.setDefaultTimeout(15000);
const report = { scope: 'Actual React components in an isolated fixture. Fictional data are labelled on every screenshot. No authenticated app, Google or iyzico E2E claim.', before, checks:[], screenshots:[], accessibility:[], errors:[] };
page.on('pageerror',e=>report.errors.push(e.message));
const base='http://127.0.0.1:3053';
async function open(screen) {await page.goto(`${base}/?screen=${screen}`,{waitUntil:'domcontentloaded'});await page.locator('h1').first().waitFor({timeout:60000});}
try {
  for (const screen of (before ? ['admin','phase3-customer','phase3-calendar','phase3-store','booking','provider'] : ['admin','phase3-customer','provider-overview','provider-finance','phase3-calendar','phase3-store','catalog','provider','customer-orders','photo-error'])) {
    await open(screen);
    for(const width of (before ? [390,1440] : [320,360,375,390,430,768,1024,1440])) {
      await page.setViewportSize({width,height:900});
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
      assert.ok(overflow<=1,`${screen} overflow at ${width}: ${overflow}`);
      if([390,1440].includes(width)){const name=`${screen}-${width}-FIXTURE.png`;await page.screenshot({path:path.join(out,name),fullPage:true});report.screenshots.push(name);}
    }
    if(!before){
      await page.addScriptTag({path:require.resolve('axe-core')});
      const a=await page.evaluate(async()=>{const r=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});return {violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:r.incomplete.map(v=>v.id)};});
      report.accessibility.push({screen,...a});
    }
    report.checks.push(`${screen}: ${before?2:8} widths fit`);
  }
  if(!before) {
    await open('phase3-customer');
    const nav=page.getByRole('navigation',{name:'Müşteri paneli'});
    assert.equal(await nav.locator('.customer-primary-links a').count(),3);
    await nav.getByText('Hesap ve destek',{exact:true}).click();await expect(nav.getByRole('link',{name:'Adreslerin',exact:true})).toBeVisible();
    await page.getByRole('link',{name:'Yeniden Satın Al',exact:true}).last().click();assert.match(page.url(),/provider=/);assert.ok(!/price=|startsAt=/.test(page.url()));
    report.checks.push('Customer has three primary account links, collapsible secondary links and rebook carries provider identity without stale price/time.');
    await open('provider-overview');await page.getByRole('link',{name:'Siparişi Gör',exact:true}).click();assert.match(page.url(),/\/orders\//);
    await open('provider-overview');await page.getByRole('link',{name:'Takvim ve İzinler',exact:true}).click();assert.match(page.url(),/\/provider-dashboard\/calendar/);
    await open('provider-finance');await expect(page.getByText('₺762,50',{exact:true})).toBeVisible();
    await open('provider-finance&unknown=true');await expect(page.getByText('Kesinti doğrulanmadı',{exact:true})).toBeVisible();await expect(page.getByText('₺762,50',{exact:true})).toHaveCount(0);
    report.checks.push('Provider nearest-order and calendar links retain correct destinations; verified 2.50 TRY deduction yields 762.50 TRY, unknown deduction never exposes a net amount.');
    await open('admin');await expect(page.getByRole('button',{name:'Bugün',exact:true})).toHaveAttribute('aria-pressed','true');await page.getByRole('link',{name:/ödeme veya hak ediş/}).click();assert.match(page.url(),/view=reconciliation/);
    await open('admin');await page.getByRole('button',{name:'Finans',exact:true}).click();await expect(page.getByText('Muhasebe verisi yok',{exact:true})).toBeVisible();
    await open('admin&zero=true');await expect(page.getByRole('region',{name:'Öncelikli işlemler'})).toHaveCount(0);
    await open('photo-error');await expect(page.getByRole('img',{name:/görsel henüz eklenmedi/})).toBeVisible();assert.equal(await page.locator('img').count(),0);
    report.checks.push('CEO opens on daily overview, attention links point to the real queues and zero counts produce no alarms; broken unknown service image uses a neutral fallback.');
    for(const screen of ['phase3-customer','provider-overview','provider-finance','admin']){
      await open(screen);await page.setViewportSize({width:375,height:812});await page.evaluate(()=>document.documentElement.style.fontSize='200%');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${screen} at 200% text`);
    }
    assert.deepEqual(report.errors,[]);
    assert.deepEqual(report.accessibility.flatMap(a=>a.violations),[],'WCAG automated violations');
  }
}catch(e){report.failure=String(e.stack);process.exitCode=1;await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});}
finally{await fs.writeFile(path.join(out,'component-audit.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();await server.close();}
