import fs from 'node:fs/promises';
import path from 'node:path';
// Local disposable DB metadata compared to the previously collected read-only production metadata.
export async function compareProviderSchema(db, output) {
 const sql=`select jsonb_build_object('tables',(select jsonb_agg(jsonb_build_object('name',c.relname,'rls',c.relrowsecurity,'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull) order by a.attnum) from pg_attribute a where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped))) from pg_class c where c.relnamespace='public'::regnamespace and c.relkind='r'),'functions',(select jsonb_agg(jsonb_build_object('name',p.proname,'arguments',pg_get_function_identity_arguments(p.oid),'definer',p.prosecdef,'config',p.proconfig,'acl',p.proacl,'definition_hash',md5(pg_get_functiondef(p.oid)))) from pg_proc p where p.pronamespace='public'::regnamespace and p.prokind='f'),'policies',(select jsonb_agg(to_jsonb(x)) from (select tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies where schemaname='public') x)) snapshot`;
 const local=(await db.query(sql)).rows[0].snapshot;
 const production=JSON.parse(await fs.readFile('artifacts/control-center/production-schema.json','utf8'));
 const pTables=new Map(production.tables.map(t=>[t.name,t]));
 const key=f=>`${f.name}(${f.arguments})`;
 const pFunctions=new Map(production.functions.map(f=>[key(f),f]));
 const migrationMetadata=JSON.parse(await fs.readFile('artifacts/control-center/production-readonly.json','utf8'));
 const applied=new Set(migrationMetadata.appliedMigrations.map(m=>m.version));
 const report={scope:'Metadata-only comparison; definition hashes flag review, not semantic equivalence. No production writes.',productionTables:production.tables.length,localTables:local.tables.length,missingMigrations:(await fs.readdir('supabase/migrations')).filter(f=>/^\d+.*sql$/.test(f)&&!applied.has(f.split('_')[0])).sort(),missingTables:local.tables.filter(t=>!pTables.has(t.name)).map(t=>t.name),missingColumns:local.tables.flatMap(t=>{const p=pTables.get(t.name);return p?t.columns.filter(c=>!p.columns.some(pc=>pc.name===c.name)).map(c=>`${t.name}.${c.name}`):[];}),missingFunctions:local.functions.filter(f=>!pFunctions.has(key(f))).map(key),changedFunctionDefinitions:local.functions.filter(f=>pFunctions.has(key(f))&&pFunctions.get(key(f)).definition_hash!==f.definition_hash).map(key),missingPolicies:local.policies.filter(p=>!production.policies.some(pp=>pp.tablename===p.tablename&&pp.policyname===p.policyname)).map(p=>`${p.tablename}.${p.policyname}`)};
 await fs.writeFile(path.join(output,'schema-comparison.json'),JSON.stringify(report,null,2));
 return report;
}
