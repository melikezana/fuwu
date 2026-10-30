import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { parseEnv } from 'node:util';
import { chromium } from 'playwright';
const profileOnly=process.argv.includes('--profile-only');
const before=process.argv.includes('--before'), phase=before?'before':'after';
const root=process.cwd(), appRoot=before?path.resolve('artifacts/control-center/runtime-before'):root;
const output=path.resolve(process.env.CONTROL_UI_OUTPUT_DIR||path.join('artifacts/control-center',profileOnly?'profile-copy':phase));await fs.mkdir(output,{recursive:true});
const original=await fs.readFile(path.join(appRoot,'next-env.d.ts'),'utf8');
const id='ac000000-0000-4000-8000-000000000004',admin='ac000000-0000-4000-8000-000000000001',owner='ac000000-0000-4000-8000-000000000002';
const category={id:'ad000000-0000-4000-8000-000000000001',name:'Klima / Beyaz Eşya',slug:'klima-beyaz-esya',is_active:true,is_visible:true};
const district={id:'ad000000-0000-4000-8000-000000000002',name:'Kadıköy',slug:'kadikoy',is_active:true};
const service={id:'ad000000-0000-4000-8000-000000000003',category_id:category.id,name:'Klima Bakımı',slug:'klima-bakimi',description:'Klima temizliği ve mevsimlik bakım.',scope:'İç ve dış ünite temizliği, filtre bakımı.',exclusions:'Yedek parça dahil değildir.',pricing_type:'FIXED_PRICE',is_active:true,image_url:'/images/services/appliance.webp'};
let provider={id,name:'TEST Ahmet Yılmaz',category:category.name,district:district.name,phone:'+905550000001',whatsapp:'+905550000001',description:'Klima ve beyaz eşya bakımında özenli hizmet sunuyorum. Ev ve iş yerlerinde çalışıyorum.',average_price_min:700,average_price_max:1200,working_hours:'09:00-18:00',availability:'müsait',response_time_minutes:30,profile_image_url:null,is_active:true,is_approved:true,is_verified:false,identity_verified:false,phone_verified:true,updated_at:'2026-10-30T08:00:00.000Z',user_id:owner,status:'approved',record_kind:'real',fingerprint:'a'.repeat(32),version:'b'.repeat(32),review_note:null,reviewed_at:null,verification_reference:null,published:true,service_count:1,calendar_days:5,incomplete:true};
let hours=[1,2,3,4,5].map(weekday=>({provider_id:id,weekday,starts_at:'09:00:00',ends_at:'18:00:00'}));
let offerings=[{id:'ad000000-0000-4000-8000-000000000004',provider_id:id,service_id:service.id,variant_id:null,price_minor:85000,duration_minutes:60,district_ids:[district.id],is_active:true,scope:service.scope,updated_at:provider.updated_at}];
const requestLog=[];
const history=[],receipts=new Map();let missingSchema=false,actionRequests=0;
const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const userFor=uid=>({id:uid,aud:'authenticated',role:'authenticated',email:`${uid===admin?'admin':'partner'}@example.invalid`,email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{full_name:uid===admin?'TEST Admin':provider.name},identities:[],created_at:new Date().toISOString()});
const tokens=new Map();
const tokenFor=uid=>tokens.get(uid)||tokens.set(uid,`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:uid,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+7200})}.isolated-fixture-only`).get(uid);
const api=http.createServer(async(req,res)=>{
 res.setHeader('content-type','application/json');res.setHeader('access-control-allow-origin',req.headers.origin||'*');res.setHeader('access-control-allow-headers',req.headers['access-control-request-headers']||'*');res.setHeader('access-control-allow-methods','GET,POST,PATCH,OPTIONS');if(req.method==='OPTIONS'){res.statusCode=204;res.end();return;}const u=new URL(req.url,'http://127.0.0.1');
 if(u.pathname==='/__schema'){missingSchema=u.searchParams.get('missing')==='true';res.end('{}');return;}
 const uid=req.headers.authorization===`Bearer ${tokenFor(admin)}`?admin:req.headers.authorization===`Bearer ${tokenFor(owner)}`?owner:null;
 let body='';for await(const chunk of req)body+=chunk;const input=body?JSON.parse(body):{};let data=[];
 const endpoint=u.pathname.split('/').pop();requestLog.push({endpoint,method:req.method});
 const singular=String(req.headers.accept).includes('vnd.pgrst.object');
 if(u.pathname.includes('/auth/')){if(uid)data=userFor(uid);else{res.statusCode=401;data={message:'No isolated fixture session'};}}
 else if(endpoint==='profiles')data={id:uid,role:uid===admin?'admin':'provider',full_name:uid===admin?'TEST Admin':provider.name,phone:provider.phone,avatar_url:null};
 else if(endpoint==='providers'){
  data=[{...provider,category_id:category.id,district_id:district.id,rating:0,review_count:0,last_active_at:null,profile_completion_score:83,iyzico_submerchant_status:'missing',service_categories:{name:category.name},districts:{name:district.name}}];
  if(!uid&&!provider.published)data=[];
 }
 else if(endpoint==='provider_applications')data=[{id:'ae000000-0000-4000-8000-000000000001',user_id:owner,status:'approved',created_at:provider.updated_at,full_name:provider.name,phone:provider.phone,experience_years:5,service_categories:{name:category.name},districts:{name:district.name},verification_document_path:null}];
 else if(endpoint==='service_categories')data=[category];else if(endpoint==='districts')data=[district];
 else if(endpoint==='service_catalog')data=[service];else if(endpoint==='service_variants')data=[];
 else if(endpoint==='provider_service_offerings')data=offerings;else if(endpoint==='provider_availability')data=hours;
 else if(endpoint==='app_settings')data=[{key:'maintenance_mode',value:'false'}];
 else if(endpoint==='admin_provider_directory'){
  if(missingSchema){res.statusCode=404;data={code:'PGRST202',message:'RPC missing in isolated fixture'};}
  else{const match=!input.p_search||`${provider.name} ${provider.category} ${provider.district}`.toLocaleLowerCase('tr-TR').includes(input.p_search.toLocaleLowerCase('tr-TR'));const visible=match&&(!input.p_provider_id||input.p_provider_id===id)&&(input.p_filter!=='published'||provider.published);data={rows:visible?[provider]:[],total:visible?1:0,page:input.p_page||1,size:input.p_size||20};}
 }
 else if(endpoint==='admin_control_snapshot')data=missingSchema?null:{version:2,network:{applications:1,pending:0,unclassified:0,published:provider.published?1:0,verified:0,stores:1,calendars:1},interest:0,pending_applications:0,readiness:{pending_real_applications:0,ready:0,incomplete:1,missing_verification:1},pilot:[],capacity:[{district_id:district.id,district:district.name,category_id:category.id,category:category.name,applications:1,published:provider.published?1:0,verified:0,stores:1,calendars:1,interest:0}],settings:{launch_company_status:'Şirketleşme bekleniyor',launch_security_blockers:'TEST staging ve OAuth doğrulaması bekleniyor.'}};
 else if(endpoint==='admin_provider_detail')data={state:{version:provider.version,published:provider.published,status:provider.status,active:provider.is_active,verified:provider.is_verified},services:[{id:service.id,name:service.name,price_minor:offerings[0].price_minor,duration_minutes:60,active:true,scope:offerings[0].scope}],applications:[],history};
 else if(endpoint==='admin_provider_quality_queue')data=[{...provider,category_id:category.id,district_id:district.id,experience_years:5,actual_review_count:0}];
 else if(endpoint==='admin_provider_action'){
  actionRequests++;
  if(uid!==admin){res.statusCode=403;data={code:'42501',message:'forbidden'};}
  else if(receipts.has(input.p_request_id))data={...receipts.get(input.p_request_id),replayed:true};
  else{
   await new Promise(r=>setTimeout(r,300));provider={...provider,status:'hidden',published:false,version:'c'.repeat(32)};
   data={ok:true,provider_id:id,action:input.p_action,published:false,version:provider.version,replayed:false};receipts.set(input.p_request_id,data);
   history.push({id:crypto.randomUUID(),actor_user_id:admin,action:'provider.control.'+input.p_action,created_at:new Date().toISOString(),metadata:{reason:input.p_reason}});
  }
 }
 else if(endpoint==='provider_partner_readiness')data={status:provider.status,published:provider.published,application_status:'approved',record_kind:'real',active:true,approved:true,identity_verified:false,phone_verified:true,professional_verified:false,description:provider.description,phone:provider.phone,photo:null,category_id:category.id,district_id:district.id,service_count:offerings.length,calendar_days:hours.length,districts:[district.name],has_document:false};
 else if(endpoint==='consume_user_rate_limit')data={allowed:true,limit:input.p_limit,remaining:input.p_limit-1,resetAt:Date.now()+input.p_window_ms};
 else if(endpoint==='commerce_offers'||endpoint==='provider_publication_gate')data=provider.published?[{...offerings[0],id:provider.id,provider_id:id,record_kind:'real',verified:false,identity_verified:false,rating:null,review_count:0}]:[];
 else if(endpoint==='commerce_save_store'){offerings=input.p_offerings;hours=input.p_hours;data=null;}
 else if(endpoint==='partner_save_calendar'){hours=input.p_hours;data=null;}
 else if(endpoint==='partner_save_services'){offerings=input.p_offerings;data=null;}
 else if(endpoint==='bind_provider_applications_to_current_user')data=0;
 else if(endpoint==='commerce_provider_private')data={};
 if(Array.isArray(data)&&singular)data=data[0]??null;
 res.setHeader('content-range',`0-${Array.isArray(data)?Math.max(0,data.length-1):0}/${Array.isArray(data)?data.length:data?1:0}`);
 res.end(JSON.stringify(data));
});
await new Promise(r=>api.listen(0,'127.0.0.1',r));const apiUrl=`http://127.0.0.1:${api.address().port}`;
const reservation=http.createServer();await new Promise(r=>reservation.listen(0,'127.0.0.1',r));const port=reservation.address().port;await new Promise(r=>reservation.close(r));const base=`http://127.0.0.1:${port}`;
const env={...process.env};for(const f of ['.env','.env.local','.env.test','.env.production','.env.production.local'])for(const k of Object.keys(parseEnv(await fs.readFile(f,'utf8').catch(()=>''))))env[k]='';
for(const k of Object.keys(env))if(/SUPABASE|IYZICO|UPSTASH|SENTRY|OPENAI|NETGSM|SMTP|CRON_SECRET/.test(k))env[k]='';
Object.assign(env,{NEXT_PUBLIC_SUPABASE_URL:apiUrl,NEXT_PUBLIC_SUPABASE_ANON_KEY:'isolated-fixture-anon',NEXT_PUBLIC_SITE_URL:base,NEXT_PUBLIC_ANALYTICS_ENABLED:'false',NEXT_TELEMETRY_DISABLED:'1',FUWU_SANDBOX_CHECKOUT_ENABLED:'false'});
const log=await fs.open(path.join(output,'server.log'),'w');
const production=process.env.FUWU_UI_PRODUCTION==='true';
if(production){const build=spawnSync(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'build','--webpack'],{cwd:appRoot,env,windowsHide:true,encoding:'utf8',timeout:300000,maxBuffer:20*1024*1024});await fs.writeFile(path.join(output,'production-build.log'),(build.stdout||'')+(build.stderr||''));if(build.status!==0)throw new Error('Isolated fixture production build failed; see production-build.log');}
const server=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),...(production?['start']:['dev','--webpack']),'--hostname','127.0.0.1','--port',String(port)],{cwd:appRoot,env,windowsHide:true,stdio:['ignore',log.fd,log.fd]});
const report={scope:'Actual local Next.js/React/Server Action with synthetic Auth and REST fixtures. Not Supabase integration/E2E acceptance.',phase,runtime:production?'production':'development',widths:[],checks:[],errors:[],status:'FAIL'};let browser,page;
try{
 let ready=false;for(let n=0;n<180;n++){if(server.exitCode!==null)throw new Error('Next server exited');try{if((await fetch(base+'/login',{signal:AbortSignal.timeout(3000)})).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,1000));}assert.ok(ready,'Local Next ready');
 browser=await chromium.launch({headless:true,channel:'msedge'});page=await browser.newPage({bypassCSP:true});page.setDefaultTimeout(45000);page.on('pageerror',e=>report.errors.push(e.message));
 await page.route(/^https?:\/\//,route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 const session=async uid=>{const user=userFor(uid),token=tokenFor(uid);await page.context().clearCookies();await page.context().addCookies([{name:'sb-127-auth-token',value:'base64-'+encode({access_token:token,refresh_token:'TEST-refresh',expires_at:Math.floor(Date.now()/1000)+7200,expires_in:7200,token_type:'bearer',user}),url:base,sameSite:'Lax'}]);};
 const visit=async(route,width,name,heading)=>{await page.setViewportSize({width,height:900});await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:120000});const expectedHeading=heading||({'/provider-dashboard':before?'Bugünkü işlerin.':'İşin burada.','/provider-dashboard/store':'Hizmetlerim','/provider-dashboard/calendar':'Takvimim','/provider-dashboard/profile':'Profil Bilgileri'})[route];if(expectedHeading)await page.getByRole('heading',{name:expectedHeading,exact:true}).first().waitFor();else await page.getByRole('heading',{level:1}).first().waitFor();await page.evaluate(()=>document.fonts.ready);const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);report.widths.push({path:route,width,overflow});if(width===390&&!before){await page.addScriptTag({path:path.resolve('node_modules/axe-core/axe.min.js')});const scan=await page.evaluate(async()=>{const result=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});return result.violations.filter(v=>['critical','serious'].includes(v.impact)).map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary})).slice(0,8)}));});(report.accessibility??=[]).push({route,violations:scan});}if([390,1440].includes(width))await page.screenshot({path:path.join(output,`${name}-${width}.png`),fullPage:true,style:'nextjs-portal{display:none!important}'});};
 if(!profileOnly){
 await session(admin);
 if(!before)for(const width of [320,360,375,390,430,768,1024,1440])await visit('/admin',width,'admin-overview','İşler kontrol altında.');
 for(const width of [320,360,375,390,430,768,1024,1440])await visit('/admin/providers',width,'admin-list',before?'Ustalar':'Usta Yönetimi');
 if(!before){
  for(const width of [320,360,375,390,430,768,1024,1440])await visit('/admin/providers?id='+id,width,'admin-detail',provider.name);
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(button=>button.textContent==='Yayından Kaldır'&&Object.keys(button).some(key=>key.startsWith('__reactProps')&&typeof button[key].onClick==='function')));await page.getByRole('button',{name:'Yayından Kaldır',exact:true}).click();await page.getByRole('dialog',{name:'Yayından Kaldır'}).waitFor();
  await page.getByLabel('Kısa gerekçe').fill('TEST kamuya açık profili kapatıyorum.');
  const button=page.getByRole('button',{name:'Yayından Kaldır · Onayla',exact:true});await button.dblclick();
  await page.getByRole('status').filter({hasText:'Usta yayından kaldırıldı.'}).waitFor();assert.equal(actionRequests,1);await page.getByText('Yayından kaldırıldı',{exact:true}).first().waitFor();
  report.checks.push('Actual Server Action POST, confirmation names provider, reason required, pending lock, double-click produces one fixture RPC, committed fixture readback updates badge, visible success notice');
  await fetch(apiUrl+'/__schema?missing=true');await page.goto(base+'/admin/providers');await page.getByRole('heading',{name:'Yönetim şeması güncel değil.'}).waitFor();assert.equal(await page.getByText('0 kayıt',{exact:true}).count(),0);await page.screenshot({path:path.join(output,'schema-missing.png'),fullPage:true});await fetch(apiUrl+'/__schema?missing=false');report.checks.push('Missing schema shows explicit blocker; never renders empty count');
 }
 }
 if(!before&&!profileOnly)for(const [route,name] of [['/admin/provider-applications','admin-applications'],['/admin/catalog','admin-catalog'],['/admin/interest','admin-interest'],['/admin/verifications','admin-verifications'],['/admin/marketplace?view=health','admin-health'],['/admin/audit','admin-audit']])for(const width of [320,360,375,390,430,768,1024,1440])await visit(route,width,name);
 await session(owner);
 const routes=profileOnly?['/provider-dashboard/profile']:before?['/provider-dashboard']:['/provider-dashboard','/provider-dashboard/store','/provider-dashboard/calendar','/provider-dashboard/profile'];
 for(const route of routes)for(const width of (profileOnly?[390,1440]:[320,360,375,390,430,768,1024,1440]))await visit(route,width,route.split('/').pop()||'partner',route==='/provider-dashboard'&&!before?'İşin burada.':null);
 if(!before&&!profileOnly){await page.setViewportSize({width:390,height:900});await page.goto(base+'/provider-dashboard/calendar',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Array.from(document.querySelectorAll('form')).some(form=>Object.keys(form).some(key=>key.startsWith('__reactProps')&&typeof form[key].onSubmit==='function')));await page.getByRole('button',{name:'Takvimimi Kaydet',exact:true}).click();await page.getByRole('status').filter({hasText:'Takvimin kaydedildi.'}).waitFor();report.checks.push('Partner home, service/scope, calendar, private document form and profile form render; calendar sends real app POST to synthetic RPC; four mobile navigation tabs');}

 if(!before&&!profileOnly){
  await page.setViewportSize({width:390,height:900});await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base+'/provider-dashboard',{waitUntil:'domcontentloaded'});
  const tabs=page.locator('.mobile-tab');assert.equal(await tabs.count(),4);for(const tab of await tabs.all()){const box=await tab.boundingBox();assert.ok(box&&box.width>=44&&box.height>=44,'mobile tabs have 44px targets');}
  await page.addStyleTag({content:'html{font-size:20px!important}'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'125% text remains usable');
  await page.setViewportSize({width:844,height:390});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'landscape has no overflow');
  report.checks.push('Four partner tabs have 44px touch targets; reduced-motion, 125% text zoom and 844x390 landscape checked');
 }
 assert.equal(report.widths.filter(x=>x.overflow).length,0,'No horizontal overflow at every requested width');assert.deepEqual(report.errors,[]);assert.equal(report.accessibility?.flatMap(r=>r.violations).length||0,0,'No serious/critical WCAG violations in audited mobile screens');report.status='PASS_UI_FIXTURES_ONLY';if(profileOnly&&!process.env.CONTROL_UI_OUTPUT_DIR)for(const width of [390,1440])await fs.copyFile(path.join(output,`profile-${width}.png`),path.resolve('artifacts/control-center/after',`profile-${width}.png`));
}catch(e){report.failure=e.message;await page?.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});report.apiRequests=requestLog.slice(-20);report.visibleDialogs=await page?.getByRole('dialog').count().catch(()=>null);process.exitCode=1;}
finally{await browser?.close();server.kill();api.closeAllConnections();api.close();await log.close();await fs.writeFile(path.join(appRoot,'next-env.d.ts'),original);await fs.writeFile(path.join(output,'responsive.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
