import fs from 'node:fs/promises';
import path from 'node:path';
import {expect,test,type Page} from './fixtures';
import {createCommerceFixture,createTrustFixture,ensureTestUserRole,getTestAdminClient,loginWithEmailMagicLink,skipUnlessLocalSupabase,uniqueE2EEmail} from './helpers';

test('real public, customer, partner, document and admin screens fit 320–1440px and pass mobile axe',async({browser})=>{
 test.setTimeout(300_000);skipUnlessLocalSupabase();
 const output=path.resolve(process.env.E2E_MOBILE_OUTPUT_DIR||'artifacts/critical-backend-repair/mobile');await fs.mkdir(output,{recursive:true});
 const axe=await fs.readFile(path.resolve('node_modules/axe-core/axe.min.js'),'utf8');
 const db=getTestAdminClient(),email=uniqueE2EEmail('mobile-partner'),owner=await ensureTestUserRole(email,'provider'),prepared=await createCommerceFixture(owner),trust=await createTrustFixture();
 const appId=crypto.randomUUID(),application=await db.from('provider_applications').insert({id:appId,user_id:owner,full_name:prepared.provider.name,phone:prepared.provider.phone,category_id:prepared.provider.category_id,district_id:prepared.districtId,status:'approved'});expect(application.error).toBeNull();
 const guest=await browser.newContext(),customer=await browser.newContext(),partner=await browser.newContext(),admin=await browser.newContext();
 const rows:object[]=[],errors:string[]=[];
 try {
  const g=await guest.newPage(),c=await customer.newPage(),p=await partner.newPage(),a=await admin.newPage();
  for(const page of [g,c,p,a])page.on('pageerror',error=>errors.push(error.message));
  await loginWithEmailMagicLink(c,{email:trust.email,nextPath:'/orders'});await loginWithEmailMagicLink(p,{email,role:'provider',nextPath:'/provider-dashboard'});await loginWithEmailMagicLink(a,{email:uniqueE2EEmail('mobile-admin'),role:'admin',nextPath:'/admin'});
  const screens:[Page,string,string][]=[
   [g,'/','home'],[g,'/services','catalog'],[g,'/services/musluk-montaji','service'],[g,'/providers/'+prepared.provider.id,'provider'],[g,'/provider-application','application'],[g,'/hakkimizda','about'],[g,'/sss','faq'],[g,'/iletisim','contact'],
   [c,'/waitlist','interest'],[c,'/orders/'+trust.id,'trust'],[p,'/provider-dashboard','partner'],[p,'/provider-dashboard/store','store'],[p,'/provider-dashboard/profile','documents'],
   [a,'/admin','admin'],[a,'/admin/providers?id='+prepared.provider.id,'inspector'],[a,'/admin/provider-applications/'+appId,'application-file'],[a,'/admin/verifications','verification'],[a,'/admin/support','support-inbox'],
  ];
  for(const [page,route,name] of screens) for(const width of [320,360,390,768,1024,1440]) {
   await page.setViewportSize({width,height:900});await page.goto(route,{waitUntil:'domcontentloaded'});await expect(page.getByRole('heading',{level:1}).first()).toBeVisible();await page.evaluate(()=>document.fonts.ready);
   const dimensions=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth}));
   expect(dimensions.width,`${route} at ${width}px`).toBeLessThanOrEqual(dimensions.viewport);
   let violations:object[]=[];
   if(width===390) {
    await page.evaluate(axe+';void 0');
    violations=await page.evaluate(async()=>{
     const engine=(window as unknown as {axe:{run:(target:Document,options:object)=>Promise<{violations:{id:string;impact:string;nodes:{target:string[]}[]}[]}>}}).axe;
     const result=await engine.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});
     return result.violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)}));
    });
    expect(violations,route+' mobile axe').toEqual([]);
   }
   rows.push({route,width,dimensions,violations});
   if([320,1440].includes(width)) await page.screenshot({path:path.join(output,`${name}-${width}.png`),fullPage:true,caret:'initial',style:'nextjs-portal{display:none!important}'});
  }
  expect(errors,'No hydration or uncaught browser errors').toEqual([]);
 } finally {
  await fs.writeFile(path.join(output,'result.json'),JSON.stringify({rows,errors},null,2));
  for(const context of [guest,customer,partner,admin])await context.close();
 }
});
