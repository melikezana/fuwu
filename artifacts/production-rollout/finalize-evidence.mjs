import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { sourceHash, writeArtifactFile } from '../../scripts/testing/evidence.mjs';

const output=path.resolve('artifacts/production-rollout');
const hash=sourceHash(),now=new Date().toISOString();
const metadata=JSON.parse(fs.readFileSync('artifacts/prelaunch/private/rollout-20261031/production-metadata.json','utf8'));
const applied=new Set(metadata.appliedMigrations.map(m=>m.version));
const files=fs.readdirSync('supabase/migrations').filter(f=>/^\d{14}_.*\.sql$/.test(f)).sort();
const pending=files.filter(f=>!applied.has(f.split('_')[0]));
assert.equal(files.length,72);assert.equal(applied.size,46);assert.equal(pending.length,26);
const dryRun=fs.readFileSync(path.join(output,'production-dry-run.log'),'utf8');
assert.deepEqual([...dryRun.matchAll(/\d{14}_[a-z0-9_]+\.sql/g)].map(m=>m[0]),pending);
const sha256=value=>createHash('sha256').update(value).digest('hex');
const manifest={checkedAt:now,sourceHash:hash,projectRef:metadata.projectRef,productionWritesAuthorized:false,canApply:false,status:'BLOCKED',reason:'Full data backup/restore, real Google OAuth and explicit production approval remain required',repositoryCount:72,appliedCount:46,pendingCount:26,migrations:pending.map(file=>({file,sha256:sha256(fs.readFileSync(path.join('supabase/migrations',file))),productionStatus:'PENDING'}))};
writeArtifactFile(path.join(output,'rollout-manifest.json'),JSON.stringify(manifest,null,2));

