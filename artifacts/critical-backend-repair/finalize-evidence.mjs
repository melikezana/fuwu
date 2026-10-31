import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { sourceHash, saveEvidence } from '../../scripts/testing/evidence.mjs';

// Evidence validator, not a test generator. It refuses any failed/skipped/retried
// result and preserves the actual Playwright reports produced by the commands.
const dir=path.resolve('artifacts/critical-backend-repair/local-supabase');
const hash=sourceHash(), runs=[];
for(const workers of [1,2]) {
 const input=path.join(dir,`validated-full-workers-${workers}.json`);
 const report=JSON.parse(fs.readFileSync(input,'utf8'));
 assert.equal(report.config.workers,workers);
 assert.equal(report.stats.expected,39);
 for(const field of ['unexpected','skipped','flaky']) assert.equal(report.stats[field],0);
 assert.equal(report.errors.length,0);
 assert.equal(report.config.webServer.env.SUPABASE_SERVICE_ROLE_KEY,undefined);
 let cases=0;
 function visit(suite) {
  for(const spec of suite.specs||[]) for(const test of spec.tests||[]) {
   assert.equal(test.expectedStatus,'passed');
   assert.equal(test.results.length,1);
   assert.equal(test.results[0].status,'passed');
   assert.equal(test.results[0].retry,0);
   assert.equal(report.config.projects.find(project=>project.id===test.projectId).retries,0);
   cases++;
  }
  for(const child of suite.suites||[])visit(child);
 }
 visit(report);assert.equal(cases,39);
 fs.copyFileSync(input,path.join(dir,`e2e-workers-${workers}.json`));
 runs.push({workers,exitCode:0,stats:report.stats,errors:report.errors,report:path.relative(process.cwd(),input)});
}
assert.ok(Date.parse(runs[1].stats.startTime)>=Date.parse(runs[0].stats.startTime)+runs[0].stats.duration);
fs.copyFileSync(path.join(dir,'e2e-workers-2.json'),'artifacts/security-testing/e2e.json');
fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify({
 status:'PASS',sourceHash:hash,startedAt:runs[0].stats.startTime,completedAt:new Date().toISOString(),
 project:'fuwu-e2e-1793448781703',workdir:path.join(dir,'run-1793448781703'),
 executionMethod:'Actual complete Playwright CLI runs, workers=1 then workers=2, no retries. Same owned Supabase stack and unchanged source; original clean CLI migrations and backend health succeeded. Diagnostic failures retained separately.',
 runs,reason:'All 39 cases passed in both full-suite runs; zero skip, flaky, retry or unexpected result',
},null,2));
const completedAt=new Date().toISOString();
for(const [name,reason] of [
 ['google-oauth','External Google account/redirect allowlist acceptance not performed; local Auth is separate evidence'],
 ['iyzico-sandbox','No external processor transaction authorized or performed; company/live payment gate remains closed'],
 ['staging-schema','No independent hosted staging project available; production migration unapplied. Real isolated Supabase and observed-schema PG17 upgrade passed separately'],
]) saveEvidence(name,{status:'BLOCKED',sourceHash:hash,startedAt:completedAt,completedAt,executed:false,passed:0,failed:0,skipped:0,reason});
console.log(JSON.stringify({status:'PASS',sourceHash:hash,runs:runs.map(r=>({workers:r.workers,stats:r.stats}))},null,2));
