import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
const workspace=process.cwd(), parent=process.env.PHASE3_SNAPSHOT_ROOT;
if(!parent||!path.isAbsolute(parent))throw new Error("PHASE3_SNAPSHOT_ROOT must be an absolute writable validation directory");
const snapshot=path.join(parent,`fuwu-validation-${Date.now()}`);fs.mkdirSync(snapshot,{recursive:false});
const manifest={};
function copyFile(relative) {const data=fs.readFileSync(path.join(workspace,relative));const target=path.join(snapshot,relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,data);manifest[relative.replaceAll("\\","/")]=crypto.createHash("sha256").update(data).digest("hex");}
function copyFolder(relative) {if(!fs.existsSync(path.join(workspace,relative)))return;for(const item of fs.readdirSync(path.join(workspace,relative),{withFileTypes:true})){const file=path.join(relative,item.name);if(item.isDirectory())copyFolder(file);else if(item.isFile())copyFile(file);}}
for(const folder of ["src","scripts","supabase/migrations","e2e",".storybook"])copyFolder(folder);
for(const file of ["package.json","package-lock.json","tsconfig.json","next.config.ts","next-env.d.ts","middleware.ts","postcss.config.mjs","eslint.config.mjs","vitest.config.ts","vitest.shims.d.ts","playwright.config.ts","instrumentation.ts","instrumentation-client.ts","sentry.client.config.ts","sentry.server.config.ts","sentry.edge.config.ts"])if(fs.existsSync(path.join(workspace,file)))copyFile(file);
for(const folder of ["node_modules","public"])fs.symlinkSync(path.join(workspace,folder),path.join(snapshot,folder),"junction");
// Environment values stay in process memory; no .env or credential files enter the snapshot.
if(fs.existsSync(path.join(workspace,".env.local")))process.loadEnvFile(path.join(workspace,".env.local"));
const captured=new Date().toISOString();
const typegen=spawnSync(process.execPath,["node_modules/next/dist/bin/next","typegen"],{cwd:snapshot,env:process.env,encoding:"utf8",windowsHide:true,timeout:120000});
if(typegen.status!==0)throw new Error(typegen.stderr||"Snapshot typegen failed");
console.log("Validating immutable source snapshot...");
const result=spawnSync(process.execPath,["scripts/verify-phase3-quality.mjs"],{cwd:snapshot,env:process.env,encoding:"utf8",windowsHide:true,timeout:900000,maxBuffer:20*1024*1024});
console.log(result.stdout||"");if(result.stderr)console.error(result.stderr);
const out=path.join(workspace,"artifacts/phase3");
for(const file of ["quality-gates.json","validated-source-hashes.json","lint.log","typescript.log","production-build.log"]) {const source=path.join(snapshot,"artifacts/phase3",file);if(fs.existsSync(source))fs.copyFileSync(source,path.join(out,file));}
const reportPath=path.join(out,"quality-gates.json");const report=JSON.parse(fs.readFileSync(reportPath,"utf8"));
report.scope="Immutable source copy to isolate concurrent workspace edits; shared installed dependencies and public assets";report.source_captured_at=captured;report.snapshot=snapshot;
report.workspace_changed_after_snapshot=Object.entries(manifest).filter(([file,hash])=>!fs.existsSync(path.join(workspace,file))||crypto.createHash("sha256").update(fs.readFileSync(path.join(workspace,file))).digest("hex")!==hash).map(([file])=>file);
fs.writeFileSync(reportPath,JSON.stringify(report,null,2));
fs.writeFileSync(path.join(out,"snapshot-source-hashes.json"),JSON.stringify(manifest,null,2));
process.exitCode=result.status===0?0:1;
