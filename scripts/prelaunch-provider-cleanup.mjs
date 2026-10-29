import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { Client } from 'pg';

// No project env files are read. Inventory is the default; deletion is never executed.
const target=process.env.PRELAUNCH_TARGET;
const connectionString=process.env.PRELAUNCH_DATABASE_URL;
const args=new Set(process.argv.slice(2));
const ids=Array.from({length:13},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
const manifestArgument=process.argv.find(arg=>arg.startsWith('--verified-manifest='));
const manifest=manifestArgument?JSON.parse(await fs.readFile(manifestArgument.slice('--verified-manifest='.length),'utf8')):[];
if(!Array.isArray(manifest)||manifest.length>100||manifest.some(row=>!row||row.confirmedTest!==true||! /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(row.providerId)||typeof row.evidence!=='string'||row.evidence.trim().length<10||row.evidence.length>1000))throw new Error('Invalid verified manifest; exact IDs and written test provenance are required');
for(const row of manifest)if(!ids.includes(row.providerId))ids.push(row.providerId);
if(!['staging','production'].includes(target)||!connectionString){
  console.error('BLOCKED: explicitly provide PRELAUNCH_TARGET and PRELAUNCH_DATABASE_URL. No changes made.');process.exitCode=1;
}else{
  const db=new Client({connectionString,connectionTimeoutMillis:10000});
  const quote=value=>'"'+value.replaceAll('"','""')+'"';
  let transaction=false;
  try{
    await db.connect();await db.query('begin');transaction=true;
    await db.query("set local statement_timeout='15s'; set local lock_timeout='5s'");
    const providers=(await db.query('select to_jsonb(p) data from public.providers p where id=any($1::uuid[]) order by id for update',[ids])).rows.map(row=>row.data);
    const actualIds=providers.map(row=>row.id);
    const fks=(await db.query(`select ns.nspname schema,c.relname table_name,k.conname constraint_name,
      array(select a.attname from unnest(k.conkey) with ordinality x(att,ord) join pg_attribute a on a.attrelid=k.conrelid and a.attnum=x.att order by x.ord) columns,
      array(select a.attname from unnest(k.confkey) with ordinality x(att,ord) join pg_attribute a on a.attrelid=k.confrelid and a.attnum=x.att order by x.ord) target_columns
      from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace ns on ns.oid=c.relnamespace
      where k.contype='f' and k.confrelid='public.providers'::regclass order by ns.nspname,c.relname,k.conname`)).rows;
    const related=[];
    for(const fk of fks){
      const join=fk.columns.map((column,index)=>`r.${quote(column)}=p.${quote(fk.target_columns[index])}`).join(' and ');
      const rows=(await db.query(`select p.id provider_id,to_jsonb(r) data from ${quote(fk.schema)}.${quote(fk.table_name)} r join public.providers p on ${join} where p.id=any($1::uuid[])`,[actualIds])).rows;
      related.push({...fk,rows});
    }
    const auditExists=(await db.query("select to_regclass('public.audit_logs') is not null present")).rows[0].present;
    const audits=auditExists?(await db.query('select entity_id from public.audit_logs where entity_id=any($1::uuid[])',[actualIds])).rows:[];
    const report={at:new Date().toISOString(),target,source:'Reserved seed IDs plus optional owner-reviewed test provenance manifest; names are never proof',manifest,ids:actualIds,
      profiles:providers.filter(p=>p.user_id).map(p=>({providerId:p.id,userId:p.user_id,action:'preserve_profile_and_all_user_records'})),
      relations:related.map(fk=>({table:`${fk.schema}.${fk.table_name}`,constraint:fk.constraint_name,columns:fk.columns,counts:actualIds.map(id=>({id,count:fk.rows.filter(row=>row.provider_id===id).length}))})),
      auditIds:audits.map(row=>row.entity_id),storage:'Objects and documents are preserved; object deletion is never performed',deletableIds:[],quarantined:false};
    report.deletableIds=providers.filter(p=>!p.user_id&&!audits.some(a=>a.entity_id===p.id)&&!related.some(fk=>fk.rows.some(row=>row.provider_id===p.id))).map(p=>p.id);
    const digest=crypto.createHash('sha256').update(JSON.stringify({ids:report.ids,manifest,relations:report.relations,profiles:report.profiles,auditIds:report.auditIds})).digest('hex');
    report.approvalDigest=digest;
    await fs.mkdir('artifacts/prelaunch/private',{recursive:true});
    const name=`artifacts/prelaunch/private/${Date.now()}`;
    // Backup includes every provider row and every incoming FK row. Preserve separately from Git.
    if(args.has('--backup')||args.has('--quarantine'))await fs.writeFile(`${name}-backup.json`,JSON.stringify({digest,providers,related},null,2),{flag:'wx'});
    if(args.has('--quarantine')){
      if(target==='production'&&process.env.PRELAUNCH_APPROVED_DIGEST!==digest)throw new Error('production_approval_required: review inventory and dependency digest with the owner first');
      await db.query("update public.provider_publication_reviews set record_kind='test',status='hidden',review_note='Confirmed test provenance; quarantined with local backup',reviewed_at=now(),updated_at=now() where provider_id=any($1::uuid[])",[actualIds]);
      await db.query("insert into public.audit_logs(entity_type,entity_id,action,metadata) select 'provider',id,'provider.test_quarantined',jsonb_build_object('inventory_digest',$2) from public.providers where id=any($1::uuid[])",[actualIds,digest]);
      await db.query('commit');transaction=false;report.quarantined=true;
    }else{await db.query('rollback');transaction=false;}
    // Plan only. Even isolated IDs require a fresh FK inventory and owner approval before use.
    const plan=`-- Prepared only; NEVER run without a fresh backup, inventory and explicit owner approval.\n-- Inventory digest: ${digest}\n-- No profile, audit, order, payment, gallery or document deletion.\nbegin;\n${report.deletableIds.length?`delete from public.providers where user_id is null and id in (${report.deletableIds.map(id=>`'${id}'::uuid`).join(',')});`:'-- No completely isolated confirmed seed row is eligible for deletion.'}\nrollback; -- deliberate default\n`;
    await fs.writeFile(`${name}-delete-plan.sql`,plan,{flag:'wx'});
    await fs.writeFile(`${name}-inventory.json`,JSON.stringify(report,null,2),{flag:'wx'});
    console.log(JSON.stringify({report:`${name}-inventory.json`,ids:report.ids,deletableIds:report.deletableIds,approvalDigest:digest,quarantined:report.quarantined,deletionExecuted:false}));
  }catch(error){if(transaction)await db.query('rollback').catch(()=>{});console.error(`BLOCKED: ${error.code||error.message}. No deletion executed.`);process.exitCode=1;}
  finally{await db.end().catch(()=>{});}
}
