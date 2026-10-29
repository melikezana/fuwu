import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { output, saveEvidence, sourceHash } from "./testing/evidence.mjs";
import { readEnv } from "./testing/environment.mjs";

const name=process.argv[2];
const hash=sourceHash(), startedAt=new Date().toISOString();
fs.mkdirSync(output,{recursive:true});
const tmp=path.join(output,"tmp");fs.mkdirSync(tmp,{recursive:true});
const env={...process.env,TEMP:tmp,TMP:tmp};
for(const file of [".env",".env.local",".env.test",".env.production",".env.production.local"]) for(const key of Object.keys(readEnv(file))) env[key]="";
for(const key of Object.keys(env)) if(/SUPABASE|IYZICO|UPSTASH|SENTRY|OPENAI|NETGSM|SMTP|CRON_SECRET/.test(key)) delete env[key];
env.NEXT_PUBLIC_SUPABASE_URL="";env.NEXT_PUBLIC_SUPABASE_ANON_KEY="";env.SUPABASE_SERVICE_ROLE_KEY="";
env.IYZICO_API_KEY="";env.IYZICO_SECRET_KEY="";env.UPSTASH_REDIS_REST_URL="";env.UPSTASH_REDIS_REST_TOKEN="";
env.NEXT_PUBLIC_SITE_URL="http://127.0.0.1:3109";
env.NEXT_TELEMETRY_DISABLED="1";
const steps=[];
function run(label,args,extra={}) {
  console.log(`Running ${label}`);
  const r=spawnSync(process.execPath,args,{env:{...env,...extra},encoding:"utf8",windowsHide:true,timeout:600000,maxBuffer:20*1024*1024});
  const log=(r.stdout||"")+(r.stderr||"");fs.writeFileSync(path.join(output,`${label}.log`),log);
  if(r.error) console.error(r.error.code||"Execution error");
  process.stdout.write(log);
  steps.push({name:label,status:r.status===0&&!r.error?"PASS":"FAIL",exitCode:r.status});
  return r;
}
function fresh(file) { fs.rmSync(file,{force:true}); }
let passed=0,failed=0,skipped=0,reason="";
try {
  if(["unit","coverage","security"].includes(name)) {
    const file=path.join(output,name==="security"?"security.json":"unit.json");fresh(file);
    run(name,["node_modules/vitest/vitest.mjs","run","--config",name==="security"?"vitest.security.config.ts":"vitest.unit.config.ts",...(name==="coverage"?["--coverage"]:[])]);
    const result=JSON.parse(fs.readFileSync(file,"utf8"));
    passed=result.numPassedTests;failed=result.numFailedTests;skipped=(result.numPendingTests||0)+(result.numTodoTests||0);
    if(name==="security") {
      run("static-security",["scripts/check-security.mjs"]);
      if(!process.env.npm_execpath) throw new Error("npm runner required for dependency audit");
      const audit=run("dependency-audit",[process.env.npm_execpath,"audit","--json"]);
      fs.writeFileSync(path.join(output,"dependency-audit.json"),audit.stdout||"{}");
      const parsed=JSON.parse(audit.stdout||"{}");
      if(!parsed.metadata?.vulnerabilities) throw new Error("BLOCKED: dependency advisory service unavailable");
      // Low/moderate findings are reported. High/critical findings fail CI.
      const critical=parsed.metadata.vulnerabilities.high+parsed.metadata.vulnerabilities.critical;
      steps[steps.length-1].status=critical===0?"PASS":"FAIL";
      passed+=critical===0?1:0;failed+=critical;
    }
  } else if(name==="integration") {
    const migrationEnv={MIGRATION_OUTPUT_DIR:output};
    for(const upgrade of [false,true]) {
      const file=path.join(output,upgrade?"migration-upgrade.json":"migration-chain.json");fresh(file);
      run(upgrade?"migrations-upgrade":"migrations-clean",["scripts/test-backend-migrations.mjs",...(upgrade?["--upgrade"]:[])],migrationEnv);
      const r=JSON.parse(fs.readFileSync(file,"utf8"));passed+=r.checks.length;failed+=r.failure?1:0;
    }
    for(const upgrade of [false,true]) {
      const dir=path.join(output,upgrade?"db-upgrade":"db-clean");fs.mkdirSync(dir,{recursive:true});
      fresh(path.join(dir,"database-tests.json"));
      run(upgrade?"commerce-db-upgrade":"commerce-db-clean",["scripts/test-direct-commerce-db.mjs"],{COMMERCE_OUTPUT_DIR:dir,FUWU3_UPGRADE_TEST:upgrade?"true":"false"});
      const r=JSON.parse(fs.readFileSync(path.join(dir,"database-tests.json"),"utf8"));passed+=r.checks.length;failed+=r.failed?1:0;
    }
  } else if(name==="mock") {
    fresh("artifacts/backend-reliability/fault-injection.json");
    run("fault-injection",["node_modules/tsx/dist/cli.mjs","scripts/test-backend-reliability.ts"]);
    const r=JSON.parse(fs.readFileSync("artifacts/backend-reliability/fault-injection.json","utf8"));passed=r.checks.length;
    for(const [label,script,file] of [["legacy-payment-regression","scripts/test-direct-commerce-payment.ts","payment-tests.json"],["legacy-auth-regression","scripts/test-fusion-auth.ts","auth-tests.json"]]) {
      fresh(path.join(output,file));run(label,["node_modules/tsx/dist/cli.mjs",script],{COMMERCE_OUTPUT_DIR:output,AUTH_OUTPUT_DIR:output});
      passed+=JSON.parse(fs.readFileSync(path.join(output,file),"utf8")).checks.length;
    }
  } else if(name==="http") {
    fresh("artifacts/backend-reliability/http-guards.json");
    run(name,["scripts/test-backend-http.mjs"]);
    const r=JSON.parse(fs.readFileSync("artifacts/backend-reliability/http-guards.json","utf8"));passed=r.checks.length;failed=r.failure?1:0;
  } else if(name==="typecheck") {run(name,["node_modules/typescript/bin/tsc","--noEmit"]);passed=1;
  } else if(name==="lint") {run(name,["node_modules/eslint/bin/eslint.js"]);passed=1;
  } else if(name==="build") {run(name,["node_modules/next/dist/bin/next","build","--webpack"]);passed=1;
  } else if(name==="storybook") {run(name,["node_modules/storybook/dist/bin/dispatcher.js","build","--quiet","--output-dir",path.join(output,"storybook-static")]);passed=1;
  } else throw new Error("Unknown check");
} catch(error) {reason=error.message;failed++;console.error(reason);}
if(steps.some(s=>s.status!=="PASS")&&failed===0) failed=steps.filter(s=>s.status!=="PASS").length;
if(["build","lint","typecheck","storybook"].includes(name)&&failed>0) passed=0;
const status=steps.length>0&&steps.every(s=>s.status==="PASS")&&passed>0&&failed===0&&skipped===0?"PASS":reason.startsWith("BLOCKED")?"BLOCKED":"FAIL";
saveEvidence(name,{status,sourceHash:hash,startedAt,completedAt:new Date().toISOString(),executed:steps.length>0,passed,failed,skipped,reason,steps});
console.log(`${status}: ${name}; passed=${passed}, failed=${failed}, skipped=${skipped}`);
if(status!=="PASS") process.exitCode=1;
