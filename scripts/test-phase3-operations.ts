import { isSupabaseSessionCookie } from "../src/lib/auth/session-cookies";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { evidenceState, type HealthEvidence } from "../src/lib/commerce/operations-health";
import { probeExternalServices } from "../src/services/health/operations";
async function main() {
const checks: string[] = [];
async function check(name: string, run: () => unknown) { await run(); checks.push(name); console.log("PASS " + name); }
const previous = { fetch: globalThis.fetch, url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY };
try {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://offline.supabase.test"; process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "offline-public-key";
  await check("Health probes use read-only endpoints; connectivity never claims a completed payment", async () => {
    globalThis.fetch = async (input, init) => {
      assert.ok(!init?.method || init.method === "GET"); assert.equal(init?.cache,"no-store");
      return String(input).includes("auth/v1/settings") ? Response.json({ external: { google: true } }) : Response.json({ status: "success" });
    };
    const probes = await probeExternalServices(); assert.ok(probes.every(p => p.passed));
    assert.ok(probes.find(p => p.name === "iyzico")?.detail.includes("doğrulamaz"));
    assert.ok(probes.find(p => p.name === "google")?.detail.includes("ayrıca gerekli"));
  });
  await check("Disabled Google and invalid sandbox response are failures despite configured environment", async () => {
    globalThis.fetch = async () => Response.json({ external: { google: false }, status: "failure" });
    assert.ok((await probeExternalServices()).every(p => !p.passed));
  });
  await check("Network and invalid JSON failures are recorded without raw sensitive response data", async () => {
    globalThis.fetch = async () => { throw new Error("secret-test-token"); };
    const probes = await probeExternalServices(); assert.ok(probes.every(p => !p.passed)); assert.ok(!JSON.stringify(probes).includes("secret-test-token"));
    globalThis.fetch = async () => new Response("not json"); assert.ok((await probeExternalServices()).every(p => !p.passed));
  });
  await check("Logout clears only Supabase session chunks and PKCE cookies", () => {
    for(const name of ["sb-project-auth-token","sb-project-auth-token.0","sb-project-auth-token-code-verifier"]) assert.ok(isSupabaseSessionCookie(name));
    for(const name of ["consent","auth-token","sb-preference","other-session"]) assert.ok(!isSupabaseSessionCookie(name));
  });
  await check("Missing configuration never certifies Google authentication", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    globalThis.fetch = async () => Response.json({ status: "success" });
    assert.equal((await probeExternalServices()).find(p => p.name === "google")?.passed,false);
  });
  await check("Health presentation distinguishes never tested, failed, stale and recent evidence", () => {
    const now=Date.parse("2026-10-26T10:00:00Z");
    const p={ name:"cron",passed:true,detail:"test",checked_at:"2026-10-26T09:00:00Z",last_success_at:"2026-10-26T09:00:00Z" } as HealthEvidence;
    assert.equal(evidenceState(undefined,now),"Kontrol edilmedi"); assert.equal(evidenceState({...p,passed:false},now),"Son kontrol başarısız");
    assert.equal(evidenceState({...p,checked_at:"2026-10-24T09:00:00Z"},now),"Kontrol güncel değil"); assert.equal(evidenceState(p,now),"Kontrol başarılı");
  });
} finally {
  globalThis.fetch=previous.fetch;
  for(const [name,value] of Object.entries({ NEXT_PUBLIC_SUPABASE_URL:previous.url, NEXT_PUBLIC_SUPABASE_ANON_KEY:previous.key })) { if(value===undefined) delete process.env[name]; else process.env[name]=value; }
  mkdirSync("artifacts/phase3",{recursive:true});writeFileSync("artifacts/phase3/health-unit-tests.json",JSON.stringify({scope:"Mock HTTP and pure health evidence logic",checks},null,2));
}

}
main().catch(error => { console.error(error); process.exitCode = 1; });
