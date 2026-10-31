import fs from "node:fs/promises";
import path from "node:path";
import { assessMigrationPlan } from "./testing/migration-plan.mjs";
import { sourceHash } from "./testing/evidence.mjs";

// No env file, credentials or network connection. Input is metadata only.
const snapshotFile = process.argv.find(arg => arg.startsWith("--snapshot="))?.slice(11) || "artifacts/final-readiness/production-metadata.json";
const output = path.resolve("artifacts/final-readiness");
await fs.mkdir(output, { recursive: true });
let report;
try {
  const snapshot = JSON.parse(await fs.readFile(snapshotFile, "utf8"));
  if (!snapshot.checkedAt || !Number.isFinite(Date.parse(snapshot.checkedAt))) throw new Error("Dated read-only metadata required");
  const files = (await fs.readdir("supabase/migrations")).filter(f => /^\d{14}_.*\.sql$/.test(f)).sort();
  const migrations = await Promise.all(files.map(async file => ({ file, sql: await fs.readFile(path.join("supabase/migrations", file), "utf8") })));
  report = { ...assessMigrationPlan({ migrations, ...snapshot }), observedAt: snapshot.checkedAt, projectRef: snapshot.projectRef, sourceHash: sourceHash(), checkedAt: new Date().toISOString() };
} catch (error) { report = { status: "BLOCKED", canApply: false, reason: error.message }; }
await fs.writeFile(path.join(output, "migration-plan.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PASS") process.exitCode = 1;
