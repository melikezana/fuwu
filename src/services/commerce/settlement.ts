import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";
import { assertSandbox, minorAmount } from "@/lib/commerce/payment";
import { approveIyzicoPaymentItem, refundIyzicoPayment } from "@/services/payments/iyzico-marketplace";

export async function processOrderSettlement(orderId: string, kind: "release" | "refund") {
  try {
    assertSandbox();
    const db = createSupabaseServiceRoleClient();
    if (!db) return;
    const { data, error } = await db.rpc("commerce_claim_settlement", { p_order_id: orderId, p_kind: kind });
    if (error) return;
    const claim = data as { claimed: boolean; item_transaction_id: string; total_minor: number };
    if (!claim.claimed) return;
    const result = kind === "release"
      ? await approveIyzicoPaymentItem({ conversationId: `release-${orderId}`, paymentTransactionId: claim.item_transaction_id })
      : await refundIyzicoPayment({ conversationId: `refund-${orderId}`, paymentTransactionId: claim.item_transaction_id, price: claim.total_minor / 100 });
    if (result.status !== "success" || result.paymentTransactionId !== claim.item_transaction_id) return;
    if (kind === "refund" && (!("currency" in result) || result.currency !== "TRY" || !("price" in result) || minorAmount(result.price) !== claim.total_minor)) return;
    await db.rpc("commerce_finish_settlement", { p_order_id: orderId, p_kind: kind });
  } catch {
    // Preserve the durable claim and pending state for processor reconciliation.
    // Never mark a refund/release as successful after a timeout or uncertain result.
  }
}
