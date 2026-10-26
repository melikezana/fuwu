import assert from "node:assert/strict";
import fs from "node:fs";
const base=process.env.FUSION_BASE_URL||"http://127.0.0.1:3069";
assert.ok(["localhost","127.0.0.1"].includes(new URL(base).hostname));
const report={scope:"Actual localhost production build, guest HTTP; no remote mutation or real account",checks:[],failed:null};
try {
  for(const endpoint of ["orders","orders/40000000-0000-4000-8000-000000000001","checkout","store","store/variants"]) {
    const response=await fetch(`${base}/api/commerce/${endpoint}`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});assert.equal(response.status,401);
    const cross=await fetch(`${base}/api/commerce/${endpoint}`,{method:"POST",headers:{"Content-Type":"application/json",Origin:"https://untrusted.invalid"},body:"{}"});assert.equal(cross.status,403);
    report.checks.push(`${endpoint}: guest 401 and foreign origin 403`);
  }
  const logout=await fetch(base+"/api/auth/logout",{method:"POST",headers:{Cookie:"sb-offline-auth-token.0=fictional; sb-offline-auth-token-code-verifier=fictional; consent=keep"},redirect:"manual"});assert.equal(logout.status,303);assert.equal(logout.headers.get("cache-control"),"private, no-store");
  const cookies=logout.headers.getSetCookie();assert.ok(cookies.some(c=>c.includes("sb-offline-auth-token.0=")&&c.includes("Max-Age=0")));assert.ok(cookies.some(c=>c.includes("sb-offline-auth-token-code-verifier=")&&c.includes("Max-Age=0")));assert.ok(!cookies.some(c=>c.startsWith("consent=")));
  assert.equal((await fetch(base+"/api/auth/logout",{method:"POST",headers:{Origin:"https://untrusted.invalid"},redirect:"manual"})).status,403);report.checks.push("Logout expires session/PKCE chunks, preserves unrelated cookies, returns 303 and rejects foreign origin");
  for(const route of ["/account?view=reviews","/provider-dashboard/calendar","/provider-dashboard/payment-info","/admin/marketplace?view=health"]) {
    const response=await fetch(base+route,{redirect:"manual"});assert.ok([307,303].includes(response.status));const location=new URL(response.headers.get("location"),base);assert.equal(location.pathname,"/login");assert.equal(location.searchParams.get("next"),route);
  }
  report.checks.push("Customer, provider and admin routes retain safe login return paths");
  assert.equal((await fetch(base+"/api/cron/commerce-expiry")).status,401);report.checks.push("Cron rejects unauthorized invocation");
}catch(e){report.failed=String(e.stack||e);process.exitCode=1;}
fs.mkdirSync("artifacts/phase3",{recursive:true});fs.writeFileSync("artifacts/phase3/runtime-http-tests.json",JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
