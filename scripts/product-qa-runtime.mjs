import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { readEnv } from "./testing/environment.mjs";

// Only public, anonymous configuration is inherited. Never load payment/admin credentials.
const source = readEnv(".env.local");
const env = { ...process.env };
for (const file of [".env", ".env.local", ".env.test", ".env.production", ".env.production.local"]) {
  for (const key of Object.keys(readEnv(file))) env[key] = "";
}
for (const key of Object.keys(env)) if (/SUPABASE|IYZICO|UPSTASH|SENTRY|OPENAI|NETGSM|SMTP|CRON_SECRET|ANALYTICS|META_PIXEL/.test(key)) env[key] = "";
env.NEXT_PUBLIC_SUPABASE_URL = source.NEXT_PUBLIC_SUPABASE_URL || "";
env.NEXT_PUBLIC_SUPABASE_ANON_KEY = source.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
env.NEXT_PUBLIC_SITE_URL = "http://127.0.0.1:3117";
env.NEXT_TELEMETRY_DISABLED = "1";
env.FUWU_QA_TELEMETRY = path.resolve("artifacts/product-qa", `server-fetch-${process.env.QA_STAGE || "before"}.jsonl`);
env.NODE_OPTIONS = `--import=${new URL("./testing/product-readonly-fetch.mjs", import.meta.url).href}`;
fs.mkdirSync("artifacts/product-qa", { recursive: true });
const mode = process.argv[2];
if (!["build", "serve"].includes(mode)) throw new Error("Expected build or serve");
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", ...(mode === "build" ? ["build", "--webpack"] : ["start", "--hostname", "127.0.0.1", "--port", "3117"])], { env, windowsHide: true, stdio: "inherit" });
child.on("exit", code => { process.exitCode = code ?? 1; });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
