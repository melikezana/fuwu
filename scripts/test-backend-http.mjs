import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

// Real local Next production HTTP. External integrations are deliberately unavailable.
const listener=net.createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));
const port=listener.address().port;await new Promise(r=>listener.close(r));
const base=`http://127.0.0.1:${port}`;
const report={scope:'Real localhost production HTTP guards with unavailable integrations; not authenticated purchase/OAuth/payment E2E',checks:[],failure:null};
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p',String(port)],{windowsHide:true,stdio:'ignore',env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:1',NEXT_PUBLIC_SUPABASE_ANON_KEY:'offline-build-only',SUPABASE_SERVICE_ROLE_KEY:'',IYZICO_API_KEY:'',IYZICO_SECRET_KEY:'',CRON_SECRET:'',NEXT_PUBLIC_SITE_URL:base,NEXT_TELEMETRY_DISABLED:'1'}});
try {
  let ready=false;
  for(let i=0;i<100;i++){try{await fetch(base+'/api/commerce/slots',{signal:AbortSignal.timeout(1000)});ready=true;break;}catch{await delay(200);}}
  assert.ok(ready,'local production server must start');
  const uuid='40000000-0000-4000-8000-000000000001';
  const cases=[
    ['GET','/api/commerce/slots',400],
    ['GET',`/api/commerce/quote?offering=${uuid}`,503],
    ['POST','/api/commerce/orders',401],
    ['POST','/api/commerce/checkout',401],
    ['POST',`/api/commerce/orders/${uuid}`,401],
    ['POST','/api/commerce/store',401],
    ['POST','/api/commerce/store/capacity',401],
    ['POST','/api/commerce/store/variants',401],
    ['POST','/api/commerce/payment-callback',503],
    ['POST','/api/payments/iyzico/checkout',401,{requestId:uuid}],
    ['POST','/api/payments/iyzico/webhook',503],
    // The build deliberately has no Supabase configuration: Auth is unavailable.
    ['GET','/api/auth/user',503],
    ['GET','/api/account/favorites',401],
    ['GET','/api/cron/commerce-expiry',401],
    ['POST','/api/commerce/orders',403,{},'https://foreign.invalid'],
    ['POST','/api/auth/logout',403,{},'https://foreign.invalid'],
  ];
  for(const [method,path,status,body={},origin=base] of cases){
    const response=await fetch(base+path,{method,headers:{origin,'content-type':'application/json'},...(method==='POST'?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000),redirect:'manual'});
    const payload=await response.json();
    assert.equal(response.status,status,method+' '+path);
    assert.match(payload.requestId,/^[0-9a-f-]{36}$/);
    assert.equal(response.headers.get('x-request-id'),payload.requestId);
    assert.ok(payload.code&&payload.message);
    assert.match(response.headers.get('cache-control')??'',/no-store/);
    assert.doesNotMatch(JSON.stringify(payload),/PGRST|SQLSTATE|postgres|service_role|checkout_token|offline-build-only/i);
    report.checks.push({method,path,status,passed:true});
  }
  for(const endpoint of ['/api/commerce/orders','/api/commerce/payment-callback','/api/support/messages']) {
    const response=await fetch(base+endpoint,{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify({data:'x'.repeat(65536)}),redirect:'manual'});
    assert.equal(response.status,413);report.checks.push({method:'POST',path:endpoint,status:413,passed:true});
  }
  const csp=await fetch(base+'/login',{signal:AbortSignal.timeout(15000)});
  assert.match(csp.headers.get('content-security-policy')??'',/nonce-[A-Za-z0-9+/=]+/);
  assert.match(csp.headers.get('content-security-policy')??'',/frame-ancestors 'none'/);
  assert.doesNotMatch(csp.headers.get('content-security-policy')??'',/'unsafe-eval'/);
  report.checks.push({method:'GET',path:'/login CSP',status:csp.status,passed:true});
  console.log(`PASS ${report.checks.length} production HTTP guard checks`);
}catch(e){report.failure={name:e.name,message:e.message};console.error(report.failure);process.exitCode=1;}
finally{child.kill();await fs.mkdir('artifacts/backend-reliability',{recursive:true});await fs.writeFile('artifacts/backend-reliability/http-guards.json',JSON.stringify(report,null,2));}
