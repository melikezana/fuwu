import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { parseEnv } from 'node:util';
import { isLoopbackUrl, loadTestEnvironment } from './testing/environment.mjs';
import { sourceHash } from './testing/evidence.mjs';
import net from 'node:net';

// Own disposable stack. Never copy .temp/link metadata, remote credentials or rows.
const root=process.cwd(), output=path.resolve('artifacts/critical-backend-repair/local-supabase');
const work=path.join(output,`run-${Date.now()}`), project=`fuwu-e2e-${Date.now()}`;
const cli=process.env.SUPABASE_CLI_BIN || 'supabase';
const startedAt=new Date().toISOString(), report={startedAt,sourceHash:sourceHash(),project,status:'BLOCKED',runs:[],reason:''};
const keep=process.argv.includes('--keep-stack');
const cleanEnv={...process.env};
for(const key of Object.keys(cleanEnv)) if(/SUPABASE|IYZICO|UPSTASH|SENTRY|OPENAI|NETGSM|SMTP|DATABASE_URL|CRON_SECRET/.test(key)) delete cleanEnv[key];
let started=false;
await fs.mkdir(path.join(work,'supabase'),{recursive:true});
async function run(file,args,env=cleanEnv,{capture=false,timeout=600_000,cwd=root}={}) {
 if(file===cli) args=['--agent','no','--output-format','text',...args];
 return new Promise(resolve=>{
  const child=spawn(file,args,{cwd,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='';
  const safe=s=>s.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[local-test-key]').replace(/sb_(?:secret|publishable)_[A-Za-z0-9_-]+/g,'[local-test-key]').replace(/("[A-Z_]*(?:KEY|SECRET|TOKEN)[A-Z_]*"\s*:\s*)"[^"]*"/g,'$1"[local-test-secret]"');
  child.stdout.on('data',b=>{stdout+=b;if(!capture)process.stdout.write(safe(String(b)));});
  child.stderr.on('data',b=>{stderr+=b;if(!capture)process.stderr.write(safe(String(b)));});
  const timer=setTimeout(()=>child.kill(),timeout);
  child.on('error',error=>{clearTimeout(timer);resolve({code:1,stdout,stderr:stderr+error.message});});
  child.on('close',code=>{clearTimeout(timer);resolve({code:code??1,stdout,stderr});});
 });
}
try {
 // Leave existing developer stacks running. Reserve distinct currently free
 // ports, then release them immediately before starting our own containers.
 const listeners=await Promise.all(Array.from({length:8},()=>new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(0,'0.0.0.0',()=>resolve(server));})));
 const ports=listeners.map(server=>server.address().port);
 await Promise.all(listeners.map(server=>new Promise(resolve=>server.close(resolve))));
 const [apiPort,dbPort,shadowPort,studioPort,mailPort,analyticsPort,poolerPort,appPort]=ports;
 let config=await fs.readFile('supabase/config.toml','utf8');
 config=config.replace('project_id = "FUWU"',`project_id = "${project}"`);
 for(const [oldPort,newPort] of [[54321,apiPort],[54322,dbPort],[54320,shadowPort],[54323,studioPort],[54324,mailPort],[54327,analyticsPort],[54329,poolerPort]]) config=config.replaceAll(String(oldPort),String(newPort));
 const appUrl=`http://127.0.0.1:${appPort}`;
 config=config.replace('site_url = "http://localhost:3000"',`site_url = "${appUrl}"`);
 config=config.replace('additional_redirect_urls = [',`additional_redirect_urls = [\n  "${appUrl}/auth/callback",\n  "${appUrl}/auth/callback/**",`);
 config=config.replace('email_sent = 100','email_sent = 1000').replace('sign_in_sign_ups = 30','sign_in_sign_ups = 1000').replace('token_verifications = 30','token_verifications = 1000');
 config=config.replace('"http://127.0.0.1:3000/auth/callback/**",','"http://127.0.0.1:3000/auth/callback/**",\n  "http://127.0.0.1:3109/auth/callback",\n  "http://127.0.0.1:3109/auth/callback/**",');
 await fs.writeFile(path.join(work,'supabase/config.toml'),config);
 for(const dir of ['migrations','seed']) await fs.cp(path.join(root,'supabase',dir),path.join(work,'supabase',dir),{recursive:true});
 const docker=await run('docker',['version','--format','{{.Server.Version}}'],cleanEnv,{capture:true,timeout:20_000});
 if(docker.code!==0) throw new Error('Docker engine unavailable: '+docker.stderr.trim());
 started=true;
 const up=await run(cli,['start','--workdir',work,'--exclude','studio,logflare,vector,imgproxy,edge-runtime']);
 if(up.code!==0) throw new Error('Local Supabase start failed; inspect local output');
 const status=await run(cli,['status','--workdir',work,'-o','env'],cleanEnv,{capture:true});
 if(status.code!==0) throw new Error('Local Supabase status failed');
 const local=parseEnv(status.stdout);
 if(!isLoopbackUrl(local.API_URL)) throw new Error('Non-loopback local stack refused');
 const testEnv={...cleanEnv,NEXT_PUBLIC_SUPABASE_URL:local.API_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY:local.ANON_KEY,SUPABASE_SERVICE_ROLE_KEY:local.SERVICE_ROLE_KEY,E2E_MAILPIT_URL:`http://127.0.0.1:${mailPort}`,PLAYWRIGHT_BASE_URL:appUrl,E2E_ALLOW_REMOTE_SUPABASE_TESTS:'false',E2E_CRON_SECRET:`e2e-${project}-local-only`};
 Object.assign(process.env,testEnv);
 const validated=loadTestEnvironment();
 if(!validated.safety.ready) throw new Error('Isolated target failed validation');
 if(keep) {
  report.workdir=work;
  const names=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','E2E_MAILPIT_URL','PLAYWRIGHT_BASE_URL','E2E_ALLOW_REMOTE_SUPABASE_TESTS','E2E_CRON_SECRET'];
  await fs.writeFile(path.join(work,'test-environment.json'),JSON.stringify(Object.fromEntries(names.map(name=>[name,testEnv[name]]))),{mode:0o600});
 }
 const backend=await run(process.execPath,['scripts/check-backend-db.mjs'],validated.env);
 if(backend.code!==0) throw new Error('Local backend contract check failed');
 for(const workers of [1,2]) {
  const reportFile=path.join(output,`e2e-workers-${workers}.json`);
  await fs.rm(reportFile,{force:true}); // Never read evidence from an earlier run.
  const result=await run(process.execPath,['node_modules/@playwright/test/cli.js','test',`--workers=${workers}`,'--retries=0'],{...validated.env,E2E_REPORT_PATH:reportFile},{timeout:1_800_000});
  if(result.code!==0) report.status='FAIL';
  const data=JSON.parse(await fs.readFile(reportFile,'utf8'));
  await fs.mkdir(path.resolve('artifacts/security-testing'),{recursive:true});
  await fs.copyFile(reportFile,path.resolve('artifacts/security-testing/e2e.json'));
  report.runs.push({workers,exitCode:result.code,stats:data.stats,errors:data.errors});
  if(result.code!==0||data.stats.skipped||data.stats.flaky||data.stats.unexpected||data.errors.length) {report.status='FAIL';throw new Error(`Full suite failed with ${workers} worker(s); no retry/skip can pass`);}
 }
 const gate=await run(process.execPath,['scripts/run-commerce-e2e.mjs','--prelaunch','--report-only'],validated.env);
 if(gate.code!==0) throw new Error('Strict prelaunch evidence gate failed');
 const commerceGate=await run(process.execPath,['scripts/run-commerce-e2e.mjs','--report-only'],validated.env);
 if(commerceGate.code!==0) throw new Error('Commerce evidence gate failed');
 report.status='PASS';
} catch(error) { report.reason=error.message; process.exitCode=1; }
finally {
 if(started&&!keep) await run(cli,['stop','--workdir',work,'--no-backup']);
 if(started&&keep) console.log(`Owned diagnostic stack retained at ${work}; stop this exact workdir after debugging`);
 report.completedAt=new Date().toISOString();
 await fs.writeFile(path.join(output,'result.json'),JSON.stringify(report,null,2));
 console.log(`${report.status}: ${report.reason||'Complete local Supabase suites, serial and parallel'}`);
}
