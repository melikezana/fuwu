import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { readEnv } from "../../scripts/testing/environment.mjs";
import { sourceHash } from "../../scripts/testing/evidence.mjs";

// Read-only application audit. All suites use offline mocks; build has no credentials.
const output = path.resolve(process.env.FUWU_AUDIT_OUTPUT_DIR || "artifacts/phase0-20261030");
fs.mkdirSync(output, { recursive: true });
const env = { ...process.env };
const temp = path.resolve("artifacts/commerce-test-runtime/marketplace3-tmp");
fs.mkdirSync(temp, { recursive: true });
Object.assign(env, { TEMP: temp, TMP: temp });
for (const file of [".env", ".env.local", ".env.test", ".env.production", ".env.production.local"]) {
  for (const key of Object.keys(readEnv(file))) env[key] = "";
}
for (const key of Object.keys(env)) {
  if (/SUPABASE|IYZICO|UPSTASH|SENTRY|OPENAI|NETGSM|SMTP|CRON_SECRET/.test(key)) env[key] = "";
}
Object.assign(env, {
  NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "", SUPABASE_SERVICE_ROLE_KEY: "",
  FUWU_SANDBOX_CHECKOUT_ENABLED: "false", NEXT_TELEMETRY_DISABLED: "1",
  NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3109",
});
const report = {
  scope: "Current working tree, offline checks only; no deployment, database writes or payment processor calls",
  sourceHash: sourceHash(), startedAt: new Date().toISOString(), node: process.version, checks: [],
};
const commands = [
  ["typecheck", ["node_modules/typescript/bin/tsc", "--noEmit", "--incremental", "false"]],
  ["lint", ["node_modules/eslint/bin/eslint.js"]],
  ["unit", ["node_modules/vitest/vitest.mjs", "run", "--config", "vitest.unit.config.ts", "--outputFile", path.join(output, "unit.json")]],
  ["security", ["node_modules/vitest/vitest.mjs", "run", "--config", "vitest.security.config.ts", "--outputFile", path.join(output, "security.json")]],
  ["static-security", ["scripts/check-security.mjs"]],
  ["build", ["node_modules/next/dist/bin/next", "build", "--webpack"]],
];
for (const [name, args] of commands.filter(([name]) => !process.argv[2] || process.argv[2].split(",").includes(name))) {
  const startedAt = new Date().toISOString();
  console.log(`Starting ${name}`);
  const result = spawnSync(process.execPath, args, { env, windowsHide: true, encoding: "utf8", timeout: 300000, maxBuffer: 20 * 1024 * 1024 });
  fs.writeFileSync(path.join(output, `${name}.log`), (result.stdout || "") + (result.stderr || ""));
  const check = { name, status: result.status === 0 && !result.error ? "PASS" : "FAIL", exitCode: result.status, error: result.error?.code ?? null, startedAt, completedAt: new Date().toISOString() };
  if (["unit", "security"].includes(name)) {
    const file = path.join(output, `${name}.json`);
    if (fs.existsSync(file)) {
      const tests = JSON.parse(fs.readFileSync(file, "utf8"));
      Object.assign(check, { passed: tests.numPassedTests, failed: tests.numFailedTests, skipped: tests.numPendingTests + tests.numTodoTests });
    }
  }
  report.checks.push(check);
  report.completedAt = new Date().toISOString();
  fs.writeFileSync(path.join(output, "local-checks.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(check));
}
process.exitCode = report.checks.every(check => check.status === "PASS") ? 0 : 1;
