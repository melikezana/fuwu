import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { completeOAuthSignIn } from "../src/lib/auth/oauth";
import { createSafeRedirectUrl, getRequestOrigin, getSafeRedirectPath } from "../src/lib/security/safeRedirect";

// Deliberately offline: OAuth/session HTTP is mocked, no Google account or real Supabase user is used.
async function main() {
  const checks: { name: string; expected: string; actual: string }[] = [];
  async function check(name: string, run: () => void | Promise<void>) { await run(); checks.push({ name, expected: "assertions pass", actual: "PASS" }); console.log("PASS " + name); }
  for (const unsafe of ["https://evil.test", "//evil.test", "/\\evil.test", "/\t/evil.test", "/\n/evil.test", "/%2f%2fevil.test", "/%5cevil.test", "/%09/evil.test", "javascript:alert(1)", "/%invalid"]) {
    await check("Open redirect denied: " + JSON.stringify(unsafe), () => assert.equal(getSafeRedirectPath(unsafe, "/account"), "/account"));
  }
  for (const origin of ["https://www.fuwu.com.tr", "https://fuwu.com.tr", "https://fuwu-preview.vercel.app", "http://localhost:3000"]) {
    await check("Callback stays on its initiating origin: " + origin, () => assert.equal(createSafeRedirectUrl("/services/musluk-montaji?provider=chosen", origin).origin, origin));
  }
  await check("Safe next retains service selection parameters", () => assert.equal(getSafeRedirectPath("/services/musluk-montaji?district=a&provider=b"), "/services/musluk-montaji?district=a&provider=b"));
  await check("Loopback OAuth callback retains 127.0.0.1 cookie origin without trusting arbitrary Host", () => { assert.equal(getRequestOrigin(new NextRequest("http://127.0.0.1:3046/auth/callback",{headers:{host:"127.0.0.1:3046"}})),"http://127.0.0.1:3046");assert.equal(getRequestOrigin(new NextRequest("http://localhost:3046/auth/callback",{headers:{host:"evil.test"}})),"http://localhost:3046"); });
  await check("PKCE exchange and verified user precede profile creation", async () => {
    const sequence: string[] = [];
    assert.equal(await completeOAuthSignIn({ exchange: async () => { sequence.push("exchange"); return true; }, verifyUser: async () => { sequence.push("verify"); return true; }, ensureProfile: async () => { sequence.push("profile"); } }), null);
    assert.deepEqual(sequence, ["exchange", "verify", "profile"]);
  });
  await check("Expired/invalid PKCE code never creates a profile", async () => {
    let profile = false;
    assert.equal(await completeOAuthSignIn({ exchange: async () => false, verifyUser: async () => { throw new Error("must not run"); }, ensureProfile: async () => { profile = true; } }), "oauth_exchange_failed"); assert.equal(profile, false);
  });
  await check("Missing verified user cannot continue checkout", async () => assert.equal(await completeOAuthSignIn({ exchange: async () => true, verifyUser: async () => false, ensureProfile: async () => { throw new Error("must not run"); } }), "oauth_exchange_failed"));
  await check("Auth network failure returns an actionable error", async () => assert.equal(await completeOAuthSignIn({ exchange: async () => { throw new Error("network"); }, verifyUser: async () => true, ensureProfile: async () => {} }), "oauth_unavailable"));
  await check("Profile failure is not reported as completed sign-in", async () => assert.equal(await completeOAuthSignIn({ exchange: async () => true, verifyUser: async () => true, ensureProfile: async () => { throw new Error("RLS"); } }), "profile_unavailable"));

  const previous = { url: process.env.NEXT_PUBLIC_SUPABASE_URL, anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, service: process.env.SUPABASE_SERVICE_ROLE_KEY };
  const originalFetch = globalThis.fetch;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://local.supabase.test";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "offline-mock-anon";
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  const user = { id: "00000000-0000-4000-8000-000000000001", email: "fixture@fuwu.test", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: { role: "admin", is_admin: true }, created_at: new Date().toISOString() };
  const jwt = (expires: number) => `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: user.id, exp: expires, iat: Math.floor(Date.now()/1000), aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: user.user_metadata })).toString("base64url")}.offlineMockSignature`;
  const freshToken = jwt(Math.floor(Date.now()/1000)+3600);
  const staleSession = { access_token: jwt(1000), refresh_token: "offline-stale-refresh", expires_at: 1000, expires_in: 3600, token_type: "bearer", user };
  const cookie = `sb-local-auth-token=base64-${Buffer.from(JSON.stringify(staleSession)).toString("base64url")}`;
  let refreshed = 0;
  globalThis.fetch = async input => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.includes("/auth/v1/token")) { refreshed++; return Response.json({ access_token: freshToken, refresh_token: "offline-new-refresh", token_type: "bearer", expires_in: 3600, user }); }
    if (url.includes("/auth/v1/user")) return Response.json(user);
    if (url.includes("/rest/v1/rpc/current_user_is_admin")) return Response.json(false);
    if (url.includes("/rest/v1/audit_logs")) return new Response(null, { status: 201 });
    throw new Error("Unexpected mocked URL: " + url);
  };
  try {
    const { proxy: middleware } = await import("../src/proxy");
    await check("Active Next.js proxy applies local WebKit CSP without weakening remote CSP", async () => {
      const local = await middleware(new NextRequest("http://127.0.0.1:3067/services/musluk-montaji", { headers: { host: "127.0.0.1:3067" } }));
      assert.ok(!local.headers.get("content-security-policy")?.includes("upgrade-insecure-requests"));
      const remote = await middleware(new NextRequest("https://www.fuwu.com.tr/services"));
      assert.ok(remote.headers.get("content-security-policy")?.includes("upgrade-insecure-requests"));
      assert.match(remote.headers.get("content-security-policy") || "", /'nonce-[^']+'/);
    });
    await check("Active Next.js proxy keeps legacy order tracking protected", async () => {
      const response = await middleware(new NextRequest("https://www.fuwu.com.tr/order-tracking/fixture"));
      assert.equal(new URL(response.headers.get("location")!).searchParams.get("next"), "/order-tracking/fixture");
    });
    await check("Protected proxy fails closed when Supabase configuration is absent", async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL; delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      try { const response = await middleware(new NextRequest("https://www.fuwu.com.tr/orders"));assert.equal(new URL(response.headers.get("location")!).pathname, "/login"); }
      finally { process.env.NEXT_PUBLIC_SUPABASE_URL = "https://local.supabase.test"; process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "offline-mock-anon"; }
    });
    await check("Refreshed SSR cookie reaches both response and downstream server request", async () => {
      const response = await middleware(new NextRequest("https://www.fuwu.com.tr/account?view=addresses", { headers: { cookie } }));
      assert.ok(refreshed > 0); assert.ok(response.cookies.getAll().some(c => c.name.startsWith("sb-local-auth-token") && c.value !== cookie));
      assert.ok(response.headers.get("x-middleware-request-cookie")?.includes("sb-local-auth-token")); assert.equal(response.headers.get("cache-control"), "private, no-store");
    });
    await check("Public service page also refreshes an existing session", async () => {
      const response = await middleware(new NextRequest("https://www.fuwu.com.tr/services/musluk-montaji", { headers: { cookie } }));
      assert.ok(response.cookies.getAll().length > 0);
    });
    await check("User-editable admin metadata grants no admin access; redirect retains renewed cookies", async () => {
      const response = await middleware(new NextRequest("https://www.fuwu.com.tr/admin/marketplace", { headers: { cookie } }));
      assert.equal(new URL(response.headers.get("location")!).pathname, "/dashboard"); assert.ok(response.cookies.getAll().length > 0);
    });
    await check("Unauthenticated redirect preserves page and query for login resume", async () => {
      const response = await middleware(new NextRequest("https://www.fuwu.com.tr/orders?status=pending"));
      assert.equal(new URL(response.headers.get("location")!).searchParams.get("next"), "/orders?status=pending");
    });
    await check("Expired refresh token clears the session and preserves the login return path", async () => {
      globalThis.fetch = async () => Response.json({ error: "invalid_grant", error_code: "refresh_token_not_found", msg: "Refresh token not found" }, { status: 400 });
      const response = await middleware(new NextRequest("https://www.fuwu.com.tr/orders?view=active", { headers: { cookie } }));
      assert.equal(new URL(response.headers.get("location")!).pathname,"/login");
      assert.equal(new URL(response.headers.get("location")!).searchParams.get("next"),"/orders?view=active");
    });
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries({ NEXT_PUBLIC_SUPABASE_URL: previous.url, NEXT_PUBLIC_SUPABASE_ANON_KEY: previous.anon, SUPABASE_SERVICE_ROLE_KEY: previous.service })) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
  mkdirSync("artifacts/fusion", { recursive: true });
  writeFileSync("artifacts/fusion/auth-tests.json", JSON.stringify({ scope: "Active Next.js 16 proxy + mocked Auth HTTP + real Supabase SSR cookies; not Google/real-device E2E", checks }, null, 2));
  console.log(`${checks.length} local auth checks passed.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
