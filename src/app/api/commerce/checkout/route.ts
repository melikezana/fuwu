import { NextRequest, NextResponse } from "next/server";
import { getServerAuthContext } from "@/services/auth/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";
import { assertSandbox, sandboxPaymentUrl } from "@/lib/commerce/payment";
import { initializeIyzicoCheckoutForm } from "@/services/payments/iyzico-checkout";
import { isUuid } from "@/lib/utils/validation";
import type { PaymentTransaction } from "@/lib/commerce/types";

export async function POST(request: NextRequest) {
  const { user, profile, supabase } = await getServerAuthContext();
  if (!user || !supabase) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await request.json().catch(() => null);
  if (!isUuid(b?.orderId ?? "")) return NextResponse.json({ error: "invalid_order" }, { status: 400 });
  const { data: order } = await supabase.from("orders").select("*").eq("id", b.orderId).eq("customer_id", user.id).maybeSingle();
  if (!order) return NextResponse.json({ error: "order_not_found" }, { status: 404 });
  // The immutable, server-priced order snapshot is the only source of amounts.
  let db;
  try { assertSandbox(); db = createSupabaseServiceRoleClient(); } catch { return NextResponse.json({ error: "sandbox_unavailable" }, { status: 503 }); }
  if (!db) return NextResponse.json({ error: "sandbox_unavailable" }, { status: 503 });
  const { data: provider } = await db.from("providers").select("iyzico_submerchant_key,iyzico_submerchant_status,is_active,is_approved").eq("id", order.provider_id).maybeSingle();
  if (!provider?.iyzico_submerchant_key || provider.iyzico_submerchant_status !== "active" || !provider.is_active || !provider.is_approved) return NextResponse.json({ error: "offering_unavailable" }, { status: 409 });
  const { data: claim, error: claimError } = await db.rpc("commerce_begin_payment", { p_order_id: order.id });
  if (claimError) return NextResponse.json({ error: "hold_expired" }, { status: 409 });
  const transaction = claim as unknown as PaymentTransaction & { claimed: boolean };
  if (!transaction.claimed) {
    if (transaction.status === "AWAITING" && transaction.payment_page_url) return NextResponse.json({ paymentPageUrl: sandboxPaymentUrl(transaction.payment_page_url) });
    return NextResponse.json({ error: "payment_initializing" }, { status: 409 });
  }
  try {
    const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    const nameParts = (profile?.full_name || "Test Müşteri").trim().split(/\s+/);
    const fullName = profile?.full_name || "Test Müşteri";
    const address = { address: order.address, city: "İstanbul", contactName: fullName, country: "Turkey", zipCode: "34000" };
    const result = await initializeIyzicoCheckoutForm({
      basketId: order.id, conversationId: transaction.conversation_id,
      price: order.total_minor / 100, paidPrice: order.total_minor / 100,
      basketItems: [{ id: order.id, name: order.service_name, category1: "Ev hizmetleri", itemType: "VIRTUAL", price: order.total_minor / 100, subMerchantKey: provider.iyzico_submerchant_key, subMerchantPrice: order.provider_gross_minor / 100 }],
      billingAddress: address, shippingAddress: address,
      buyer: { id: user.id, name: nameParts[0], surname: nameParts.slice(1).join(" ") || "Müşteri", email: user.email || "test@fuwu.test", identityNumber: process.env.IYZICO_TEST_BUYER_IDENTITY_NUMBER || "11111111111", registrationAddress: order.address, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1", city: "İstanbul", country: "Turkey", zipCode: "34000", gsmNumber: profile?.phone || undefined },
      callbackUrl: new URL("/api/commerce/payment-callback", siteUrl).toString(),
    });
    if (!result.token || !result.paymentPageUrl) throw new Error("payment_session_missing");
    const paymentPageUrl = sandboxPaymentUrl(result.paymentPageUrl);
    const { error } = await db.rpc("commerce_attach_payment", { p_order_id: order.id, p_token: result.token, p_url: paymentPageUrl });
    if (error) throw new Error("payment_persistence_failed");
    return NextResponse.json({ paymentPageUrl });
  } catch {
    // A transport/persistence failure does not prove the external session failed.
    // Keep the durable INITIALIZING claim for reconciliation; never issue another initializer.
    return NextResponse.json({ error: "sandbox_unavailable" }, { status: 503 });
  }
}