const names=['typecheck','lint','unit','coverage','security','integration','build','mock','http','prelaunch-e2e','commerce-e2e'];
const evidence=names.map(name=>{
 const file='artifacts/security-testing/'+name+'-result.json',r=JSON.parse(fs.readFileSync(file,'utf8'));
 assert.equal(r.sourceHash,hash,name+' current source');assert.equal(r.status,'PASS',name+' must pass');
 assert.equal(r.executed,true);assert.ok(r.passed>0);assert.equal(r.failed,0);assert.equal(r.skipped,0);
 return {name,file,status:r.status,passed:r.passed,failed:r.failed,skipped:r.skipped,startedAt:r.startedAt,completedAt:r.completedAt,sourceHash:r.sourceHash};
});
const localFile='artifacts/critical-backend-repair/local-supabase/result.json';
const local=JSON.parse(fs.readFileSync(localFile,'utf8'));
assert.equal(local.sourceHash,hash);assert.equal(local.status,'PASS');assert.deepEqual(local.runs.map(r=>r.workers),[1,2]);
for(const run of local.runs){
 assert.equal(run.exitCode,0);assert.equal(run.stats.expected,39);assert.equal(run.stats.skipped,0);assert.equal(run.stats.unexpected,0);assert.equal(run.stats.flaky,0);assert.deepEqual(run.errors,[]);
 assert.ok(run.artifactDirectory.includes(local.project),'Current stack artifact directory required');
 const mobile=JSON.parse(fs.readFileSync(path.join(run.artifactDirectory,'result.json'),'utf8'));
 assert.equal(mobile.rows.length,84);assert.deepEqual(mobile.errors,[]);
 for(const row of mobile.rows){assert.ok(row.dimensions.width<=row.dimensions.viewport);assert.deepEqual(row.violations,[]);}
 assert.equal(fs.readdirSync(run.artifactDirectory).filter(f=>f.endsWith('.png')).length,28);
}
for(const workers of [1,2]){
 const data=JSON.parse(fs.readFileSync('artifacts/critical-backend-repair/local-supabase/e2e-workers-'+workers+'.json','utf8'));
 const tests=[];function walk(s){for(const spec of s.specs??[])tests.push(...spec.tests);for(const child of s.suites??[])walk(child);}data.suites.forEach(walk);
 assert.equal(tests.length,39);for(const t of tests){assert.equal(t.status,'expected');assert.equal(t.results.length,1);assert.equal(t.results[0].retry,0);assert.equal(t.results[0].status,'passed');}
}
assert.ok(Date.parse(local.runs[1].stats.startTime)>=Date.parse(local.runs[0].stats.startTime)+local.runs[0].stats.duration);
const rehearsal=JSON.parse(fs.readFileSync(path.join(output,'schema-rehearsal.json'),'utf8'));
assert.equal(rehearsal.sourceHash,hash);assert.equal(rehearsal.status,'PASS');assert.deepEqual(rehearsal.migrations,pending);assert.equal(rehearsal.failure,null);assert.match(rehearsal.version,/PostgreSQL 17\./);
const baselineCI=JSON.parse(fs.readFileSync(path.join(output,'github-current-evidence.json'),'utf8'));
const summary={checkedAt:now,sourceHash:hash,localTechnicalStatus:'PASS',productionMigrationStatus:'NOT_APPLIED',canApply:false,releaseA:{status:'BLOCKED',decision:'NO-GO',blockers:['Restorable full production data backup unverified; PITR false and backup list empty','Real Google OAuth callback acceptance untested','Explicit migration/deployment approval and production acceptance pending']},releaseB:{status:'BLOCKED',decision:'NO-GO',blockers:['Company formation and payment institution acceptance incomplete','External processor acceptance and separate live-payment authorization required']},evidence,productionSchemaRehearsal:{status:rehearsal.status,file:'artifacts/production-rollout/schema-rehearsal.json',migrationCount:rehearsal.migrations.length,checks:rehearsal.checks.length,version:rehearsal.version,schemaSha256:rehearsal.schemaSha256,scope:rehearsal.scope},localSupabase:{file:localFile,startedAt:local.startedAt,completedAt:local.completedAt,runs:local.runs},github:{...baselineCI,scope:'Verified baseline main commit; no hosted run for these unpushed local changes'},migrationManifest:'artifacts/production-rollout/rollout-manifest.json',backup:{pitrEnabled:false,availableBackups:0,fullDataRestoreVerified:false,publicSchemaRestoreVerified:true,billingPlan:'UNVERIFIED',privateBackupDirectory:'artifacts/prelaunch/private/rollout-20261031'},amendedPendingMigrations:['20260818000100_iyzico_commission_escrow.sql','20261031105613_critical_backend_contract_guard.sql'],scriptSha256:sha256(fs.readFileSync('artifacts/production-rollout/rehearse-production-schema.mjs')),productionProviderOperation:'NOT_EXECUTED; separate explicit approval required'};
summary.clientVerificationClock=JSON.parse(fs.readFileSync(path.join(output,'client-clock.json'),'utf8'));
summary.productionFinalMetadata=JSON.parse(fs.readFileSync(path.join(output,'production-final-readonly.json'),'utf8'));
assert.deepEqual(summary.productionFinalMetadata.metadataDrift,[]);
assert.equal(summary.productionFinalMetadata.ledgerCount,46);
writeArtifactFile(path.join(output,'summary.json'),JSON.stringify(summary,null,2));
for(const [name,reason] of [
 ['google-oauth','Production settings report Google enabled; actual external callback/session/role acceptance untested'],
 ['iyzico-sandbox','Company/payment provider acceptance pending; no external processor transaction authorized'],
 ['staging-schema','Local production-schema rehearsal passed; full production data restore and production rollout acceptance remain pending. Paid staging is not required.'],
]){
 writeArtifactFile('artifacts/security-testing/'+name+'-result.json',JSON.stringify({status:'BLOCKED',sourceHash:hash,startedAt:now,completedAt:now,executed:false,passed:0,failed:0,skipped:0,reason},null,2));
}
const reviewChecks=[
 'Fresh production schema/default ACL restore reproduces and resolves legacy token exposure',
 'None/pending statuses/defaults remain unchanged and only active is payment eligible',
 'Legacy and commerce financial FK/column/index graphs stay independent and preserved',
 'Admin/partner ownership, receipt, concurrency and audit rollback acceptance verified',
 'Full serial/parallel browser suites have 39 real successes each with retry/skip/flaky zero',
 'Production migration, provider mutations, push/deploy and live payments remain unauthorized and unexecuted',
];
writeArtifactFile('artifacts/security-testing/p0-review-result.json',JSON.stringify({status:'PASS',sourceHash:hash,startedAt:now,completedAt:now,executed:true,passed:reviewChecks.length,failed:0,skipped:0,scope:'Manual source and current execution-evidence review; not a production smoke or deployment approval',checks:reviewChecks},null,2));
console.log(JSON.stringify({status:'PASS',sourceHash:hash,evidence:evidence.length,pending:pending.length,schemaRehearsal:rehearsal.checks.length,releaseA:'BLOCKED',releaseB:'BLOCKED'}));
