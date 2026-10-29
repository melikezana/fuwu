import fs from "node:fs";
import path from "node:path";
import { output, sourceHash, evaluateRelease } from "./testing/evidence.mjs";
const records={};
if(fs.existsSync(output)) for(const file of fs.readdirSync(output).filter(f=>f.endsWith("-result.json"))) {
  try {records[file.replace(/-result\.json$/,"")]=JSON.parse(fs.readFileSync(path.join(output,file),"utf8"));} catch { /* Invalid evidence remains BLOCKED. */ }
}
const result={...evaluateRelease(records,sourceHash()),evaluatedAt:new Date().toISOString(),scope:"Evidence validation only; no deployment, DB mutation or processor call"};
fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,"release-gate.json"),JSON.stringify(result,null,2));
for(const g of result.gates) console.log(`${g.status}: ${g.name}${g.reason?` — ${g.reason}`:""}`);
console.log(`Release: ${result.status}`);
if(result.status!=="PASS") process.exitCode=1;
