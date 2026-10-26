import fs from "node:fs";
// No service key, credentials, data mutations, accounts or payment sessions are used.
const env={};
for(const line of fs.readFileSync(".env.local","utf8").split(/\r?\n/)) { const i=line.indexOf("="); if(i>0&&!line.trim().startsWith("#")) env[line.slice(0,i).trim()]=line.slice(i+1).trim().replace(/^["']|["']$/g,""); }
const report={scope:"Read-only external probes; not Google login or sandbox transaction E2E",checked_at:new Date().toISOString(),configuration:{supabase:Boolean(env.NEXT_PUBLIC_SUPABASE_URL&&env.NEXT_PUBLIC_SUPABASE_ANON_KEY),server_key:Boolean(env.SUPABASE_SERVICE_ROLE_KEY),iyzico_keys:Boolean(env.IYZICO_API_KEY&&env.IYZICO_SECRET_KEY),cron:Boolean(env.CRON_SECRET)},checks:[]};
const headers={apikey:env.NEXT_PUBLIC_SUPABASE_ANON_KEY,Authorization:`Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`};
await Promise.all([
  ...[["commerce schema","/rest/v1/service_catalog?select=id&limit=0"],["review sources","/rest/v1/reviews?select=order_id,service_request_id&limit=0"],["provider variants","/rest/v1/service_variants?select=provider_id&limit=0"],["Google provider settings","/auth/v1/settings"]].map(async([name,route])=>{
    try { const r=await fetch(env.NEXT_PUBLIC_SUPABASE_URL+route,{headers,signal:AbortSignal.timeout(12000)});const b=await r.json().catch(()=>({}));report.checks.push({name,http_status:r.status,passed:r.ok,code:b?.code||null,...(name==="Google provider settings"?{google_enabled:b?.external?.google===true}:{}),detail:r.ok?"Read-only request completed":String(b?.message||"failed").slice(0,180)}); }
    catch(e){report.checks.push({name,passed:false,error:e?.name,cause:e?.cause?.code||null});}
  }),
  (async()=>{try{const r=await fetch("https://sandbox-api.iyzipay.com/payment/test",{signal:AbortSignal.timeout(12000)});const b=await r.json();report.checks.push({name:"iyzico sandbox connectivity",http_status:r.status,passed:r.ok&&b.status==="success",detail:"Public API ping; does not validate credentials, submerchant, payment, refund or payout"});}catch(e){report.checks.push({name:"iyzico sandbox connectivity",passed:false,error:e?.name,cause:e?.cause?.code||null});}})(),
]);
fs.mkdirSync("artifacts/phase3",{recursive:true});fs.writeFileSync("artifacts/phase3/external-readonly-tests.json",JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
