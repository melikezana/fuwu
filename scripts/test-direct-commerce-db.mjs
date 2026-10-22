import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync, spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import net from "node:net";
import crypto from "node:crypto";

// A disposable local PostgreSQL cluster. No project environment file or remote URL is read.
const runtime = path.resolve("artifacts/commerce-test-runtime");
const requireTest = createRequire(path.join(runtime, "package.json"));
const { initdb, postgres, pg_ctl } = requireTest("@embedded-postgres/windows-x64");
const { Client } = requireTest("pg");
const dataDir = path.join(runtime, `db-${Date.now()}`);
assert.ok(dataDir.startsWith(runtime + path.sep));
const report = { engine: "PostgreSQL, independent TCP sessions", checks: [], failed: null };
let server;
const clients = [];
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const pid = n => `30000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const district = "20000000-0000-4000-8000-000000000001";
const otherDistrict = "20000000-0000-4000-8000-000000000002";
const out = path.resolve("artifacts/direct-commerce"); await fs.mkdir(out, { recursive: true });
const listener = net.createServer(); await new Promise(r => listener.listen(0,"127.0.0.1",r));
const port = listener.address().port; await new Promise(r => listener.close(r));
async function client(role = "postgres", user = "") {
  const c = new Client({ host: "127.0.0.1", port, database: "postgres", user: "postgres" }); await c.connect(); clients.push(c);
  if (role !== "postgres") await c.query(`set role ${role}`);
  await c.query("select set_config('request.jwt.claim.sub',$1,false)",[user]); return c;
}
async function scalar(c,sql,args=[]) { const r=await c.query(sql,args); return Object.values(r.rows[0] ?? {})[0]; }
async function check(name,fn) { await fn(); report.checks.push(name); console.log(`PASS ${name}`); }
let root;
try {
  console.log("Initializing isolated PostgreSQL test cluster...");
  execFileSync(initdb,["-D",dataDir,"-U","postgres","-A","trust","--encoding=UTF8","--locale=C"],{ windowsHide:true,stdio:"pipe" });
  const log = await fs.open(path.join(dataDir,"server.log"),"a");
  server = spawn(postgres,["-D",dataDir,"-h","127.0.0.1","-p",String(port),"-F"],{ windowsHide:true,stdio:["ignore",log.fd,log.fd] });
  for(let i=0;i<60;i++){try{root=await client();break;}catch{await delay(200);}}
  assert.ok(root,"Local PostgreSQL must start");
  await root.query(await fs.readFile("e2e/fixtures/commerce-base.sql","utf8"));
  await root.query(await fs.readFile("supabase/migrations/20261021000100_direct_service_commerce.sql","utf8"));
  const a=await client("authenticated",uid(1)), b=await client("authenticated",uid(2)), p=await client("authenticated",uid(3)), p2=await client("authenticated",uid(4)), admin=await client("authenticated",uid(5)), service=await client("service_role"), guest=await client("anon");
  const serviceId = await scalar(root,"select id from service_catalog where slug='musluk-montaji'");
  const climateId = await scalar(root,"select id from service_catalog where slug='klima-bakimi'");
  const variant = await scalar(root,"select id from service_variants where service_id=$1 order by name limit 1",[climateId]);
  const hours = JSON.stringify(Array.from({length:7},(_,weekday)=>({weekday,starts_at:"09:00",ends_at:"18:00"})));
  const save = (c,provider,rows,off=[])=>c.query("select commerce_save_store($1,$2::jsonb,$3::jsonb,$4::jsonb)",[provider,JSON.stringify(rows),hours,JSON.stringify(off)]);
  const offering = {service_id:serviceId,variant_id:null,price_minor:85000,duration_minutes:60,district_ids:[district],is_active:true};
  await check("Catalog has product definitions and no invented provider offerings",async()=>{assert.equal(await scalar(root,"select count(*)::int from service_catalog"),4);assert.deepEqual(await scalar(guest,"select commerce_offers()"),[]);});
  await check("Only store owner can change offerings, including ownerless profile",async()=>{await assert.rejects(save(a,pid(1),[offering]),/forbidden/);await assert.rejects(save(a,pid(3),[offering]),/forbidden/);});
  await save(p,pid(1),[offering]);
  await save(p2,pid(2),[{...offering,service_id:climateId,variant_id:variant,price_minor:120000,duration_minutes:90}]);
  await check("Variant must belong to the offered service",async()=>{await assert.rejects(save(p,pid(1),[{...offering,variant_id:variant}]),/invalid_service_variant/);});
  const fid=await scalar(root,"select id from provider_service_offerings where provider_id=$1",[pid(1)]);
  const day=await scalar(root,"select ((now() at time zone 'Europe/Istanbul')::date+2)::text");
  const day2=await scalar(root,"select ($1::date+1)::text",[day]);
  const slots=async(c,f=fid,d=day,area=district)=>(await c.query("select * from commerce_slots($1,$2,$3)",[f,d,area])).rows;
  let available=await slots(guest);const start=available[0].starts_at;const later=available[1].starts_at;
  const hold=(c,s=start,expected=85000,key=crypto.randomUUID())=>scalar(c,"select commerce_hold_order($1,$2,$3,$4,$5,$6)",[fid,s,district,"TEST Mahallesi Test Sokak No 10 Daire 1",key,expected]);
  await check("Slots use Istanbul timezone, service duration and weekly hours",async()=>{assert.equal(available.length,33);assert.equal(new Date(start).getUTCHours(),6);assert.equal(new Date(available[0].ends_at)-new Date(start),3600000);});
  await check("Wrong service region and past day expose no slots",async()=>{assert.equal((await slots(guest,fid,day,otherDistrict)).length,0);assert.equal((await slots(guest,fid,'2020-01-01')).length,0);});
  await check("Time off closes all slots",async()=>{await save(p,pid(1),[offering],[day]);assert.equal((await slots(guest)).length,0);await save(p,pid(1),[offering]);});
  await check("Inactive and unapproved providers cannot be purchased",async()=>{for(const column of ['is_active','is_approved']){await root.query(`update providers set ${column}=false where id=$1`,[pid(1)]);assert.equal((await slots(guest)).length,0);await assert.rejects(hold(a),/slot_unavailable/);await root.query(`update providers set ${column}=true where id=$1`,[pid(1)]);}});
  await check("Client price manipulation rejected before reservation",async()=>{await assert.rejects(hold(a,start,1),/price_changed/);assert.equal(await scalar(root,"select count(*)::int from orders"),0);});
  let winner,winningClient,losingClient;
  await check("Two separate concurrent transactions: exactly one can reserve the same slot",async()=>{const attempts=await Promise.allSettled([hold(a),hold(b)]);assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);const idx=attempts.findIndex(r=>r.status==='fulfilled');winner=attempts[idx].value;winningClient=idx===0?a:b;losingClient=idx===0?b:a;assert.match(attempts[1-idx].reason.message,/slot_unavailable/);});
  await check("Overlapping start times blocked, adjacent appointment stays available",async()=>{await assert.rejects(hold(losingClient,later),/slot_unavailable/);const rest=await slots(guest);assert.ok(rest.some(s=>new Date(s.starts_at).getTime()===new Date(start).getTime()+3600000));});
  await check("10 percent commission stored separately in minor units",async()=>{assert.equal(winner.total_minor,85000);assert.equal(winner.commission_minor,8500);assert.equal(winner.provider_gross_minor,76500);assert.equal(winner.processor_fee_minor,null);});
  await check("Legacy assignment cannot bypass a held commerce slot",async()=>{await assert.rejects(root.query("insert into service_requests(assigned_provider_id,status,preferred_date) values($1,'assigned',$2)",[pid(1),day]),/commerce_booking_conflict/);});
  await check("Legacy reservation blocks its full day until duration is reconciled",async()=>{await root.query("insert into service_requests(assigned_provider_id,status,preferred_date) values($1,'assigned',$2)",[pid(1),day2]);assert.equal((await slots(guest,fid,day2)).length,0);});
  await check("RLS isolates customer, assigned provider, other provider and admin",async()=>{assert.equal(await scalar(losingClient,"select count(*)::int from orders where id=$1",[winner.id]),0);assert.equal(await scalar(p,"select count(*)::int from orders where id=$1",[winner.id]),1);assert.equal(await scalar(p2,"select count(*)::int from orders where id=$1",[winner.id]),0);assert.equal(await scalar(admin,"select count(*)::int from orders where id=$1",[winner.id]),1);assert.equal(await scalar(p,"select count(*)::int from order_completion_codes where order_id=$1",[winner.id]),0);assert.equal(await scalar(winningClient,"select count(*)::int from order_completion_codes where order_id=$1",[winner.id]),1);await assert.rejects(winningClient.query("update orders set total_minor=1 where id=$1",[winner.id]),/permission denied/);await assert.rejects(winningClient.query("select commerce_resolve_payment($1,null,'spoof',true)",[winner.id]),/permission denied/);});
  await check("Payment session has a single initializer and no public token access",async()=>{const first=await scalar(service,"select commerce_begin_payment($1)",[winner.id]);const second=await scalar(service,"select commerce_begin_payment($1)",[winner.id]);assert.equal(first.claimed,true);assert.equal(second.claimed,false);assert.equal(await scalar(winningClient,"select count(*)::int from payment_transactions"),0);await service.query("select commerce_attach_payment($1,'token-success','https://sandbox-cpp.iyzipay.com/test')",[winner.id]);});
  await check("Verified payment confirms once and duplicate callback is idempotent",async()=>{assert.equal(await scalar(service,"select commerce_resolve_payment($1,'token-success','test-payment-1',true,250,'test-item-1')",[winner.id]),'CONFIRMED');const count=await scalar(root,"select count(*)::int from order_status_events where order_id=$1",[winner.id]);await service.query("select commerce_resolve_payment($1,'token-success','test-payment-1',true,250,'test-item-1')",[winner.id]);assert.equal(await scalar(root,"select count(*)::int from order_status_events where order_id=$1",[winner.id]),count);await service.query("select commerce_resolve_payment($1,'token-success',null,false)",[winner.id]);assert.equal(await scalar(root,"select status from orders where id=$1",[winner.id]),'CONFIRMED');});
  await check("Only assigned provider advances paid order, completion requires customer code",async()=>{await assert.rejects(winningClient.query("select commerce_transition_order($1,'PROVIDER_ON_THE_WAY')",[winner.id]),/transition_forbidden/);await p.query("select commerce_transition_order($1,'PROVIDER_ON_THE_WAY')",[winner.id]);await p.query("select commerce_transition_order($1,'IN_PROGRESS')",[winner.id]);assert.equal((await scalar(p,"select commerce_transition_order($1,'COMPLETED','000000')",[winner.id])).error,'invalid_completion_code');const code=await scalar(winningClient,"select code from order_completion_codes where order_id=$1",[winner.id]);await p.query("select commerce_transition_order($1,'COMPLETED',$2)",[winner.id,code]);assert.equal(await scalar(root,"select status from orders where id=$1",[winner.id]),'COMPLETED');});
  await check("Only completed order owner can review; real rating aggregated",async()=>{await assert.rejects(losingClient.query("select commerce_submit_review($1,5::smallint,'TEST review text')",[winner.id]),/review_not_eligible/);await winningClient.query("select commerce_submit_review($1,5::smallint,'TEST gerçek hizmet değerlendirmesi')",[winner.id]);assert.equal(Number(await scalar(root,"select rating from providers where id=$1",[pid(1)])),5);await assert.rejects(winningClient.query("select commerce_submit_review($1,5::smallint,'TEST repeated review')",[winner.id]),/duplicate key/);});
  await check("Completion payout has one durable external-operation claim",async()=>{const first=await scalar(service,"select commerce_claim_settlement($1,'release')",[winner.id]);assert.equal(first.claimed,true);assert.equal((await scalar(service,"select commerce_claim_settlement($1,'release')",[winner.id])).claimed,false);await service.query("select commerce_finish_settlement($1,'release')",[winner.id]);assert.equal(await scalar(root,"select payout_state from payment_transactions where order_id=$1",[winner.id]),'RELEASED');});
  const pending=await hold(a,new Date(new Date(start).getTime()+2*3600000));
  await check("Hold idempotency returns the same order without extending expiry",async()=>{const again=await hold(a,pending.starts_at,85000,pending.idempotency_key);assert.equal(again.id,pending.id);assert.equal(again.expires_at,pending.expires_at);});
  await service.query("select commerce_begin_payment($1)",[pending.id]);await service.query("select commerce_attach_payment($1,'token-late','https://sandbox-cpp.iyzipay.com/test')",[pending.id]);
  await check("Expired holds immediately stop blocking, before cron cleanup",async()=>{await root.query("update orders set expires_at=now()-interval '1 minute' where id=$1",[pending.id]);assert.ok((await slots(guest)).some(s=>new Date(s.starts_at).getTime()===Date.parse(pending.starts_at)));});
  const replacement=await hold(b,pending.starts_at);
  await check("Late paid callback becomes REFUND_PENDING and never steals a rebooked slot",async()=>{assert.equal(await scalar(service,"select commerce_resolve_payment($1,'token-late','test-late-payment',true,null,'test-item-late')",[pending.id]),'REFUND_PENDING');assert.equal(await scalar(root,"select status from orders where id=$1",[replacement.id]),'PENDING_PAYMENT');});
  await check("Refund is only final after verified processor completion and cannot be claimed twice",async()=>{assert.equal((await scalar(service,"select commerce_claim_settlement($1,'refund')",[pending.id])).claimed,true);assert.equal((await scalar(service,"select commerce_claim_settlement($1,'refund')",[pending.id])).claimed,false);assert.equal(await scalar(root,"select status from orders where id=$1",[pending.id]),'REFUND_PENDING');await service.query("select commerce_finish_settlement($1,'refund')",[pending.id]);assert.equal(await scalar(root,"select status from orders where id=$1",[pending.id]),'REFUNDED');});
  await check("Failed payment releases the slot",async()=>{await service.query("select commerce_begin_payment($1)",[replacement.id]);await service.query("select commerce_attach_payment($1,'token-fail','https://sandbox-cpp.iyzipay.com/test')",[replacement.id]);await service.query("select commerce_resolve_payment($1,'token-fail',null,false)",[replacement.id]);assert.equal(await scalar(root,"select status from orders where id=$1",[replacement.id]),'PAYMENT_FAILED');assert.ok((await slots(guest)).some(s=>Date.parse(s.starts_at)===Date.parse(replacement.starts_at)));});
  await check("Expiry cleanup is restricted and idempotent",async()=>{const expiring=await hold(a,new Date(new Date(start).getTime()+4*3600000));await root.query("update orders set expires_at=now()-interval '1 minute' where id=$1",[expiring.id]);await assert.rejects(a.query("select commerce_expire_holds()"),/permission denied/);assert.equal(await scalar(service,"select commerce_expire_holds()"),1);assert.equal(await scalar(service,"select commerce_expire_holds()"),0);});
  console.log(`${report.checks.length} database checks passed.`);
} catch(error){report.failed=String(error?.stack||error);console.error(report.failed);process.exitCode=1;}
finally {for(const c of clients)await c.end().catch(()=>{});if(server){try{execFileSync(pg_ctl,["-D",dataDir,"-m","fast","-w","stop"],{windowsHide:true,stdio:"pipe"});}catch{server.kill();}}await fs.writeFile(path.join(out,"database-tests.json"),JSON.stringify(report,null,2));}
