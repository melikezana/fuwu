import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { loadTestEnvironment } from "./testing/environment.mjs";
import { output,saveEvidence,sourceHash } from "./testing/evidence.mjs";

const source=sourceHash(),startedAt=new Date().toISOString();
let status="BLOCKED",reason="",passed=0,failed=0,skipped=0,executed=false;
try {
  const {env,safety}=loadTestEnvironment();
  if(!safety.ready) throw new Error(safety.reason);
  const health=await fetch(new URL("/auth/v1/health",env.NEXT_PUBLIC_SUPABASE_URL),{headers:{apikey:env.NEXT_PUBLIC_SUPABASE_ANON_KEY},signal:AbortSignal.timeout(3000),redirect:"error"});
  if(!health.ok) throw new Error("Isolated Auth server is not healthy");
  fs.mkdirSync(output,{recursive:true});fs.rmSync(path.join(output,"e2e.json"),{force:true});
  executed=true;
  const r=spawnSync(process.execPath,["node_modules/@playwright/test/cli.js","test","e2e/commerce.spec.ts","e2e/trust-flow.spec.ts"],{env,encoding:"utf8",windowsHide:true,timeout:600000,maxBuffer:10*1024*1024});
  fs.writeFileSync(path.join(output,"commerce-e2e.log"),(r.stdout||"")+(r.stderr||""));
  const report=JSON.parse(fs.readFileSync(path.join(output,"e2e.json"),"utf8"));
  passed=report.stats.expected;failed=report.stats.unexpected;skipped=report.stats.skipped;
  status=r.status===0&&passed>0&&failed===0&&skipped===0?"PASS":failed>0?"FAIL":"BLOCKED";
  reason=status==="PASS"?"Real browser, Auth, API and DB; processor excluded":"Browser suite has failures or skips";
} catch {reason="BLOCKED: isolated allowlisted Supabase Auth/DB unavailable or unsafe; see environment policy. No write test ran.";}
saveEvidence("commerce-e2e",{status,sourceHash:source,startedAt,completedAt:new Date().toISOString(),executed,passed,failed,skipped,reason});
console.log(`${status}: ${reason}`);
if(status!=="PASS") process.exitCode=1;
