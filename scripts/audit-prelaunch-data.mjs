import fs from "node:fs/promises";
import { parseEnv } from "node:util";

// Read only. No PATCH/POST/DELETE, no raw personal data or secrets in the report.
const env = { ...parseEnv(await fs.readFile(".env.local", "utf8").catch(() => "")), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const seedIds = Array.from({length:13}, (_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,"0")}`);
const report = { at: new Date().toISOString(), scope: "GET only; local configured target, deployment identity not assumed", access: env.SUPABASE_SERVICE_ROLE_KEY ? "service_role_readonly" : "anonymous_partial", complete: true, settings: null, categories: [], providers: [], dependencies: [], schema: {}, blockers: [] };
async function read(table, query) {
  if (!url || !key) throw new Error("configuration_missing");
  const response = await fetch(`${url}/rest/v1/${table}?${new URLSearchParams(query)}`, { headers:{apikey:key,Authorization:`Bearer ${key}`}, signal:AbortSignal.timeout(15000) });
  const body=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(`${table}:HTTP_${response.status}:${String(body.code||"unknown").replace(/[^A-Z0-9_]/gi,"")}`);
  return body;
}
try {
  try {
  const metadata = await fetch(`${url}/rest/v1/`,{headers:{apikey:key,Authorization:`Bearer ${key}`,Accept:"application/openapi+json"},signal:AbortSignal.timeout(15000)});
  if(!metadata.ok) throw new Error(`schema:HTTP_${metadata.status}`);
  const doc=await metadata.json();
  report.schema=Object.fromEntries(Object.entries(doc.definitions??{}).map(([name,def])=>[name,Object.keys(def.properties??{})]));
  } catch(error) { report.complete=false;report.blockers.push(error.message); }
  try {
  const settings=await read("app_settings",{select:"key,value",key:"in.(announcement_banner,maintenance_mode)"});
  report.settings=settings.map(row=>({key:row.key,...(row.key==="maintenance_mode"?{value:row.value}:{hasValue:Boolean(row.value?.trim()),legacyDevelopmentMessage:/geliştiriyoruz|gelistiriyoruz/i.test(row.value||"")})}));
  } catch(error) { report.complete=false;report.blockers.push(error.message); }
  report.categories=await read("service_categories",{select:"id,name,slug,is_active",order:"id"});
  const providers=[];
  for(let offset=0;;offset+=500){
    const rows=await read("providers",{select:"id,user_id,is_active,is_approved,name,description",order:"id",limit:"500",offset:String(offset)});
    providers.push(...rows);if(rows.length<500)break;
  }
  report.providers=providers.map(p=>({id:p.id,userId:p.user_id,isActive:p.is_active,isApproved:p.is_approved,classification:seedIds.includes(p.id)?"confirmed_seed_id":"unclassified_requires_evidence",signals:/(?:test|demo|deneme|smoke|fixture|asdf|qwer)/i.test(`${p.name} ${p.description}`)?['suspected_test_text_not_deletion_proof']:[],source:seedIds.includes(p.id)?"supabase/seed/seed.sql":"database; not proven test"}));
  const relations = {
    profiles:["id"],provider_applications:["user_id"],provider_service_offerings:["provider_id"],provider_availability:["provider_id"],provider_publication_reviews:["provider_id"],
    provider_gallery_images:["provider_id"],provider_gallery:["provider_id"],provider_verification_documents:["provider_id"],provider_documents:["provider_id"],
    orders:["provider_id"],reviews:["provider_id"],payments:["provider_id"],payment_transactions:["order_id"],service_requests:["assigned_provider_id","accepted_provider_id"],audit_logs:["entity_id","actor_user_id"],
  };
  // Inventory every public candidate; this never makes an unclassified row deletable.
  const testIds=report.providers.map(p=>p.id);
  const userIds=report.providers.map(p=>p.userId).filter(Boolean);
  let orderIds=[];
  if(testIds.length)try{orderIds=(await read("orders",{select:"id",provider_id:`in.(${testIds.join(",")})`})).map(o=>o.id);}catch(error){report.complete=false;report.blockers.push(error.message);}
  for(const [table,columns] of Object.entries(relations)){
    for(const column of columns){
      if(Object.keys(report.schema).length && !report.schema[table]?.includes(column))continue;
      const ids=column==="order_id"?orderIds:["user_id","actor_user_id"].includes(column)||table==="profiles"?userIds:testIds;
      if(!ids.length){report.dependencies.push({table,column,status:'not_queried',reason:'No accessible parent identifiers; private rows remain unknown'});continue;}
      const rows=[];
      try {
        for(let offset=0;;offset+=500){const page=await read(table,{select:[...new Set([table==='provider_publication_reviews'?column:"id",column])].join(","),[column]:`in.(${ids.join(",")})`,limit:"500",offset:String(offset),order:table==='provider_publication_reviews'?column:"id"});rows.push(...page);if(page.length<500)break;}
        report.dependencies.push({table,column,rows,scope:report.access==='anonymous_partial'?'RLS-visible subset only':'service_role'});
      } catch(error) { report.complete=false;report.dependencies.push({table,column,status:'unknown',reason:error.message}); }
    }
  }
} catch(error){report.complete=false;report.blockers.push(error.message);}
// Complete FK catalog requires a direct SQL connection; never infer missing dependencies.
if(report.access==='anonymous_partial'){report.complete=false;report.blockers.push('Anonymous RLS-visible inventory cannot prove absence of private rows');}
report.blockers.push("FK catalog and storage object inventory require staging/DB inspection before deletion; no deletion authorized by this report");
await fs.mkdir("artifacts/prelaunch",{recursive:true});
await fs.writeFile("artifacts/prelaunch/data-audit.json",JSON.stringify(report,null,2));
console.log(JSON.stringify({complete:report.complete,access:report.access,providers:report.providers.length,confirmedTestIds:report.providers.filter(p=>p.classification==="confirmed_seed_id").map(p=>p.id),blockers:report.blockers}));
