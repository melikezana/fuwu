// Conservative metadata review, never an SQL executor or a safe-to-apply certificate.
export function assessMigrationPlan({ migrations, appliedMigrations, tables }) {
  if (!Array.isArray(migrations) || !Array.isArray(appliedMigrations) || !Array.isArray(tables)) throw new Error("Complete migration ledger and table metadata required");
  const versions = migrations.map(m => m.file.split("_")[0]);
  if (versions.some(v => !/^\d{14}$/.test(v)) || new Set(versions).size !== versions.length) throw new Error("Invalid or duplicate repository migration version");
  const applied = new Set(appliedMigrations.map(m => m.version));
  const unknownVersions = [...applied].filter(v => !versions.includes(v));
  const pending = migrations.filter(m => !applied.has(m.file.split("_")[0])).sort((a, b) => a.file.localeCompare(b.file));
  const existing = new Set(tables.map(t => t.name));
  const collisions = [];
  const conditionalCreates = [];
  for (const migration of pending) {
    // This is deliberately conservative. Stored dynamic SQL and migration
    // semantics still require review and an actual staging upgrade.
    const sql = migration.sql.replace(/--[^\r\n]*|\/\*[\s\S]*?\*\//g, " ");
    for (const match of sql.matchAll(/\bcreate\s+table\s+(if\s+not\s+exists\s+)?(?:public\s*\.\s*)?([a-z_][a-z0-9_]*)\s*\(/gi)) {
      const table = match[2].toLowerCase();
      if (existing.has(table)) (match[1] ? conditionalCreates : collisions).push({ migration: migration.file, table });
    }
  }
  return {
    status: collisions.length || unknownVersions.length ? "FAIL" : "BLOCKED",
    canApply: false,
    scope: "Read-only conservative DDL/ledger review; never substitutes for full schema reconciliation and hosted staging tests",
    appliedCount: applied.size, repositoryCount: migrations.length,
    pendingMigrations: pending.map(m => m.file), unknownVersions, collisions, conditionalCreates,
    reason: collisions.length ? "Pending CREATE TABLE conflicts with observed production relations; preserve existing tables and reconcile dependencies before staging" : "Full schema/data review and hosted staging upgrade required",
  };
}
