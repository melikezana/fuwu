import {describe,expect,it,vi} from "vitest";
import {isSupabaseSessionCookie} from "@/lib/auth/session-cookies";
describe("CSP and session boundaries",()=>{
  it("uses nonce/strict-dynamic and blocks frames, plugins and production eval",async()=>{
    vi.stubEnv("NODE_ENV","production");vi.resetModules();
    const {createContentSecurityPolicyHeaderValue}=await import("@/lib/security/securityHeaders");
    const csp=createContentSecurityPolicyHeaderValue("fixture-nonce","https://fuwu.test");
    expect(csp).toContain("'nonce-fixture-nonce'");expect(csp).toContain("'strict-dynamic'");
    expect(csp).toContain("frame-ancestors 'none'");expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain("'unsafe-eval'");expect(csp).not.toContain("http://localhost");
    expect(csp).toContain("upgrade-insecure-requests");
  });
  it("identifies only Supabase session chunks and PKCE cookie for logout",()=>{
    for(const name of ["sb-fixture-auth-token","sb-fixture-auth-token.0","sb-fixture-auth-token-code-verifier"]) expect(isSupabaseSessionCookie(name)).toBe(true);
    for(const name of ["cookie-consent","sb-fixture-other","arbitrary-auth-token"]) expect(isSupabaseSessionCookie(name)).toBe(false);
  });
});
