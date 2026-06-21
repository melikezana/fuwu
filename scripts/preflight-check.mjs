import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const results = [];

function loadEnvFile(fileName) {
  const path = join(root, fileName);

  if (!existsSync(path)) {
    return;
  }

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();

    if (process.env[key]) {
      continue;
    }

    process.env[key] = trimmedLine
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
}

function record(name, passed, details) {
  results.push({ details, name, passed });
  console.log(`[${passed ? "PASS" : "FAIL"}] ${name}${details ? ` - ${details}` : ""}`);
}

function hasEnv(name) {
  return Boolean(process.env[name]?.trim());
}

function checkEnvironment() {
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];

  if ((process.env.PREFLIGHT_ENV ?? process.env.VERCEL_ENV) === "production") {
    required.push("NEXT_PUBLIC_SITE_URL");
  }

  const missing = required.filter((name) => !hasEnv(name));
  record(
    "critical environment variables",
    missing.length === 0,
    missing.length === 0 ? "configured" : `missing: ${missing.join(", ")}`,
  );

  const upstashValues = [
    hasEnv("UPSTASH_REDIS_REST_URL"),
    hasEnv("UPSTASH_REDIS_REST_TOKEN"),
  ];
  record(
    "Upstash environment pair",
    upstashValues.every(Boolean) || upstashValues.every((value) => !value),
    upstashValues.every(Boolean)
      ? "configured"
      : upstashValues.every((value) => !value)
        ? "not configured; database fallback will be used"
        : "URL and token must be configured together",
  );

  const smsProvider = (process.env.SMS_PROVIDER ?? "mock").trim().toLowerCase();
  const supportedSmsProvider = smsProvider === "mock" || smsProvider === "netgsm";
  const missingNetgsm =
    smsProvider === "netgsm"
      ? ["NETGSM_USERCODE", "NETGSM_PASSWORD", "NETGSM_HEADER"].filter(
          (name) => !hasEnv(name),
        )
      : [];

  record(
    "SMS provider configuration",
    supportedSmsProvider && missingNetgsm.length === 0,
    !supportedSmsProvider
      ? `unsupported provider: ${smsProvider}`
      : missingNetgsm.length > 0
        ? `missing: ${missingNetgsm.join(", ")}`
        : `provider: ${smsProvider}`,
  );

  const sentryDsnConfigured = hasEnv("NEXT_PUBLIC_SENTRY_DSN");
  const sentryBuildValues = [
    "SENTRY_ORG",
    "SENTRY_PROJECT",
    "SENTRY_AUTH_TOKEN",
  ].filter(hasEnv);
  record(
    "Sentry configuration",
    !sentryDsnConfigured || sentryBuildValues.length === 0 || sentryBuildValues.length === 3,
    sentryDsnConfigured
      ? sentryBuildValues.length === 3
        ? "runtime reporting and source-map upload configured"
        : "runtime reporting configured; source-map upload credentials omitted"
      : "DSN not configured; Sentry is a no-op",
  );
}

function runCommand(name, command, args) {
  const result = spawnSync([command, ...args].join(" "), {
    cwd: root,
    env: process.env,
    shell: true,
    stdio: "inherit",
  });
  const passed = result.status === 0;

  record(
    name,
    passed,
    passed
      ? "completed"
      : result.error?.message ?? `exit code ${result.status ?? "unknown"}`,
  );
}

loadEnvFile(".env.local");
loadEnvFile(".env");

console.log("FUWU production readiness preflight");
checkEnvironment();

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

runCommand("lint", npmCommand, ["run", "lint"]);
runCommand("build", npmCommand, ["run", "build"]);
runCommand("backend static health", npmCommand, ["run", "check:backend"]);

if (process.env.PREFLIGHT_SKIP_DB === "true") {
  record("backend DB health", true, "explicitly skipped with PREFLIGHT_SKIP_DB=true");
} else {
  runCommand("backend DB health", npmCommand, ["run", "check:backend:db"]);
}

const failures = results.filter((result) => !result.passed);

if (failures.length > 0) {
  console.error(`Preflight failed with ${failures.length} failure(s).`);
  process.exit(1);
}

console.log("Preflight passed.");
