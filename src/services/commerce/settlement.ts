import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";
import { assertSandbox, isVerifiedSettlement, minorAmount } from "@/lib/commerce/payment";
import { commerceRequestId } from "@/lib/commerce/api";
import { logWarn } from "@/lib/logger";
import { IyzicoIntegrationError } from "@/services/payments/iyzico-client";
import { approveIyzicoPaymentItem, refundIyzicoPayment } from "@/services/payments/iyzico-marketplace";

type FailureClass = "processor_timeout" | "processor_rejected" | "processor_unverified" | "processor_transport" | "persistence_failed";
type SettlementResult = { state: "completed" | "not_claimed" | "manual_review" | "unavailable"; operationReference: string; requestId: string };

// Optional service client supports reconciliation and isolated tests, never browser input.
export async function processOrderSettlement(orderId: string, kind: "release" | "refund", client?: SupabaseClient<Database>): Promise<SettlementResult> {
  const operationReference = `${kind}-${orderId}`;
  const requestId = commerceRequestId();
  const outcome = (state: SettlementResult["state"]): SettlementResult => ({ state, operationReference, requestId });
  let db: SupabaseClient<Database> | null = null;
  let claimed = false;
  let classification: FailureClass = "processor_transport";
  try {
    assertSandbox();
    db = client ?? createSupabaseServiceRoleClient();
    if (!db) throw new Error("configuration_unavailable");
    const { data, error } = await db.rpc("commerce_claim_settlement", { p_order_id: orderId, p_kind: kind });
    if (error || !data || typeof data !== "object") throw new Error("claim_unavailable");
    const claim = data as { claimed: boolean; item_transaction_id: string; total_minor: number; state?: string };
    if (!claim.claimed) {
      // Repeat only local finalization when the verified result was saved before a DB failure.
      if (claim.state === "VERIFIED") {
        const { error: finishError } = await db.rpc("commerce_finish_settlement", { p_order_id: orderId, p_kind: kind });
        if (finishError) throw new Error("finish_unavailable");
        return outcome("completed");
      }
      return outcome(claim.state === "COMPLETED" ? "completed" : claim.state ? "manual_review" : "not_claimed");
    }
    claimed = true;
    const result = kind === "release"
      ? await approveIyzicoPaymentItem({ conversationId: operationReference, paymentTransactionId: claim.item_transaction_id })
      : await refundIyzicoPayment({ conversationId: operationReference, paymentTransactionId: claim.item_transaction_id, price: claim.total_minor / 100 });
    classification = "processor_unverified";
    if (!isVerifiedSettlement(result, claim.item_transaction_id, kind, claim.total_minor, operationReference)) throw new Error("unverified_settlement");
    classification = "persistence_failed";
    const { error: recordError } = await db.rpc("commerce_record_settlement_result", {
      p_order_id: orderId, p_kind: kind, p_operation_reference: operationReference, p_outcome: "VERIFIED", p_request_id: requestId,
      p_item_transaction_id: result.paymentTransactionId, p_conversation_id: result.conversationId,
      ...(kind === "refund" ? { p_amount_minor: minorAmount((result as { price?: unknown }).price)!, p_currency: "TRY" } : {}),
    });
    if (recordError) throw new Error("record_unavailable");
    const { error: finishError } = await db.rpc("commerce_finish_settlement", { p_order_id: orderId, p_kind: kind });
    if (finishError) throw new Error("finish_unavailable");
    return outcome("completed");
  } catch (error) {
    if (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)) classification = "processor_timeout";
    else if (error instanceof IyzicoIntegrationError && error.details?.processorFailure === true) classification = "processor_rejected";
    logWarn("Commerce settlement requires reconciliation.", { operationReference, requestId, classification: claimed ? classification : "configuration_or_claim_failed" });
    if (claimed && db) {
      try {
        const { error: recordError } = await db.rpc("commerce_record_settlement_result", { p_order_id: orderId, p_kind: kind, p_operation_reference: operationReference, p_outcome: "MANUAL_REVIEW", p_failure_class: classification, p_request_id: requestId });
        if (recordError) throw new Error("audit_unavailable");
      } catch {
        logWarn("Commerce settlement audit persistence failed.", { operationReference, requestId, classification: "audit_unavailable" });
      }
    }
    return outcome(claimed ? "manual_review" : "unavailable");
  }
}
