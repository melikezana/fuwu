import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";
import { retrieveIyzicoCheckoutFormResult } from "@/services/payments/iyzico-checkout";
import { verifyIyzicoWebhookSignature } from "@/services/payments/iyzico-client";
import { assertSandbox, minorAmount, verifyCommercePayment } from "@/lib/commerce/payment";
import { processOrderSettlement } from "@/services/commerce/settlement";

export async function POST(request: NextRequest) {
  try { assertSandbox(); } catch { return NextResponse.json({ error: "sandbox_unavailable" }, { status: 503 }); }
  const isJson = request.headers.get("content-type")?.includes("application/json");
  let token: string;
  try {
    if (isJson) {
      const payload = await request.json();
      if (!verifyIyzicoWebhookSignature({ payload, signature: request.headers.get("x-iyz-signature-v3") })) return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
      token = typeof payload.token === "string" ? payload.token : "";
    } else {
      const form = await request.formData();
      token = String(form.get("token") ?? "");
    }
  } catch { return NextResponse.json({ error: "invalid_callback" }, { status: 400 }); }
  if (!token || token.length > 256) return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  const db = createSupabaseServiceRoleClient();
  if (!db) return NextResponse.json({ error: "sandbox_unavailable" }, { status: 503 });
  const { data: transaction } = await db.from("payment_transactions").select("*").eq("checkout_token", token).maybeSingle();
  if (!transaction) return NextResponse.json({ error: "payment_not_found" }, { status: 404 });
  const { data: order } = await db.from("orders").select("*").eq("id", transaction.order_id).single();
  if (!order) return NextResponse.json({ error: "order_not_found" }, { status: 404 });
  try {
    // A browser callback is only a hint. Retrieve the result from iyzico with server credentials.
    const result = await retrieveIyzicoCheckoutFormResult({ token, conversationId: transaction.conversation_id });
    const success = verifyCommercePayment(result, order, token, transaction.conversation_id);
    const rateFee = minorAmount(result.iyziCommissionRateAmount);
    const fixedFee = minorAmount(result.iyziCommissionFee);
    const { data: status, error } = await db.rpc("commerce_resolve_payment", { p_order_id: order.id, p_token: token, p_payment_id: result.paymentId || null, p_success: success, ...(result.itemTransactions?.[0]?.paymentTransactionId ? { p_item_transaction_id: result.itemTransactions[0].paymentTransactionId } : {}), ...(rateFee != null && fixedFee != null ? { p_fee_minor: rateFee + fixedFee } : {}) });
    if (error) throw new Error("payment_update_failed");
    if (status === "REFUND_PENDING") await processOrderSettlement(order.id, "refund");
    if (isJson) return NextResponse.json({ ok: true });
    return NextResponse.redirect(new URL(`/orders/${order.id}`, process.env.NEXT_PUBLIC_SITE_URL || request.url), 303);
  } catch {
    // Verification/network errors are retriable, never converted into a paid order.
    return NextResponse.json({ error: "payment_verification_failed" }, { status: 502 });
  }
}
