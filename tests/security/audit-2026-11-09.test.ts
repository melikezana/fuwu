import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// 9 Kasım 2026 CEO & CTO denetimi bulgularının kalıcı, statik kanıtları.
const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : /\.(ts|tsx)$/.test(entry.name) ? [path.join(dir, entry.name)] : []);

describe("9 Kasım 2026 denetimi", () => {
  it("never authenticates with passwords, so the leaked-password advisor finding has no exposed surface", () => {
    // Giriş yalnızca e-posta/SMS tek kullanımlık kodu ve Google OAuth ile yapılır.
    const offenders = walk("src").filter(file => /signInWithPassword|\.auth\.signUp\(|resetPasswordForEmail|updateUser\(\s*\{\s*password/.test(fs.readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });
  it("keeps the advisor hardening migration free of data rewrites and function body changes", () => {
    const sql = fs.readFileSync("supabase/migrations/20261110000100_audit_advisor_hardening.sql", "utf8").replace(/--[^\n]*/g, "");
    expect(sql).not.toMatch(/\b(insert\s+into|update\s+public|delete\s+from|truncate|drop\s+(table|policy|function)|create\s+or\s+replace\s+function|alter\s+table)\b/i);
    expect(sql).toMatch(/as restrictive for all to anon, authenticated using \(false\) with check \(false\)/);
    for (const legacy of ["orders", "order_payments", "payouts", "disputes", "webhook_events"]) expect(sql).toContain(`'${legacy}'`);
  });
  it("keeps the weekly metrics RPC admin-only and free of personal fields", () => {
    const sql = fs.readFileSync("supabase/migrations/20261110000200_weekly_launch_metrics.sql", "utf8");
    expect(sql).toMatch(/not public\.current_user_is_admin\(\) then raise exception 'forbidden'/);
    expect(sql).toMatch(/revoke all on function public\.admin_weekly_launch_metrics\(integer\) from public, anon, authenticated/);
    expect(sql.replace(/--[^\n]*/g, "")).not.toMatch(/\b(email|phone|full_name|address|message|metadata)\b/i);
  });
  it("ships a read-only anonymous visibility check that refuses the service role key", () => {
    const script = fs.readFileSync("scripts/verify-public-provider-visibility.mjs", "utf8");
    expect(script).toContain("service_role anahtarı reddedildi");
    expect(script).not.toMatch(/method:\s*"(PATCH|PUT|DELETE)"/);
    expect(script).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});
