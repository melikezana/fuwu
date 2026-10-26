"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerAuthContext } from "@/services/auth/server";
import { hasAdminRole } from "@/services/auth/constants";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";
import { checkRateLimitWithRedis } from "@/lib/security/rateLimitRedis";
import { getOperationsHealth, probeExternalServices } from "@/services/health/operations";
import { writeAuditLog } from "@/services/audit";

export async function checkOperationsHealth() {
  const { supabase, user, profile } = await getServerAuthContext();
  if (!supabase || !user || !hasAdminRole(profile)) throw new Error("forbidden");
  const rate = await checkRateLimitWithRedis({ action: "admin:health", userId: user.id, supabase, limit: 3, windowMs: 60000 });
  if (!rate.allowed) redirect("/admin/marketplace?view=health&result=rate_limit");
  const service = createSupabaseServiceRoleClient();
  if (!service) redirect("/admin/marketplace?view=health&result=failed");
  const [health, external, read] = await Promise.all([getOperationsHealth(supabase), probeExternalServices(), supabase.from("orders").select("id").limit(0).abortSignal(AbortSignal.timeout(8000))]);
  const audit = await writeAuditLog({ action: "operations.health_checked", actorUserId: user.id, entityId: null, entityType: "admin_action", metadata: { scope: "read_only_probes", environment: "sandbox" } }, supabase);
  const probes = [...external, { name: "supabase", passed: !read.error, detail: "Yetkili orders okuma sorgusu; ödeme işlemi yapılmadı." }, { name: "schema", passed: Boolean(health?.contract_ok), detail: "Tablo RLS, gerekli RPC, review kaynak kolonu ve unique index sözleşmesi." }, { name: "audit", passed: audit && Boolean(health), detail: "Admin audit okuma ve redakte kontrol olayı yazma denemesi." }];
  const results = await Promise.all(probes.map(p => service.rpc("commerce_record_health", { p_name: p.name, p_passed: p.passed, p_detail: p.detail })));
  revalidatePath("/admin/marketplace");
  redirect(`/admin/marketplace?view=health&result=${results.every(r => !r.error) ? "checked" : "failed"}`);
}
