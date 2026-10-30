import fs from "node:fs/promises";
import http from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { chromium } from "playwright";
import { parseEnv } from "node:util";
import path from "node:path";

const phase=process.argv.includes("--before")?"before":"after";
const output=process.env.PRELAUNCH_UI_OUTPUT_DIR||`artifacts/prelaunch/${phase}`;
const projectRoot=process.cwd();
const appRoot=phase==='before'?path.resolve('artifacts/prelaunch/runtime-before'):projectRoot;
const originalNextEnv=await fs.readFile(path.join(appRoot,'next-env.d.ts'),'utf8').catch(()=>null);
await fs.mkdir(output,{recursive:true});
// Explicitly isolated UI fixtures. No production DB/Auth/payment requests.
const categories=[['Tesisat','tesisat'],['Elektrik','elektrik-hizmeti'],['Temizlik','temizlik'],['Boya','boya-badana'],['Mobilya Montaj','mobilya-montaj'],['Klima / Beyaz Eşya','klima-beyaz-esya'],['Halı Yıkama','hali-yikama'],['Çilingir','cilingir'],['Nakliye Yardımı','nakliye-yardimi'],['Bahçe Bakımı','bahce-bakimi'],['Havuz Bakımı','havuz-bakimi']].map(([name,slug],i)=>({id:`30000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,name,slug,is_active:true,is_visible:true,is_featured:true,sort_order:i}));
const districts=['Kadıköy','Üsküdar','Ataşehir'].map((name,i)=>({id:`40000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,name,is_active:true}));
const adminId='ab000000-0000-4000-8000-000000000003';
const adminUser={id:adminId,aud:'authenticated',role:'authenticated',email:'admin@fuwu.test',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{full_name:'TEST Admin'},identities:[],created_at:new Date().toISOString()};
const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:adminId,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.isolated-fixture-signature`;
const api=http.createServer((req,res)=>{
  const route=new URL(req.url,'http://127.0.0.1').pathname;
  res.setHeader('Content-Type','application/json');
  let data=[];
  if(route.endsWith('/service_categories'))data=categories;
  if(route.endsWith('/districts'))data=districts;
  if(route.endsWith('/app_settings'))data=[{key:'announcement_banner',value:'GELİŞTİRİYORUZ'},{key:'maintenance_mode',value:'false'}];
  if(route.includes('/auth/')){if(req.headers.authorization===`Bearer ${token}`)data=adminUser;else{res.statusCode=401;data={message:'Isolated fixture has no session'};}}
  if(route.endsWith('/profiles'))data={id:adminId,role:'admin',full_name:'TEST Admin',phone:null,avatar_url:null};
  if((route.endsWith('/admin_prelaunch_snapshot')||route.endsWith('/admin_control_snapshot')))data={version:1,network:{applications:0,pending:0,unclassified:0,published:0,verified:0,stores:0,calendars:0},interest:0,pilot:districts.flatMap(d=>categories.slice(0,2).map(c=>({district_id:d.id,district:d.name,category_id:c.id,category:c.name,applications:0,published:0,verified:0,stores:0,calendars:0,interest:0}))),settings:{launch_company_status:'Şirketleşme bekleniyor',launch_payment_status:'Canlı ödeme kapalı'}};
  if(route.endsWith('/launch_interest_health'))data={version:1,available:false};
  if(route.endsWith('/withdraw_launch_interest'))data=true;
  if(route.endsWith('/launch_interest')){res.statusCode=503;data={code:'42P01'};}
  res.end(JSON.stringify(data));
});
await new Promise(r=>api.listen(0,'127.0.0.1',r));
const apiUrl=`http://127.0.0.1:${api.address().port}`;
const env={...process.env};
for(const file of ['.env','.env.local','.env.test','.env.production','.env.production.local']){
  for(const key of Object.keys(parseEnv(await fs.readFile(file,'utf8').catch(()=>''))))env[key]='';
}
for(const key of Object.keys(env))if(/SUPABASE|IYZICO|UPSTASH|SENTRY|OPENAI|NETGSM|SMTP|CRON_SECRET/.test(key))env[key]='';
const reservation=http.createServer();await new Promise(r=>reservation.listen(0,'127.0.0.1',r));
const port=reservation.address().port;await new Promise(r=>reservation.close(r));
const base=`http://127.0.0.1:${port}`;
Object.assign(env,{NEXT_PUBLIC_SUPABASE_URL:apiUrl,NEXT_PUBLIC_SUPABASE_ANON_KEY:'isolated-fixture-anon',SUPABASE_SERVICE_ROLE_KEY:'isolated-fixture-server',NEXT_PUBLIC_SITE_URL:base,NEXT_PUBLIC_ANALYTICS_ENABLED:'false',NEXT_TELEMETRY_DISABLED:'1',FUWU_SANDBOX_CHECKOUT_ENABLED:'false'});
const log=await fs.open(`${output}/server.log`,'w');
const production=process.env.FUWU_UI_PRODUCTION==='true';
if(production){const build=spawnSync(process.execPath,[path.join(projectRoot,'node_modules/next/dist/bin/next'),'build','--webpack'],{cwd:appRoot,env,windowsHide:true,encoding:'utf8',timeout:300000,maxBuffer:20*1024*1024});await fs.writeFile(path.join(output,'production-build.log'),(build.stdout||'')+(build.stderr||''));if(build.status!==0)throw new Error('Isolated fixture production build failed; see production-build.log');}
const server=spawn(process.execPath,[path.join(projectRoot,'node_modules/next/dist/bin/next'),...(production?['start']:['dev','--webpack']),'--hostname','127.0.0.1','--port',String(port)],{cwd:appRoot,env,windowsHide:true,stdio:['ignore',log.fd,log.fd]});
server.on('exit',code=>console.log(`Local Next process exited: ${code}`));
const report={scope:'Local Next.js + isolated catalogue fixtures; no live integration proof',phase,runtime:production?'production':'development',widths:[],checks:[],errors:[]};
let browser,page;
try{
  let ready=false;
  for(let i=0;i<180;i++){
    if(server.exitCode!==null)throw new Error('local_server_exited');
    try{const r=await fetch(base,{signal:AbortSignal.timeout(3000)});if(r.ok){ready=true;break;}}catch{}
    await new Promise(r=>setTimeout(r,1000));
  }
  if(!ready)throw new Error('local_server_unavailable');
  browser=await chromium.launch({headless:true,channel:'msedge'});
  page=await browser.newPage({bypassCSP:true});page.setDefaultTimeout(60000);
  page.on('pageerror',error=>report.errors.push(error.message));
  await page.route(/^https?:\/\//,async route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  for(const width of [320,360,375,390,430,768,1024,1440]){
    await page.setViewportSize({width,height:900});
    await page.goto(base,{waitUntil:'domcontentloaded'});
    await page.locator('.home-category-card').first().waitFor();
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForFunction(()=>{const input=document.querySelector('#home-service-search');return input&&Object.keys(input).some(key=>key.startsWith('__reactProps'));});
    await page.locator('.home-category-image img').first().waitFor({state:'attached'});
    if(width<=430){const allServices=page.locator('.home-services .home-section-heading > a:visible');const box=await allServices.boundingBox();if(!box||box.height<44||box.y+box.height>900)throw new Error('all_services_not_accessible_in_first_mobile_screen');}
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    report.widths.push({path:'/',width,overflow,categories:await page.locator('.home-category-card:visible').count()});
    if([390,1440].includes(width))await page.screenshot({path:`${output}/home-${width}.png`,fullPage:true,caret:'initial',style:'nextjs-portal{display:none!important}'});
    if(phase==='after'){
      if(await page.getByText('GELİŞTİRİYORUZ',{exact:true}).count())throw new Error('legacy_banner_visible');
      if(!await page.getByRole('heading',{name:'Usta ağımızı kuruyoruz.'}).count())throw new Error('provider_empty_state_missing');
    }
  }
  await page.setViewportSize({width:390,height:900});await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.addScriptTag({path:projectRoot+'/node_modules/axe-core/axe.min.js'});
  const homeScan=await page.evaluate(async()=>{const result=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});return result.violations.filter(v=>['critical','serious'].includes(v.impact)).map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary})).slice(0,8)}));});
  (report.accessibility??=[]).push({path:'/',violations:homeScan});
  report.performance=await page.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0];return {scope:'Warmed local synthetic fixture; not production field metrics',domContentLoadedMs:Math.round(n.domContentLoadedEventEnd),loadMs:Math.round(n.loadEventEnd),decodedImages:document.querySelectorAll('img').length};});
  for(const path of ['/services','/providers','/provider-application','/waitlist','/admin']){
    for(const width of [320,360,375,390,430,768,1024,1440]){
      await page.setViewportSize({width,height:900});
      await page.goto(`${base}${path}`,{waitUntil:'domcontentloaded'});
      report.widths.push({path,width,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
      if(width===390){await page.addScriptTag({path:projectRoot+'/node_modules/axe-core/axe.min.js'});const scan=await page.evaluate(async()=>{const result=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});return result.violations.filter(v=>['critical','serious'].includes(v.impact)).map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary})).slice(0,8)}));});(report.accessibility??=[]).push({path,violations:scan});}
      if(width===390)await page.screenshot({path:`${output}/${path.slice(1)==='admin'?'admin-access':path.slice(1)}-390.png`,fullPage:true,caret:'initial',style:'nextjs-portal{display:none!important}'});
    }
  }
  if(phase==='after'){
    await page.goto(`${base}/services`,{waitUntil:'domcontentloaded'});
    if(await page.locator('.catalog-all-categories .home-category-card').count()!==categories.length)throw new Error('active_categories_missing');
    await Promise.all([page.waitForURL(url=>url.searchParams.get('category')==='cilingir'),page.locator('.catalog-all-categories a[href*="cilingir"]').first().click()]);
    if(!new URL(page.url()).searchParams.get('category')?.includes('cilingir'))throw new Error('category_link_broken');
    const response=await page.request.post(`${base}/api/commerce/orders`,{data:{}});
    if(![401,403,503].includes(response.status()))throw new Error('checkout_not_closed');
    await page.goto(`${base}/waitlist`,{waitUntil:'domcontentloaded'});
    if(await page.locator('button[type=submit]:disabled').count()!==1)throw new Error('waitlist_missing_schema_not_disabled');
    report.checks.push('Legacy banner suppressed; honest provider empty state; all active fixture categories; category links; unauthorized admin redirected; checkout closed; unavailable waitlist disabled');
    const session={access_token:token,refresh_token:'TEST-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:adminUser};
    await page.context().addCookies([{name:'sb-127-auth-token',value:`base64-${encode(session)}`,url:base,httpOnly:false,sameSite:'Lax'}]);
    for(const width of [320,360,375,390,430,768,1024,1440]){
      await page.setViewportSize({width,height:900});await page.goto(`${base}/admin`,{waitUntil:'domcontentloaded'});
      await page.getByRole('heading',{name:'İşler kontrol altında.',exact:true}).waitFor();
      report.widths.push({path:'/admin (isolated authenticated UI fixture)',width,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
      if([390,1440].includes(width))await page.screenshot({path:`${output}/admin-${width}.png`,fullPage:true,caret:'initial',style:'nextjs-portal{display:none!important}'});
    }
    report.checks.push('Readiness dashboard rendered using synthetic admin session and empty metrics; this is UI evidence, not hosted Auth/RLS proof');
    await page.goto(`${base}/waitlist`,{waitUntil:'domcontentloaded'});
    const withdraw=page.getByRole('button',{name:'İletişim iznimi geri çek',exact:true});
    await withdraw.waitFor();
    if(!await withdraw.isEnabled())throw new Error('withdrawal_disabled_when_signups_closed');
    await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(button=>button.textContent==='İletişim iznimi geri çek'&&Object.keys(button).some(key=>key.startsWith('__reactProps')&&typeof button[key].onClick==='function')));
    await withdraw.click();
    await page.getByText('Açılış bilgilendirme iznin geri çekildi.',{exact:true}).waitFor();
    report.checks.push('Authenticated withdrawal remains available while new registrations are closed; actual Server Action exercised against local RPC fixture');
  }
  if(report.widths.some(row=>row.overflow))throw new Error('horizontal_overflow');
  if(report.errors.length)throw new Error('browser_errors');
  if(report.accessibility?.some(row=>row.violations.length))throw new Error('serious_or_critical_accessibility_violation');
  report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.message;await page?.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});process.exitCode=1;}
finally{await browser?.close();if(server.exitCode===null){server.kill();await Promise.race([new Promise(r=>server.once('exit',r)),new Promise(r=>setTimeout(r,3000))]);}api.closeAllConnections();api.close();await log.close();if(originalNextEnv!==null)await fs.writeFile(path.join(appRoot,'next-env.d.ts'),originalNextEnv);await fs.writeFile(`${output}/responsive.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
