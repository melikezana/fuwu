import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { PaymentTransaction } from "@/lib/commerce/types";
import { assertSandbox, minorAmount, verifyCommercePayment } from "@/lib/commerce/payment";
import { retrieveIyzicoCheckoutFormResult } from "@/services/payments/iyzico-checkout";
import { processOrderSettlement } from "./settlement";

// Shared by the browser callback, signed webhook and admin reconciliation.
// The server's persisted token and immutable order amounts are authoritative.
export async function reconcileCommercePayment(db: SupabaseClient<Database>, transaction: PaymentTransaction) {
  assertSandbox();
  if (!transaction.checkout_token || transaction.environment !== "sandbox") throw new Error("payment_session_missing");
  const { data: order, error } = await db.from("orders").select("*").eq("id", transaction.order_id).single();
  if (error || !order) throw new Error("order_not_found");
  const result = await retrieveIyzicoCheckoutFormResult({ token: transaction.checkout_token, conversationId: transaction.conversation_id });
  const success = verifyCommercePayment(result, order, transaction.checkout_token, transaction.conversation_id, { paymentId: transaction.payment_id, itemTransactionId: transaction.item_transaction_id, submerchantKey: transaction.submerchant_key });
  const rateFee = minorAmount(result.iyziCommissionRateAmount);
  const fixedFee = minorAmount(result.iyziCommissionFee);
  const { data: status, error: resolveError } = await db.rpc("commerce_resolve_payment", {
    p_order_id: order.id, p_token: transaction.checkout_token, p_payment_id: result.paymentId || null, p_success: success,
    ...(result.itemTransactions?.[0]?.paymentTransactionId ? { p_item_transaction_id: result.itemTransactions[0].paymentTransactionId } : {}),
    ...(rateFee != null && fixedFee != null ? { p_fee_minor: rateFee + fixedFee } : {}),
  });
  if (resolveError) throw new Error("payment_update_failed");
  if (status === "REFUND_PENDING") await processOrderSettlement(order.id, "refund");
  return { orderId: order.id, status };
}
