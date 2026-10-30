import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
// Only called by the disposable complete-chain PostgreSQL runner, never reads an env URL.
export async function providerControlChecks(db, checks) {
 const admin='ac000000-0000-4000-8000-000000000001', owner='ac000000-0000-4000-8000-000000000002', other='ac000000-0000-4000-8000-000000000003', pid='ac000000-0000-4000-8000-000000000004';
 const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
 const as=async(role,id='')=>{await db.query('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)",[id,role]);await db.query(`set role ${role}`);};
 const fails=async(sql,args,regex)=>{await db.query('savepoint expected_failure');try{await assert.rejects(db.query(sql,args),regex);}finally{await db.query('rollback to expected_failure');await db.query('release savepoint expected_failure');}};
 const directory=async()=>scalar("select admin_provider_directory('','all',1,20,$1)",[pid]);
 const current=async()=>((await directory()).rows[0]);
 const actionSql='select admin_provider_action($1,$2,$3,$4,$5,$6,$7,$8,$9)';
 const act=async(action,overrides={})=>{const row=await current();const args=[pid,action,'TEST isolated operation reason',row.version,randomUUID(),row.fingerprint,null,row.record_kind,{},...[]];for(const [key,value] of Object.entries(overrides))args[Number(key)]=value;return scalar(actionSql,args);};
 await db.query('begin');
 try {
  await db.query("insert into auth.users(id,email) values($1,'control-admin@example.invalid'),($2,'control-owner@example.invalid'),($3,'control-other@example.invalid')",[admin,owner,other]);
  await db.query("update profiles set role='admin' where id=$1",[admin]);
  const cat=await scalar('select id from service_categories where is_active order by id limit 1');
  const district=await scalar("insert into districts(name,slug) values('TEST Control İlçe','test-control-district') returning id");
  await db.query("insert into providers(id,user_id,name,phone,description,category_id,district_id,is_active,is_approved,profile_image_url) values($1,$2,'TEST Control Provider','+905550000001','TEST service provider with complete factual description.',$3,$4,true,true,'/test-image.png')",[pid,owner,cat,district]);
  const service=await scalar("insert into service_catalog(category_id,slug,name,description,scope,image_url,pricing_type) values($1,'test-control-service','TEST Service','TEST complete service description','TEST scope included','/test-service.png','FIXED_PRICE') returning id",[cat]);
  const verificationApp=await scalar("insert into provider_applications(user_id,full_name,phone,category_id,district_id,status,verification_document_path) values($1,'TEST Verified Owner','+905550000001',$2,$3,'approved',$4) returning id",[owner,cat,district,owner+'/provider-applications/verified.pdf']);
  await db.query("insert into storage.objects(bucket_id,name) values('provider-verification-documents',$1)",[owner+'/provider-applications/verified.pdf']);
  await as('authenticated',admin);
  let row=await current();
  await fails(actionSql,[pid,'approve_quality','TEST wrong fingerprint',row.version,randomUUID(),'0'.repeat(32),null,'real',{}],/profile_changed/);
  await act('approve_quality',{7:'real'});
  row=await current();assert.equal(row.published,true);
  const before=await scalar("select jsonb_build_object('active',is_active,'approved',is_approved,'owner',user_id) from providers where id=$1",[pid]);
  const requestId=randomUUID();const original=[pid,'unpublish','TEST withdraw public profile',row.version,requestId,row.fingerprint,null,'real',{}];
  const result=await scalar(actionSql,original);assert.equal(result.ok,true);assert.equal(result.published,false);
  assert.equal((await current()).status,'hidden');
  assert.deepEqual(await scalar("select jsonb_build_object('active',is_active,'approved',is_approved,'owner',user_id) from providers where id=$1",[pid]),before);
  const replay=await scalar(actionSql,original);assert.equal(replay.replayed,true);
  await fails(actionSql,[...original.slice(0,2),'TEST changed request payload',...original.slice(3)],/idempotency_conflict/);
  assert.equal(Number(await scalar("select count(*) from audit_logs where action='provider.control.unpublish' and entity_id=$1",[pid])),1);
  await fails(actionSql,[pid,'activate','TEST stale manager version',row.version,randomUUID(),row.fingerprint,null,'real',{}],/version_conflict/);
  await as('anon');
  assert.equal(Number(await scalar('select count(*) from providers where id=$1',[pid])),0);
  assert.equal((await scalar('select provider_publication_gate()')).some(p=>p.id===pid),false);
  await fails('select admin_provider_directory()',[],/permission denied|forbidden/);
  await as('authenticated',other);
  await fails(actionSql,original,/forbidden/);
  await fails('select provider_partner_readiness($1)',[pid],/forbidden/);
  await fails("update providers set is_approved=true where id=$1 returning id",[pid],/row-level security|permission denied/).catch(async e=>{if(e.code!=='ERR_ASSERTION')throw e;assert.equal((await db.query('update providers set is_approved=true where id=$1 returning id',[pid])).rowCount,0);});
  await fails('select * from admin_provider_action_receipts',[],/permission denied/);
  checks.push('Control: real unpublish transaction changes publication only, admin badge source hidden, anon list/detail row absent, public gate absent, one audit; nonadmin denied; replay deduplicated; stale admin version rejected');
  await as('authenticated',admin);
  await act('approve_quality',{7:'real'});assert.equal((await current()).published,true);
  await act('deactivate');row=await current();assert.equal(row.is_active,false);assert.equal(row.is_approved,true);assert.equal(row.published,false);
  await act('activate');assert.equal((await current()).is_active,true);
  await act('verify',{6:verificationApp});assert.equal((await current()).is_verified,true);assert.equal((await current()).published,true);
  await act('unverify');assert.equal((await current()).is_verified,false);assert.equal((await current()).published,true);
  await act('mark_test');row=await current();assert.equal(row.record_kind,'test');assert.equal(row.published,false);
  await act('mark_real');assert.equal((await current()).status,'pending_review');
  row=await current();
  await fails(actionSql,[pid,'verify','TEST cannot fabricate evidence',row.version,randomUUID(),row.fingerprint,null,'real',{}],/verification_evidence_required/);
  await act('changes_requested');assert.equal((await current()).status,'changes_requested');
  await act('pending_review');assert.equal((await current()).status,'pending_review');
  await act('approve');assert.equal((await current()).is_approved,true);
  await as('postgres');assert.equal(await scalar('select role from profiles where id=$1',[owner]),'provider');await as('authenticated',admin);
  const edited={name:'TEST Edited Provider',availability:'müsait',working_hours:'09:00-18:00',average_price_min:100,average_price_max:200,response_time_minutes:'30',identity_verified:false,phone_verified:false,is_verified:false};
  await act('edit_profile',{8:edited});assert.equal((await current()).name,edited.name);
  const detail=await scalar('select admin_provider_detail($1)',[pid]);assert.ok(detail.state.version);assert.ok(Array.isArray(detail.history));
  await as('postgres');
  await db.query("create function public.test_control_audit_failure() returns trigger language plpgsql as $$ begin if new.action='provider.control.deactivate' then raise exception 'TEST audit unavailable'; end if; return new; end $$");
  await db.query('create trigger test_control_audit_failure before insert on public.audit_logs for each row execute function public.test_control_audit_failure()');
  await as('authenticated',admin);row=await current();
  await fails(actionSql,[pid,'deactivate','TEST audit must roll back',row.version,randomUUID(),row.fingerprint,null,'real',{}],/TEST audit unavailable/);
  assert.equal((await current()).is_active,true);
  await as('postgres');await db.query('drop trigger test_control_audit_failure on public.audit_logs');
  checks.push('Control: republish, deactivate, activate, unverify, test/real classification, quality decisions, profile editing, evidence enforcement; audit insert failure rolls back provider and receipt');
  await as('authenticated',admin);
  const all=await scalar("select admin_provider_directory('Edited','all',1,1)");assert.equal(all.rows.length,1);assert.equal(all.total,1);
  const empty=await scalar("select admin_provider_directory('no such isolated provider','all',1,20)");assert.equal(empty.total,0);assert.deepEqual(empty.rows,[]);
  await fails("select admin_provider_directory('','all',1,1000)",[],/invalid_directory/);
  const missing='ac000000-0000-4000-8000-999999999999';row=await current();
  await fails(actionSql,[missing,'unpublish','TEST missing provider',row.version,randomUUID(),row.fingerprint,null,'real',{}],/provider_not_found/);
  await fails(actionSql,[pid,'not-an-action','TEST invalid action',row.version,randomUUID(),row.fingerprint,null,'real',{}],/invalid_action/);
  // Normal users cannot reset persistent counters. Exhaust the exact admin bucket.
  for(let n=0;n<31;n++)await scalar("select consume_user_rate_limit('admin:provider.control',30,60000)");
  assert.equal((await act('deactivate')).code,'rate_limited');
  await as('postgres');await db.query("delete from rate_limits where user_id=$1 and action='admin:provider.control'",[admin]);
  checks.push('Control: server pagination, literal search, empty result distinguished, invalid page size/provider/action, persistent rate limit');
  await as('authenticated',owner);
  await scalar('select partner_save_profile($1,$2,$3)',[pid,'TEST Owner Prepared','TEST owner writes a factual service description safely.']);
  await scalar('select commerce_save_store($1,$2,$3,$4)',[pid,JSON.stringify([{service_id:service,variant_id:null,price_minor:12000,duration_minutes:60,district_ids:[district],is_active:true,scope:'TEST owner-specific service scope'}]),JSON.stringify([{weekday:1,starts_at:'09:00',ends_at:'18:00'}]),'[]']);
  const readiness=await scalar('select provider_partner_readiness($1)',[pid]);assert.equal(readiness.service_count,1);assert.equal(readiness.calendar_days,1);assert.equal(readiness.published,false);assert.equal(readiness.identity_verified,false);
  await as('authenticated',admin);assert.equal((await scalar('select admin_provider_detail($1)',[pid])).services[0].scope,'TEST owner-specific service scope');await as('authenticated',owner);
  await as('authenticated',other);
  await fails('select commerce_save_store($1,$2,$3,$4)',[pid,'[]','[]','[]'],/forbidden/);
  await fails('select partner_save_profile($1,$2,$3)',[pid,'TEST Intruder','TEST intruder cannot change somebody else profile.'],/forbidden/);
  await as('authenticated',owner);
  await fails('select partner_attach_document($1,$2)',[randomUUID(),other+'/provider-applications/test.pdf'],/forbidden/);
  await fails('update providers set identity_verified=true where id=$1',[pid],/row-level security|permission denied|protected|provider_field_forbidden/);
  await fails('update profiles set role=\'admin\' where id=$1',[owner],/role|permission denied|forbidden/);
  await db.query('savepoint audit_mutation');try{const r=await db.query("update audit_logs set action='spoofed' where entity_id=$1",[pid]);assert.equal(r.rowCount,0);}catch(e){assert.equal(e.code,'42501');}finally{await db.query('rollback to audit_mutation');}
  checks.push('Partner: own profile/service price/scope/calendar persist and requeue publication; other owner/readiness/store denied; own identity/admin escalation and audit mutation denied; document path spoof rejected');
  await as('postgres');
  const application=await scalar("insert into provider_applications(user_id,full_name,phone,category_id,district_id,status) values($1,'TEST Document Owner','+905550000001',$2,$3,'approved') returning id",[owner,cat,district]);
  const objectPath=owner+'/provider-applications/isolated-test.pdf';
  await db.query("insert into storage.objects(bucket_id,name) values('provider-verification-documents',$1)",[objectPath]);
  await db.query('update providers set identity_verified=true,is_verified=true where id=$1',[pid]);
  await as('authenticated',owner);
  await scalar('select partner_attach_document($1,$2)',[application,objectPath]);
  const docReady=await scalar('select provider_partner_readiness($1)',[pid]);assert.equal(docReady.has_document,true);assert.equal(docReady.identity_verified,false);assert.equal(docReady.professional_verified,false);
  assert.equal(await scalar('select status from provider_applications where id=$1',[application]),'pending');
  await as('postgres');
  assert.equal(await scalar("select has_function_privilege('anon','public.admin_provider_action(uuid,text,text,text,uuid,text,text,text,jsonb)','execute')"),false);
  assert.equal(await scalar("select has_function_privilege('authenticated','public.admin_provider_action(uuid,text,text,text,uuid,text,text,text,jsonb)','execute')"),true);
  const missingRpc='select admin_provider_detail($1)';
  await db.query('savepoint missing_rpc');await db.query('drop function public.admin_provider_detail(uuid)');await fails(missingRpc,[pid],/does not exist/);await db.query('rollback to missing_rpc');
  checks.push('Partner: private document attachment persists, reopens application review, removes old identity/professional approval; explicit EXECUTE grants; actual missing RPC fails without fallback');
 } finally {await db.query('reset role');await db.query('rollback');await db.query("select set_config('request.jwt.claim.sub','',false)");}
}

export async function providerControlRace(db, checks) {
 const admin='af000000-0000-4000-8000-000000000001', pid='af000000-0000-4000-8000-000000000002';
 await db.query("insert into auth.users(id,email) values($1,'race-admin@example.invalid')",[admin]);await db.query("update profiles set role='admin' where id=$1",[admin]);
 await db.query("insert into providers(id,name,phone,description,category_id,district_id,is_active,is_approved) select $1,'TEST Concurrent Provider','+905550000002','TEST concurrency fixture service description.',c.id,d.id,true,true from service_categories c cross join districts d where c.is_active and d.is_active limit 1",[pid]);
 const make=()=>new db.constructor({host:'127.0.0.1',port:db.connectionParameters.port,user:'postgres',database:'postgres',password:'isolated-local-only',connectionTimeoutMillis:3000});
 const clients=[make(),make()];
 try {
  for(const c of clients){await c.connect();await c.query("select set_config('request.jwt.claim.sub',$1,false)",[admin]);await c.query('set role authenticated');}
  const state=async()=>((await clients[0].query("select admin_provider_directory('','all',1,20,$1) value",[pid])).rows[0].value.rows[0]);
  let row=await state();
  const sql="select admin_provider_action($1,$2,'TEST concurrent admin decision',$3,$4) value";
  const results=await Promise.allSettled(clients.map((c,i)=>c.query(sql,[pid,i?'deactivate':'unpublish',row.version,randomUUID()])));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected'&&r.reason.code==='40001').length,1);
  row=await state();const req=randomUUID();const args=[pid,'activate',row.version,req];
  const replay=await Promise.all(clients.map(c=>c.query(sql,args)));assert.equal(replay.filter(r=>r.rows[0].value.replayed).length,1);
  const count=(await db.query("select count(*)::int n from audit_logs where action='provider.control.activate' and entity_id=$1",[pid])).rows[0].n;assert.equal(count,1);
  checks.push('Control concurrency: two actual PostgreSQL sessions with the same version allow one decision and reject one conflict; simultaneous identical request creates one audit and one receipt');
 } finally {await Promise.all(clients.map(c=>c.end().catch(()=>{})));}
}
