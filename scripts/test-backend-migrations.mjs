import fs from "node:fs/promises";
import path from "node:path";
import { postgresRuntime } from "./testing/postgres.mjs";
import { execFileSync, spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import net from "node:net";
import assert from "node:assert/strict";
import { securitySchemaChecks } from "./security-schema-checks.mjs";
import { prelaunchChecks } from "./prelaunch-db-checks.mjs";

// No env file or remote URL is read. Bind only loopback, always stop our own cluster.
const runtime = path.resolve("artifacts/commerce-test-runtime");
await fs.mkdir(runtime, { recursive: true });
const { initdb, postgres, pg_ctl, Client } = postgresRuntime();
const data = path.join(runtime, `reliability-${Date.now()}`);
const output = path.resolve(process.env.MIGRATION_OUTPUT_DIR || "artifacts/backend-reliability");
await fs.mkdir(output, { recursive: true });
const listener = net.createServer(); await new Promise(r => listener.listen(0,"127.0.0.1",r));
const port = listener.address().port; await new Promise(r => listener.close(r));
const upgrade = process.argv.includes("--upgrade");
const report = { scope: "All repository migrations on disposable PostgreSQL; platform DDL shim, not hosted staging/Auth/Storage E2E", scenario: upgrade ? "populated_upgrade" : "clean_install", version: null, migrations: [], checks: [], failure: null };
let server, db;
try {
  execFileSync(initdb,["-D",data,"-U","postgres","-A","trust","--encoding=UTF8","--locale=C"],{windowsHide:true,stdio:"pipe"});
  const log = await fs.open(path.join(data,"server.log"),"a");
  server = spawn(postgres,["-D",data,"-h","127.0.0.1","-p",String(port),"-F","-c","wal_level=logical"],{windowsHide:true,stdio:["ignore",log.fd,log.fd]});
  for (let i=0;i<80;i++) { const c=new Client({host:"127.0.0.1",port,user:"postgres",database:"postgres"}); try {await c.connect();db=c;break;}catch{await c.end().catch(()=>{});await delay(200);} }
  assert.ok(db,"isolated PostgreSQL must start");
  report.version=(await db.query("select version() v")).rows[0].v;
  await db.query(await fs.readFile("e2e/fixtures/supabase-platform.sql","utf8"));
  const files=(await fs.readdir("supabase/migrations")).filter(f=>/^\d+.*\.sql$/.test(f)).sort();
  let current;
  let snapshot;
  const preserved=async()=>{
    const tables=['orders','reviews','payment_transactions','providers','service_categories'];
    const result={};
    for(const table of tables) result[table]=(await db.query(`select to_jsonb(t) row from public.${table} t order by id`)).rows;
    return result;
  };
  for (const file of files) {
    current=file;
    if (upgrade && file === '20261029000100_backend_reliability.sql') {
      await db.query(await fs.readFile('e2e/fixtures/backend-upgrade.sql','utf8'));
      snapshot=await preserved();
    }
    try { await db.query(await fs.readFile(path.join("supabase/migrations",file),"utf8")); }
    catch (e) { report.failure={ migration:current, code:e.code, message:e.message }; throw e; }
    report.migrations.push(file);
  }
  const expected=["service_catalog","service_variants","orders","payment_transactions","customer_favorite_providers","commerce_settlement_operations"];
  for (const table of expected) assert.equal((await db.query("select relrowsecurity from pg_class where oid=to_regclass($1)",["public."+table])).rows[0]?.relrowsecurity,true,table+" RLS");
  report.checks.push("Complete migration chain and critical relation RLS");
  if (upgrade) {
    assert.deepEqual(await preserved(),snapshot);
    assert.equal((await db.query("select state from commerce_settlement_operations where order_id='97000000-0000-4000-8000-000000000001'")).rows[0]?.state,'MANUAL_REVIEW');
    assert.equal((await db.query("select commerce_claim_settlement('97000000-0000-4000-8000-000000000001','release') claim")).rows[0].claim.claimed,false);
    report.checks.push("Populated real-schema upgrade preserves orders/reviews/transactions/providers/categories byte-for-byte and quarantines historical IN_FLIGHT");
  }
  await db.query("set role authenticated");
  await assert.rejects(db.query("select iyzico_checkout_token from payments"),/permission denied/);
  await assert.rejects(db.query("insert into payments(request_id,payment_method,status) values(gen_random_uuid(),'iyzico','escrow_held')"),/server_payment_only|row-level security/);
  await db.query("reset role");
  report.checks.push("Actual legacy schema denies browser token access and fabricated online payments");
  const schema=await db.query("select c.relname,pg_get_constraintdef(k.oid) definition from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' order by c.relname,k.conname");
  await securitySchemaChecks(db, report.checks);
  await prelaunchChecks(db, report.checks);
  await fs.writeFile(path.join(output,"isolated-constraints.json"),JSON.stringify(schema.rows,null,2));
  console.log(`PASS ${files.length} migrations, ${report.scenario}, ${report.checks.length} checks`);
} catch (e) { report.failure ??= { code:e.code??null,message:e.message }; console.error(JSON.stringify(report.failure));process.exitCode=1; }
finally { await db?.end().catch(()=>{});if(server){try{execFileSync(pg_ctl,["-D",data,"-m","fast","-w","stop"],{windowsHide:true,stdio:"pipe"});}catch{server.kill();}}await fs.writeFile(path.join(output,upgrade?"migration-upgrade.json":"migration-chain.json"),JSON.stringify(report,null,2)); }
