"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerAuthContext } from "@/services/auth/server";
import { hasAdminRole } from "@/services/auth/constants";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";
import { isUuid } from "@/lib/utils/validation";
import { reconcileCommercePayment } from "@/services/commerce/reconciliation";
import { processOrderSettlement } from "@/services/commerce/settlement";
import { writeAuditLog } from "@/services/audit";
import { checkRateLimitWithRedis } from "@/lib/security/rateLimitRedis";

export async function marketplaceAction(form: FormData) {
  const { supabase, user, profile } = await getServerAuthContext();
  if (!user || !supabase || !hasAdminRole(profile)) throw new Error("forbidden");
  const orderId = String(form.get("orderId") ?? "");
  const action = String(form.get("action") ?? "");
  if (!isUuid(orderId) || !["reconcile", "refund", "release"].includes(action)) throw new Error("invalid_action");
  const rate = await checkRateLimitWithRedis({ action: "admin:commerce.operations", userId: user.id, supabase, limit: 15, windowMs: 60_000 });
  if (!rate.allowed) redirect("/admin/marketplace?result=rate_limit");
  let ok = false;
  try {
    // A normal user's cookie client cannot call privileged payment RPCs.
    if (action === "refund") {
      const { error } = await supabase.rpc("commerce_admin_request_refund", { p_order_id: orderId });
      if (error) throw new Error("refund_not_eligible");
      await processOrderSettlement(orderId, "refund");
      ok = true; // Request accepted, NOT a claim that the external refund succeeded.
    } else if (action === "release") {
      await processOrderSettlement(orderId, "release");
      ok = true;
    } else {
      const db = createSupabaseServiceRoleClient();
      if (!db) throw new Error("sandbox_unavailable");
      const { data: transaction } = await db.from("payment_transactions").select("*").eq("order_id", orderId).single();
      if (!transaction) throw new Error("payment_not_found");
      await reconcileCommercePayment(db, transaction);
      ok = true;
    }
  } catch { /* Processor failure never becomes a successful payment. */ }
  await writeAuditLog({ action: "commerce.operation_requested", actorUserId: user.id, entityType: "order", entityId: orderId, metadata: { operation: action, requestAccepted: ok, environment: "sandbox" } }, supabase);
  revalidatePath("/admin"); revalidatePath("/admin/marketplace"); revalidatePath(`/orders/${orderId}`);
  redirect(`/admin/marketplace?result=${ok ? "requested" : "failed"}`);
}
