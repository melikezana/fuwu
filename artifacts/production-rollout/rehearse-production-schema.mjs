import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { postgresRuntime } from '../../scripts/testing/postgres.mjs';
import { sourceHash, writeArtifactFile } from '../../scripts/testing/evidence.mjs';
import { legacySnapshot, verifyLegacyPreservation } from '../../scripts/testing/legacy-preservation.mjs';
import { securitySchemaChecks } from '../../scripts/security-schema-checks.mjs';
import { prelaunchChecks } from '../../scripts/prelaunch-db-checks.mjs';
import { providerControlChecks, providerControlRace } from '../../scripts/provider-control-db-checks.mjs';
import { trustChecks } from '../../scripts/trust-db-checks.mjs';

// Only metadata is read from production exports. No env files, credentials,
// remote SQL connections or production records are loaded by this rehearsal.
const output=path.resolve('artifacts/production-rollout');
const metadata=JSON.parse(await fs.readFile('artifacts/prelaunch/private/rollout-20261031/production-metadata.json','utf8'));
const ddl=await fs.readFile('artifacts/prelaunch/private/rollout-20261031/public-schema.sql','utf8');
assert.ok(ddl.length>1000,'Complete schema-only dump required');
assert.ok(!/^\s*(COPY\s+(?:"public"|public)\.|INSERT INTO\s+(?:"public"|public)\.)/m.test(ddl),'No production data statements');
const report={startedAt:new Date().toISOString(),sourceHash:sourceHash(),status:'FAIL',scope:'Fresh production public schema-only pg_dump restored on disposable PostgreSQL 17; platform Auth/Storage DDL shim and synthetic records only. Not a production data backup/restore or Google OAuth test.',schemaSha256:createHash('sha256').update(ddl).digest('hex'),version:null,checks:[],migrations:[],failure:null};
const {initdb,postgres,pg_ctl,Client}=postgresRuntime();
const runtime=path.resolve('artifacts/commerce-test-runtime');
const data=path.join(runtime,`production-schema-${Date.now()}`);
const listener=net.createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));
const port=listener.address().port;await new Promise(r=>listener.close(r));
const quote=s=>'"'+s.replaceAll('"','""')+'"';
const normalize=s=>s?.replaceAll('\r','').replace(/\s+/g,' ').trim();
let db,server;
try {
 execFileSync(initdb,['-D',data,'-U','postgres','-A','trust','--encoding=UTF8','--locale=C'],{windowsHide:true,stdio:'pipe'});
 const log=await fs.open(path.join(data,'server.log'),'a');
 server=spawn(postgres,['-D',data,'-h','127.0.0.1','-p',String(port),'-F','-c','unix_socket_directories=','-c','wal_level=logical'],{windowsHide:true,stdio:['ignore',log.fd,log.fd]});
 for(let i=0;i<150;i++){const c=new Client({host:'127.0.0.1',port,user:'postgres',database:'postgres',connectionTimeoutMillis:1000});try{await c.connect();db=c;break;}catch{await c.end().catch(()=>{});await delay(200);}}
 assert.ok(db,'Owned loopback PostgreSQL must start');
 report.version=(await db.query('select version() v')).rows[0].v;
 assert.match(report.version,/PostgreSQL 17\./);
 await db.query(await fs.readFile('e2e/fixtures/supabase-platform.sql','utf8'));
 // public-only pg_dump excludes the extension installed in Supabase's
 // extensions schema. The same platform prerequisite must exist on restore.
 await db.query('create extension pgcrypto with schema extensions');
 await db.query(ddl);
 // pg_dump temporarily disables row_security and function-body validation;
 // restore normal execution before exercising any browser-role policies.
 await db.query('set search_path=public,pg_catalog; set row_security=on; set check_function_bodies=on');
 const columns=(await db.query("select c.relname as table,a.attname as name,format_type(a.atttypid,a.atttypmod) type,not a.attnotnull nullable,pg_get_expr(d.adbin,d.adrelid) as default from pg_attribute a join pg_class c on c.oid=a.attrelid left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where c.relnamespace='public'::regnamespace and c.relkind='r' and a.attnum>0 and not a.attisdropped")).rows;
 for(const expected of metadata.columns){const actual=columns.find(c=>c.table===expected.table&&c.name===expected.name);assert.ok(actual,`${expected.table}.${expected.name} restored`);for(const key of ['type','nullable','default'])assert.equal(normalize(String(actual[key])),normalize(String(expected[key])),`${expected.table}.${expected.name} ${key}`);}
 assert.equal(columns.length,metadata.columns.length);
 const constraints=(await db.query("select c.relname as table,k.conname name,pg_get_constraintdef(k.oid) definition from pg_constraint k join pg_class c on c.oid=k.conrelid where c.relnamespace='public'::regnamespace")).rows;
 for(const expected of metadata.constraints){const actual=constraints.find(c=>c.table===expected.table&&c.name===expected.name);assert.equal(normalize(actual?.definition),normalize(expected.definition),`${expected.table}.${expected.name}`);}
 assert.equal(constraints.length,metadata.constraints.length);
 const indexes=(await db.query("select tablename,indexname,indexdef from pg_indexes where schemaname='public'")).rows;
 for(const expected of metadata.indexes)assert.equal(normalize(indexes.find(i=>i.indexname===expected.indexname)?.indexdef),normalize(expected.indexdef),expected.indexname);
 assert.equal(indexes.length,metadata.indexes.length);
 const functions=(await db.query("select proname name,pg_get_function_identity_arguments(oid) args,pg_get_functiondef(oid) definition from pg_proc where pronamespace='public'::regnamespace and prokind='f'")).rows;
 for(const expected of metadata.functions)assert.equal(normalize(functions.find(f=>f.name===expected.name&&f.args===expected.identityArguments)?.definition),normalize(expected.definition),expected.name);
 report.checks.push(`Restored all ${columns.length} original columns/types/nullability/defaults, ${constraints.length} constraints, ${indexes.length} indexes and ${functions.length} RPC/trigger function definitions from fresh production schema metadata`);
 for(const trigger of metadata.triggers.filter(t=>t.schema==='auth'))await db.query(trigger.definition);
 for(const policy of metadata.policies.filter(p=>p.schemaname==='storage')){
  const roles=policy.roles.map(r=>r==='public'?'public':quote(r)).join(',');
  await db.query(`create policy ${quote(policy.policyname)} on storage.${quote(policy.tablename)} as ${policy.permissive} for ${policy.cmd} to ${roles}${policy.qual?' using ('+policy.qual+')':''}${policy.with_check?' with check ('+policy.with_check+')':''}`);
 }
 for(const b of metadata.buckets)await db.query('insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values($1,$1,$2,$3,$4)',[b.id,b.public,b.fileSizeLimit,b.allowedMimeTypes]);
 const activeSlugs=metadata.categories.filter(c=>c.is_active).map(c=>c.slug);
 assert.equal(activeSlugs.length,11);
 for(const slug of activeSlugs)await db.query('insert into service_categories(name,slug,is_active) values($1,$2,true)',['Synthetic '+slug,slug]);
 await db.query("insert into districts(name,slug) values('Synthetic District','test-schema-rehearsal')");
 await db.query(await fs.readFile('e2e/fixtures/provider-production-upgrade.sql','utf8'));
 await db.query(await fs.readFile('e2e/fixtures/legacy-production-data.sql','utf8'));
 const before=await legacySnapshot(db);
 const originalColumns=(await db.query("select c.relname,a.attname,format_type(a.atttypid,a.atttypmod) type,a.attnotnull,pg_get_expr(d.adbin,d.adrelid) default_expr from pg_class c join pg_attribute a on a.attrelid=c.oid left join pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum where c.oid=any($1::regclass[]) and a.attnum>0 and not a.attisdropped order by c.relname,a.attname",[['public.orders','public.order_payments','public.payouts','public.disputes','public.webhook_events']])).rows;
 await db.query("select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000001',false)");
 await db.query('set role authenticated');
 assert.equal((await db.query('select iyzico_token from order_payments')).rows[0].iyzico_token,'TEST-synthetic-legacy-token');
 await db.query('reset role');
 report.checks.push('Actual production table ACL + customer policy reproduces synthetic legacy token exposure before pending guard');
 const applied=new Set(metadata.appliedMigrations.map(m=>m.version));
 const pending=(await fs.readdir('supabase/migrations')).filter(f=>/^\d{14}_.*\.sql$/.test(f)&&!applied.has(f.split('_')[0])).sort();
 assert.equal(pending.length,26);
 for(const file of pending){report.currentMigration=file;await db.query(await fs.readFile(path.join('supabase/migrations',file),'utf8'));report.migrations.push(file);}
 await verifyLegacyPreservation(db,before,report.checks);
 const afterColumns=(await db.query("select c.relname,a.attname,format_type(a.atttypid,a.atttypmod) type,a.attnotnull,pg_get_expr(d.adbin,d.adrelid) default_expr from pg_class c join pg_attribute a on a.attrelid=c.oid left join pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum where c.oid=any($1::regclass[]) and a.attnum>0 and not a.attisdropped order by c.relname,a.attname",[['public.orders','public.order_payments','public.payouts','public.disputes','public.webhook_events']])).rows;
 assert.deepEqual(afterColumns,originalColumns,'All legacy financial column types, nullability and defaults preserved');
 report.checks.push('All original legacy financial column contracts remain byte-for-byte after all 26 pending migrations');
 // Inspect migration output before fault-injection checks create test helpers.
 const final=(await db.query("select jsonb_build_object('tables',(select jsonb_agg(jsonb_build_object('name',c.relname,'rls',c.relrowsecurity) order by c.relname) from pg_class c where c.relnamespace='public'::regnamespace and c.relkind='r'),'functions',(select count(*) from pg_proc where pronamespace='public'::regnamespace and prokind='f'),'policies',(select count(*) from pg_policies where schemaname='public'),'mutableSearchPaths',(select jsonb_agg(proname) from pg_proc where pronamespace='public'::regnamespace and prokind='f' and not exists(select 1 from unnest(proconfig) x where x like 'search_path=%'))) catalog")).rows[0].catalog;
 assert.ok(final.tables.every(t=>t.rls),'Every public table has RLS under actual production default grants');
 assert.equal(final.mutableSearchPaths,null,'No mutable public function search_path remains');
 report.finalCatalog=final;
 await securitySchemaChecks(db,report.checks);
 await prelaunchChecks(db,report.checks);
 await providerControlChecks(db,report.checks);
 await providerControlRace(db,report.checks);
 await trustChecks(db,report.checks);
 report.status='PASS';
}catch(error){report.failure={code:error.code??null,message:error.message,where:error.where,detail:error.detail,stack:error.stack};process.exitCode=1;}
finally{await db?.end().catch(()=>{});if(server){try{execFileSync(pg_ctl,['-D',data,'-m','fast','-w','stop'],{windowsHide:true,stdio:'pipe'});}catch{server.kill();}}report.completedAt=new Date().toISOString();writeArtifactFile(path.join(output,'schema-rehearsal.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,migrations:report.migrations.length,checks:report.checks.length,failure:report.failure}));}
