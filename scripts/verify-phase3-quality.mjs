import { spawnSync } from "node:child_process";
import fs from "node:fs";
import crypto from "node:crypto";
const out="artifacts/phase3";fs.mkdirSync(out,{recursive:true});
function sourceHashes() {
  const result={};
  function walk(folder) { if(!fs.existsSync(folder))return;for(const item of fs.readdirSync(folder,{withFileTypes:true})) {const name=`${folder}/${item.name}`;if(item.isDirectory())walk(name);else if(/\.(tsx?|m?js|css|sql|json|md)$/.test(name)) result[name]=crypto.createHash("sha256").update(fs.readFileSync(name)).digest("hex");} }
  for(const folder of ["src","scripts","supabase/migrations","e2e/fixtures"])walk(folder);
  for(const name of ["package.json","package-lock.json","next.config.ts","tsconfig.json","middleware.ts","eslint.config.mjs"])if(fs.existsSync(name))result[name]=crypto.createHash("sha256").update(fs.readFileSync(name)).digest("hex");
  return result;
}
const before=sourceHashes();
const checks=[];
for(const [name,args] of [["lint",["node_modules/eslint/bin/eslint.js"]],["typescript",["node_modules/typescript/bin/tsc","--noEmit"]],["production-build",["node_modules/next/dist/bin/next","build","--webpack"]]]) {
  console.log(`Running ${name}...`);
  const start=Date.now();const result=spawnSync(process.execPath,args,{encoding:"utf8",windowsHide:true,timeout:600000,maxBuffer:20*1024*1024});
  fs.writeFileSync(`${out}/${name}.log`,`${result.stdout||""}\n${result.stderr||""}`);
  const check={name,exit_code:result.status,duration_seconds:Math.round((Date.now()-start)/1000),passed:result.status===0};checks.push(check);console.log(JSON.stringify(check));
  if(!check.passed){console.error((result.stderr||result.stdout||String(result.error)).slice(-6000));process.exitCode=1;break;}
}
const after=sourceHashes();const changed_during_checks=[...new Set([...Object.keys(before),...Object.keys(after)])].filter(name=>before[name]!==after[name]);
fs.writeFileSync(`${out}/validated-source-hashes.json`,JSON.stringify(after,null,2));
fs.writeFileSync(`${out}/quality-gates.json`,JSON.stringify({checked_at:new Date().toISOString(),checks,sources_unchanged_during_checks:changed_during_checks.length===0,changed_during_checks},null,2));
if(changed_during_checks.length) {console.error("Source files changed during verification:",changed_during_checks);process.exitCode=1;}
