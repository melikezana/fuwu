import { describe, expect, it } from "vitest";
import { isLoopbackUrl, validateTestEnvironment } from "../../scripts/testing/environment.mjs";
const staging="abcdefghijklmnopqrst", production="bjhyisomjadirdchruix";
const policy={remoteTestProjectRefs:[staging],protectedProjectRefs:[production]};
const jwt=(claims:Record<string,unknown>)=>`e30.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.fixture`;
const keys={NEXT_PUBLIC_SUPABASE_ANON_KEY:jwt({role:"anon"}),SUPABASE_SERVICE_ROLE_KEY:jwt({role:"service_role"})};
const stagingKeys={NEXT_PUBLIC_SUPABASE_ANON_KEY:jwt({role:"anon",ref:staging}),SUPABASE_SERVICE_ROLE_KEY:jwt({role:"service_role",ref:staging})};
describe("write-test production firewall",()=>{
  it.each(["http://localhost.evil.test","http://127.0.0.1.evil.test","http://127.0.0.12","http://u:p@localhost","https://evil.test","file:///etc/passwd","garbage"]) ("does not treat deceptive URL %s as loopback",url=>expect(isLoopbackUrl(url)).toBe(false));
  it("blocks production even if remote flag and allowlist mistakenly permit it",()=>{
    const env={...keys,NEXT_PUBLIC_SUPABASE_URL:`https://${production}.supabase.co`,E2E_ALLOW_REMOTE_SUPABASE_TESTS:"true"};
    expect(()=>validateTestEnvironment(env,{...policy,remoteTestProjectRefs:[production]})).toThrow("protected");
  });
  it("requires both a staging allowlist and explicit remote opt-in",()=>{
    const env={...stagingKeys,NEXT_PUBLIC_SUPABASE_URL:`https://${staging}.supabase.co`,E2E_ALLOW_REMOTE_SUPABASE_TESTS:"true"};
    expect(validateTestEnvironment(env,policy).ready).toBe(true);
    expect(()=>validateTestEnvironment({...env,E2E_ALLOW_REMOTE_SUPABASE_TESTS:"false"},policy)).toThrow();
    expect(()=>validateTestEnvironment(env,{...policy,remoteTestProjectRefs:[]})).toThrow();
  });
  it("blocks protected keys reused against a local URL and keys from another project",()=>{
    const env={...keys,NEXT_PUBLIC_SUPABASE_URL:"http://127.0.0.1:54321"};
    expect(()=>validateTestEnvironment(env,policy,[{...keys,NEXT_PUBLIC_SUPABASE_URL:`https://${production}.supabase.co`}])).toThrow("protected");
    expect(()=>validateTestEnvironment({...env,SUPABASE_SERVICE_ROLE_KEY:jwt({ref:production,role:"service_role"})},policy)).toThrow("protected");
    expect(()=>validateTestEnvironment({...env,SUPABASE_SERVICE_ROLE_KEY:jwt({ref:staging,role:"service_role"})},policy)).toThrow("does not match");
    expect(()=>validateTestEnvironment({...env,SUPABASE_SERVICE_ROLE_KEY:jwt({role:"anon"})},policy)).toThrow("target/role");
  });
  it("protects unclassified .env.local project even if omitted from explicit denylist",()=>{
    const env={...keys,NEXT_PUBLIC_SUPABASE_URL:`https://${staging}.supabase.co`,E2E_ALLOW_REMOTE_SUPABASE_TESTS:"true"};
    expect(()=>validateTestEnvironment(env,policy,[{NEXT_PUBLIC_SUPABASE_URL:env.NEXT_PUBLIC_SUPABASE_URL}])).toThrow("protected");
  });
  it("uses SKIP for missing Auth/DB setup and permits isolated local keys",()=>{
    expect(validateTestEnvironment({},policy)).toMatchObject({ready:false,reason:expect.stringContaining("SKIP")});
    expect(validateTestEnvironment({...keys,NEXT_PUBLIC_SUPABASE_URL:"http://localhost:54321"},policy).ready).toBe(true);
    expect(()=>validateTestEnvironment(keys,policy)).toThrow();
  });
  it("blocks live payment API, inherited payment credentials and remote app/Mailpit",()=>{
    for(const env of [{IYZICO_BASE_URL:"https://api.iyzipay.com"},{IYZICO_API_KEY:"live"},{PLAYWRIGHT_BASE_URL:"https://fuwu.com"},{E2E_MAILPIT_URL:"https://mail.evil.test"}]) expect(()=>validateTestEnvironment(env,policy)).toThrow("BLOCKED");
  });
});
