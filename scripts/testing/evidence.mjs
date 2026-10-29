import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

export const output = path.resolve("artifacts/security-testing");
export function sourceHash() {
  const hash=createHash("sha256");
  function walk(file) {
    if (!fs.existsSync(file)) return;
    if(fs.statSync(file).isDirectory()) for(const child of fs.readdirSync(file).sort()) walk(path.join(file,child));
    else if(/\.(?:ts|tsx|mjs|json|sql|yml|toml)$/.test(file)) {hash.update(file.replaceAll("\\","/"));hash.update(fs.readFileSync(file));}
  }
  for(const file of ["src","scripts","tests","e2e","supabase","config",".github","package.json","package-lock.json","playwright.config.ts","vitest.unit.config.ts","vitest.security.config.ts","next.config.ts","middleware.ts","eslint.config.mjs","tsconfig.json"]) walk(file);
  return hash.digest("hex");
}
export function saveEvidence(name, evidence) {
  fs.mkdirSync(output,{recursive:true});
  fs.writeFileSync(path.join(output,`${name}-result.json`),JSON.stringify(evidence,null,2));
}
export function evaluateRelease(records, hash, now=Date.now()) {
  const required=["typecheck","lint","unit","coverage","integration","security","build","commerce-e2e","google-oauth","iyzico-sandbox","staging-schema","p0-review"];
  const gates=required.map(name=>{
    const r=records[name];
    if(!r) return {name,status:"BLOCKED",reason:"No current execution evidence"};
    if(r.sourceHash!==hash || !Number.isFinite(Date.parse(r.completedAt)) || now-Date.parse(r.completedAt)>24*3600000 || Date.parse(r.completedAt)>now+60000) return {name,status:"BLOCKED",reason:"Stale or mismatched source evidence"};
    if(r.status!=="PASS") return {name,status:["FAIL","SKIP","BLOCKED"].includes(r.status)?r.status:"BLOCKED",reason:r.reason||"Required gate did not pass"};
    if(r.executed!==true || !(r.passed>0) || r.failed!==0 || r.skipped!==0) return {name,status:"BLOCKED",reason:"Missing, empty or skipped execution cannot pass release"};
    return {name,status:"PASS"};
  });
  return {status:gates.some(g=>g.status==="FAIL")?"FAIL":gates.every(g=>g.status==="PASS")?"PASS":"BLOCKED",gates};
}
