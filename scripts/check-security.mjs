import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
const files=[];
function walk(dir) {for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {const f=path.join(dir,entry.name);if(entry.isDirectory())walk(f);else if(/\.(ts|tsx)$/.test(f))files.push(f);}}
walk("src");
for(const file of files) {
  const text=fs.readFileSync(file,"utf8");
  assert.doesNotMatch(text,/NEXT_PUBLIC_[A-Z_]*(?:SERVICE_ROLE|SECRET_KEY)/,`public secret in ${file}`);
  if(/^\s*["']use client["']/.test(text)) assert.doesNotMatch(text,/(?:from\s*["'][^"']*supabase\/serviceRole|SUPABASE_SERVICE_ROLE_KEY)/,`service role imported by browser in ${file}`);
  assert.doesNotMatch(text,/dangerouslySetInnerHTML\s*=\s*\{\{\s*__html:\s*(?:comment|review\.comment|message)/,`unescaped user HTML in ${file}`);
}
assert.ok(fs.readFileSync("playwright.config.ts","utf8").includes("reuseExistingServer: false"));
console.log(`PASS static boundary checks across ${files.length} source files (not a dynamic security scan)`);
