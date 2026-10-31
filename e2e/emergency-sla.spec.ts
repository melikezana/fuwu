import {expect,test,type APIRequestContext} from './fixtures';
import {createTestProvider,ensureTestUserRole,getTestAdminClient,loginWithEmailMagicLink,skipUnlessLocalSupabase,uniqueE2EEmail} from './helpers';

async function fixture(size:number) {
 const db=getTestAdminClient(), categoryId=crypto.randomUUID();
 const category=await db.from('service_categories').insert({id:categoryId,name:'E2E SLA '+categoryId,slug:'e2e-sla-'+categoryId,is_active:true,is_visible:false});expect(category.error).toBeNull();
 const providers=[];
 for(let i=0;i<size;i++){const email=uniqueE2EEmail('sla-provider');const owner=await ensureTestUserRole(email,'provider');providers.push({...await createTestProvider(owner,{categoryId}),email});}
 const customer=await ensureTestUserRole(uniqueE2EEmail('sla-customer'),'customer'), id=crypto.randomUUID(), p=providers[0];
 const row=await db.from('service_requests').insert({id,user_id:customer,category_id:categoryId,district_id:p.district_id,assigned_provider_id:p.id,address:'E2E dedicated synthetic SLA address',description:'E2E isolated historical emergency request',status:'assigned',urgency:'urgent',urgency_type:'emergency',emergency_status:'assigned',assigned_at:new Date().toISOString(),budget_tag:'acil-hizmet',payment_preference:'cash',confirmation_code:'123456',offered_price:1500});expect(row.error).toBeNull();
 return {db,id,providers};
}
async function breach(f:Awaited<ReturnType<typeof fixture>>) {const r=await f.db.from('service_requests').update({assigned_at:new Date(Date.now()-6*60000).toISOString()}).eq('id',f.id);expect(r.error).toBeNull();}
async function sweep(request:APIRequestContext,id:string) {
 expect(process.env.CRON_SECRET,'Dedicated local cron fixture secret required').toMatch(/^e2e-/);
 const r=await request.get('/api/cron/emergency-sla-sweep',{headers:{authorization:'Bearer '+process.env.CRON_SECRET}});expect(r.ok()).toBe(true);
 const body=await r.json(), result=body.processed?.find((r:{requestId:string})=>r.requestId===id);expect(result).toBeTruthy();return result;
}
async function cleanup(f:Awaited<ReturnType<typeof fixture>>) {
 // Exact newly generated request only. Audit and provider identities survive until owned stack teardown.
 for(const table of ['notifications','request_reassignment_log']){const r=await f.db.from(table).delete().eq('request_id',f.id);expect(r.error).toBeNull();}
 const r=await f.db.from('service_requests').delete().eq('id',f.id);expect(r.error).toBeNull();
}
test.describe('emergency response SLA',()=>{
 test.beforeEach(()=>skipUnlessLocalSupabase());
 test('provider sees countdown and admin sees breached SLA',async({browser})=>{
  const f=await fixture(1), providerContext=await browser.newContext(),adminContext=await browser.newContext();
  try {
   const p=await providerContext.newPage();await loginWithEmailMagicLink(p,{email:f.providers[0].email,role:'provider',nextPath:'/provider-dashboard/requests'});
   const card=p.locator('article').filter({hasText:f.id});const countdown=card.getByRole('status',{name:/SLA yanıt süresi kaldı/});await expect(countdown).toBeVisible();await expect(countdown).toContainText(/\d{2}:\d{2}/);
   await breach(f);const a=await adminContext.newPage();await loginWithEmailMagicLink(a,{email:uniqueE2EEmail('sla-admin'),role:'admin',nextPath:'/admin?legacy=1#legacy-operations'});
   await expect(a.getByText('SLA aşıldı',{exact:true}).first()).toBeVisible();
  } finally {await providerContext.close();await adminContext.close();await cleanup(f);}
 });
 test('cron reassigns breached emergency request and records live notifications',async({request,browser})=>{
  const f=await fixture(2),context=await browser.newContext();try {
   const page=await context.newPage();let subscribed=false,received=false;
   page.on('websocket',socket=>{
    if(!socket.url().includes('/realtime/v1'))return;
    socket.on('framereceived',frame=>{try {
     const message=JSON.parse(String(frame.payload)),event=Array.isArray(message)?message[3]:message.event,payload=Array.isArray(message)?message[4]:message.payload;
     if(event==='phx_reply'&&payload?.status==='ok'&&payload.response?.postgres_changes?.some((change:{table:string})=>change.table==='notifications'))subscribed=true;
     if(event==='postgres_changes'&&payload?.data?.table==='notifications'&&payload.data.record?.request_id===f.id&&payload.data.record?.recipient_user_id===f.providers[1].user_id)received=true;
    }catch{/* Ignore protocol heartbeats without JSON payloads. */}});
   });
   await loginWithEmailMagicLink(page,{email:f.providers[1].email,role:'provider',nextPath:'/provider-dashboard/requests'});
   await expect.poll(()=>subscribed,{message:'Real notification channel subscribes before dispatch',timeout:15_000}).toBe(true);
   await breach(f);const result=await sweep(request,f.id);expect(result).toMatchObject({action:'reassigned',previousProviderId:f.providers[0].id,candidateProviderId:f.providers[1].id,reason:'sla_breach_reassigned'});
   const row=await f.db.from('service_requests').select('assigned_provider_id,status').eq('id',f.id).single();expect(row.error).toBeNull();expect(row.data).toMatchObject({assigned_provider_id:f.providers[1].id,status:'assigned'});
   const logs=await f.db.from('request_reassignment_log').select('is_dry_run,reason').eq('request_id',f.id);expect(logs.error).toBeNull();expect(logs.data).toContainEqual({is_dry_run:false,reason:'sla_breach_reassigned'});
   const notifications=await f.db.from('notifications').select('id').eq('request_id',f.id).eq('recipient_user_id',f.providers[1].user_id);expect(notifications.error).toBeNull();expect(notifications.data?.length).toBeGreaterThan(0);
   await expect.poll(()=>received,{message:'Actual Realtime INSERT is delivered to the assigned provider',timeout:15_000}).toBe(true);
   await page.getByRole('button',{name:/okunmamış bildirim/i}).click();await expect(page.getByRole('dialog',{name:'Bildirimler'}).getByRole('button',{name:/Yeni acil hizmet talebi/})).toBeVisible();
  } finally {await context.close();await cleanup(f);}
 });
 test('cron stops auto reassignment after three SLA breaches and escalates to admin',async({request})=>{
  const f=await fixture(4);try {
   const assigned=[f.providers[0].id];for(let i=0;i<3;i++){await breach(f);const result=await sweep(request,f.id);expect(result).toMatchObject({action:'reassigned',previousProviderId:assigned.at(-1),reassignmentCountBefore:i});expect(assigned).not.toContain(result.candidateProviderId);assigned.push(result.candidateProviderId);}
   await breach(f);expect(await sweep(request,f.id)).toMatchObject({action:'escalated',reason:'max_reassignment_limit_reached',reassignmentCountBefore:3});
   const logs=await f.db.from('request_reassignment_log').select('reason').eq('request_id',f.id);expect(logs.error).toBeNull();expect(logs.data?.filter(r=>r.reason==='sla_breach_reassigned')).toHaveLength(3);
  } finally {await cleanup(f);}
 });
});
