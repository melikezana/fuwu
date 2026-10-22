import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";
import { verifyIyzicoWebhookSignature } from "@/services/payments/iyzico-client";
import { assertSandbox } from "@/lib/commerce/payment";
import { reconcileCommercePayment } from "@/services/commerce/reconciliation";

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
  try {
    const { orderId } = await reconcileCommercePayment(db, transaction);
    if (isJson) return NextResponse.json({ ok: true });
    return NextResponse.redirect(new URL(`/orders/${orderId}`, process.env.NEXT_PUBLIC_SITE_URL || request.url), 303);
  } catch {
    // Verification/network errors are retriable, never converted into a paid order.
    return NextResponse.json({ error: "payment_verification_failed" }, { status: 502 });
  }
}
