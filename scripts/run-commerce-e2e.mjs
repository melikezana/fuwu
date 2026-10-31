import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { loadTestEnvironment } from "./testing/environment.mjs";
import { output,saveEvidence,sourceHash } from "./testing/evidence.mjs";

const source=sourceHash(),startedAt=new Date().toISOString();
const prelaunch=process.argv.includes("--prelaunch"), reportOnly=process.argv.includes("--report-only");
const requiredSpecs=["auth.spec.ts","provider-application.spec.ts","provider-control.spec.ts","trust-flow.spec.ts","storage-documents.spec.ts"];
let status="BLOCKED",reason="",passed=0,failed=0,skipped=0,executed=false;
try {
  const {env,safety}=loadTestEnvironment();
  if(!safety.ready) throw new Error(safety.reason);
  let exitCode=0;
  if(!reportOnly) {
    const health=await fetch(new URL("/auth/v1/health",env.NEXT_PUBLIC_SUPABASE_URL),{headers:{apikey:env.NEXT_PUBLIC_SUPABASE_ANON_KEY},signal:AbortSignal.timeout(3000),redirect:"error"});
    if(!health.ok) throw new Error("Isolated Auth server is not healthy");
    fs.mkdirSync(output,{recursive:true});fs.rmSync(path.join(output,"e2e.json"),{force:true});
    executed=true;
    const specs=prelaunch?requiredSpecs.map(file=>`e2e/${file}`):["e2e/commerce.spec.ts","e2e/trust-flow.spec.ts"];
    const r=spawnSync(process.execPath,["node_modules/@playwright/test/cli.js","test",...specs],{env,encoding:"utf8",windowsHide:true,timeout:600000,maxBuffer:10*1024*1024});
    exitCode=r.status??1;
    fs.writeFileSync(path.join(output,prelaunch?"prelaunch-e2e.log":"commerce-e2e.log"),(r.stdout||"")+(r.stderr||""));
  }
  const report=JSON.parse(fs.readFileSync(path.join(output,"e2e.json"),"utf8"));
  const files=new Set();
  function inspect(suite){if(suite.file)files.add(path.basename(suite.file));for(const child of suite.suites||[])inspect(child);}
  for(const suite of report.suites||[])inspect(suite);
  if(prelaunch&&requiredSpecs.some(file=>!files.has(file))) throw new Error("Required acceptance suite missing from report");
  executed=true;
  passed=report.stats.expected;failed=report.stats.unexpected;skipped=report.stats.skipped;
  status=exitCode===0&&passed>0&&failed===0&&skipped===0&&(report.errors||[]).length===0?"PASS":failed>0?"FAIL":"BLOCKED";
  reason=status==="PASS"?"Real browser, Auth, API and DB; processor excluded":"Browser suite has failures or skips";
} catch {reason=executed?"BLOCKED: acceptance report is missing or incomplete; inspect the test log":"BLOCKED: isolated allowlisted Supabase Auth/DB unavailable or unsafe; no write test ran";}
saveEvidence(prelaunch?"prelaunch-e2e":"commerce-e2e",{status,sourceHash:source,startedAt,completedAt:new Date().toISOString(),executed,passed,failed,skipped,reason});
console.log(`${status}: ${reason.replace(/^BLOCKED:\s*/,"")}`);
if(status!=="PASS") process.exitCode=1;
