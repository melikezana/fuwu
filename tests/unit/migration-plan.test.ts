import { describe, expect, it } from "vitest";
import { assessMigrationPlan } from "../../scripts/testing/migration-plan.mjs";

const first = { file: "20260605000000_initial.sql", sql: "create table public.providers(id uuid);" };
const commerce = { file: "20261021000100_commerce.sql", sql: "create table public.orders(id uuid, total_minor integer);" };
const snapshot = { appliedMigrations: [{ version: "20260605000000" }], tables: [{ name: "providers" }, { name: "orders" }] };
describe("migration safety review", () => {
  it("catches the existing legacy orders table even when all applied versions match", () => {
    const report = assessMigrationPlan({ migrations: [first, commerce], ...snapshot });
    expect(report).toMatchObject({ status: "FAIL", canApply: false, appliedCount: 1, collisions: [{ migration: commerce.file, table: "orders" }] });
    expect(report.pendingMigrations).toEqual([commerce.file]);
  });
  it("ignores completed DDL and comments but exposes conditional creates for review", () => {
    const conditional = { ...commerce, sql: "-- create table public.providers(id uuid);\ncreate table if not exists public.orders(id uuid);" };
    const report = assessMigrationPlan({ migrations: [first, conditional], ...snapshot });
    expect(report.collisions).toEqual([]);
    expect(report.conditionalCreates).toEqual([{ migration: commerce.file, table: "orders" }]);
    expect(report.status).toBe("BLOCKED"); expect(report.canApply).toBe(false);
  });
  it("never certifies a fresh schema as ready for production", () => {
    expect(assessMigrationPlan({ migrations: [first, commerce], appliedMigrations: [], tables: [] })).toMatchObject({ status: "BLOCKED", canApply: false });
  });
  it("rejects duplicate versions and missing metadata", () => {
    expect(() => assessMigrationPlan({ migrations: [first, first], ...snapshot })).toThrow(/duplicate/);
    expect(() => assessMigrationPlan({ migrations: [], appliedMigrations: [], tables: null })).toThrow(/metadata/);
  });
  it("fails on production ledger versions absent from the repository", () => {
    expect(assessMigrationPlan({ migrations: [first], tables: [], appliedMigrations: [{ version: "20261031000000" }] })).toMatchObject({ status: "FAIL", unknownVersions: ["20261031000000"] });
  });
});
