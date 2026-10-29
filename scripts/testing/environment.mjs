import fs from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

export function readEnv(file) {
  return fs.existsSync(file) ? parseEnv(fs.readFileSync(file, "utf8")) : {};
}

export function isLoopbackUrl(value) {
  try {
    const u = new URL(value);
    return ["http:", "https:"].includes(u.protocol) &&
      ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname) &&
      !u.username && !u.password && !u.search && !u.hash && u.pathname === "/";
  } catch { return false; }
}

function projectRef(value) {
  try { return new URL(value).hostname.match(/^([a-z0-9]{20})\.supabase\.co$/)?.[1] ?? null; }
  catch { return null; }
}

function jwtClaims(value) {
  try { return JSON.parse(Buffer.from(value.split(".")[1], "base64url").toString()); }
  catch { return null; }
}

// This function never sends a request. Production and unclassified developer targets
// are denied even if someone accidentally adds them to the staging allowlist.
export function validateTestEnvironment(env, policy, protectedEnvs = []) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const service = env.SUPABASE_SERVICE_ROLE_KEY || "";
  const denyRefs = new Set([...policy.protectedProjectRefs, ...protectedEnvs.map(e => projectRef(e.NEXT_PUBLIC_SUPABASE_URL))].filter(Boolean));
  const keyNames = ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"];
  for (const source of protectedEnvs) {
    if (isLoopbackUrl(source.NEXT_PUBLIC_SUPABASE_URL)) continue;
    for (const key of keyNames) if (env[key] && source[key] && env[key] === source[key]) throw new Error("BLOCKED: protected Supabase key in test environment");
  }
  for (const key of keyNames) {
    const claims = jwtClaims(env[key] || "");
    if (claims?.ref && denyRefs.has(claims.ref)) throw new Error("BLOCKED: protected Supabase key claims");
  }
  if (url) {
    const ref = projectRef(url);
    if (ref && denyRefs.has(ref)) throw new Error("BLOCKED: protected Supabase target");
    if (!isLoopbackUrl(url)) {
      const parsed = new URL(url);
      if (env.E2E_ALLOW_REMOTE_SUPABASE_TESTS !== "true" || !ref ||
          !policy.remoteTestProjectRefs.includes(ref) || parsed.protocol !== "https:" ||
          parsed.port || parsed.pathname !== "/" || parsed.username || parsed.password || parsed.search || parsed.hash) {
        throw new Error("BLOCKED: Supabase target is not an allowlisted test project");
      }
    }
    for (const [key, role] of [[anon, "anon"], [service, "service_role"]]) {
      if(!key) continue;
      const claims = jwtClaims(key);
      if(!claims || claims.role!==role || (!isLoopbackUrl(url) && claims.ref!==ref)) throw new Error("BLOCKED: Supabase keys must have test target/role claims");
      if (claims && (claims.role !== role || (claims.ref && claims.ref !== ref && !(isLoopbackUrl(url) && claims.ref === "supabase-demo")))) {
        throw new Error("BLOCKED: Supabase key does not match test target/role");
      }
    }
  } else if (anon || service) throw new Error("BLOCKED: keys without a test target");
  if (env.E2E_MAILPIT_URL && !isLoopbackUrl(env.E2E_MAILPIT_URL)) throw new Error("BLOCKED: Mailpit must be local");
  if (env.PLAYWRIGHT_BASE_URL && !isLoopbackUrl(env.PLAYWRIGHT_BASE_URL)) throw new Error("BLOCKED: application must be local");
  if (env.IYZICO_BASE_URL && env.IYZICO_BASE_URL !== "https://sandbox-api.iyzipay.com") throw new Error("BLOCKED: payment tests require iyzico sandbox");
  if (env.IYZICO_API_KEY || env.IYZICO_SECRET_KEY) throw new Error("BLOCKED: real payment credentials require the separate sandbox E2E runner");
  return { ready: Boolean(url && anon && service), reason: url && anon && service ? "allowlisted test target" : "SKIP: isolated Supabase Auth/DB environment is not configured" };
}

export function loadTestEnvironment(root = process.cwd()) {
  const env = { ...readEnv(path.join(root, ".env.test")), ...process.env };
  const policy = JSON.parse(fs.readFileSync(path.join(root, "config/test-targets.json"), "utf8"));
  const protectedEnvs = [".env", ".env.local", ".env.production", ".env.production.local"].map(f => readEnv(path.join(root, f)));
  const safety = validateTestEnvironment(env, policy, protectedEnvs);
  const keep=new Set(["NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_ANON_KEY","SUPABASE_SERVICE_ROLE_KEY","E2E_ALLOW_REMOTE_SUPABASE_TESTS","E2E_MAILPIT_URL"]);
  for(const source of protectedEnvs) for(const key of Object.keys(source)) if(!keep.has(key) && !key.startsWith("E2E_")) env[key]="";
  // Explicit blanks prevent Next's env loader from falling back to .env.local.
  for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY", "IYZICO_API_KEY", "IYZICO_SECRET_KEY", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "SENTRY_AUTH_TOKEN", "OPENAI_API_KEY", "NETGSM_USERCODE", "NETGSM_PASSWORD"]) {
    env[key] = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"].includes(key) ? env[key] || "" : "";
  }
  env.IYZICO_BASE_URL = "https://sandbox-api.iyzipay.com";
  return { env, safety };
}
