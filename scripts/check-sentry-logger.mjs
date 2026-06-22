import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const logger = readFileSync(
  join(root, "src", "lib", "logger", "logger.ts"),
  "utf8",
);
const configFiles = [
  "sentry.client.config.ts",
  "sentry.edge.config.ts",
  "sentry.server.config.ts",
];

const checks = [
  {
    name: "logger imports @sentry/nextjs directly",
    passed: /import \* as Sentry from ["']@sentry\/nextjs["']/.test(logger),
  },
  {
    name: "warning events use captureMessage",
    passed:
      /Sentry\.captureMessage\(message,\s*\{[\s\S]*?level:\s*["']warning["']/.test(
        logger,
      ),
  },
  {
    name: "Error instances use captureException",
    passed:
      /error instanceof Error[\s\S]*?Sentry\.captureException\(error,\s*\{\s*extra\s*\}\)/.test(
        logger,
      ),
  },
  {
    name: "non-Error values use captureMessage",
    passed:
      /Sentry\.captureMessage\(String\(error\),\s*\{[\s\S]*?level:\s*["']error["']/.test(
        logger,
      ),
  },
  {
    name: "Sentry calls are protected by silent catch blocks",
    passed:
      (logger.match(/catch\s*\{\s*\/\/ Monitoring must never break the application logger\./g) ??
        []).length === 2,
  },
];

for (const fileName of configFiles) {
  const config = readFileSync(join(root, fileName), "utf8");

  checks.push({
    name: `${fileName} disables Sentry without a DSN`,
    passed:
      /const dsn = process\.env\.NEXT_PUBLIC_SENTRY_DSN/.test(config) &&
      /enabled:\s*Boolean\(dsn\)/.test(config),
  });
}

for (const check of checks) {
  console.log(`[${check.passed ? "PASS" : "FAIL"}] ${check.name}`);
}

const failures = checks.filter((check) => !check.passed);

if (failures.length > 0) {
  console.error(`Sentry logger check failed with ${failures.length} failure(s).`);
  process.exit(1);
}

console.log(
  "Sentry logger check passed: capture calls remain no-op when NEXT_PUBLIC_SENTRY_DSN is unset.",
);
