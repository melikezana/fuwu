import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";
import type { Database } from "@/lib/supabase/types";
import { PAYMENT_STATUSES } from "@/services/payments/constants";
import { verifyIyzicoWebhookSignature } from "@/services/payments/iyzico-client";
import { retrieveIyzicoCheckoutFormResult } from "@/services/payments/iyzico-checkout";

type WebhookSupabaseClient = SupabaseClient<Database>;
const terminalEscrowStatuses = new Set<string>([
  PAYMENT_STATUSES.escrowHeld,
  PAYMENT_STATUSES.escrowReleased,
  PAYMENT_STATUSES.escrowRefunded,
]);

type WebhookPayload = Record<string, unknown>;

type PaymentRecord = {
  id: string;
  iyzico_checkout_token: string | null;
  iyzico_conversation_id: string | null;
  iyzico_payment_id: string | null;
  status: string;
};

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function parseWebhookPayload(request: NextRequest): Promise<WebhookPayload> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = await request.json();
    return payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as WebhookPayload)
      : {};
  }

  const body = await request.text();
  const params = new URLSearchParams(body);
  const payload: WebhookPayload = {};

  params.forEach((value, key) => {
    payload[key] = value;
  });

  return payload;
}

function isSuccessStatus(value: string) {
  return value.toLocaleUpperCase("tr") === "SUCCESS";
}

function isTerminalEscrowStatus(status: string) {
  return terminalEscrowStatuses.has(status);
}

async function getPaymentByConversationId(
  supabase: WebhookSupabaseClient,
  conversationId: string,
) {
  const { data, error } = await supabase
    .from("payments")
    .select("id, status, iyzico_conversation_id, iyzico_checkout_token, iyzico_payment_id")
    .eq("iyzico_conversation_id", conversationId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as PaymentRecord | null;
}

async function getPaymentByIyzicoPaymentId(
  supabase: WebhookSupabaseClient,
  paymentId: string,
) {
  const { data, error } = await supabase
    .from("payments")
    .select("id, status, iyzico_conversation_id, iyzico_checkout_token, iyzico_payment_id")
    .eq("iyzico_payment_id", paymentId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as PaymentRecord | null;
}

function getFirstTransactionId(
  detail: Awaited<ReturnType<typeof retrieveIyzicoCheckoutFormResult>> | null,
) {
  const firstTransaction = detail?.itemTransactions?.[0];

  return getString(firstTransaction?.paymentTransactionId);
}

async function retrieveCheckoutDetail({
  conversationId,
  payment,
  payload,
}: {
  conversationId: string;
  payment: PaymentRecord;
  payload: WebhookPayload;
}) {
  const token = getString(payload.token) || payment.iyzico_checkout_token;

  if (!token) {
    return null;
  }

  try {
    return await retrieveIyzicoCheckoutFormResult({
      conversationId,
      token,
    });
  } catch (error) {
    console.error("[Fuwu] iyzico checkout detail retrieve failed.", {
      conversationId,
      error,
    });
    return null;
  }
}

export async function POST(request: NextRequest) {
  const payload = await parseWebhookPayload(request);
  const signature =
    request.headers.get("x-iyz-signature-v3") ??
    request.headers.get("x-iyz-signature-v2") ??
    request.headers.get("x-iyz-signature");

  if (!verifyIyzicoWebhookSignature({ payload, signature })) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });
  }

  const conversationId =
    getString(payload.paymentConversationId) || getString(payload.conversationId);
  const payloadPaymentId =
    getString(payload.iyziPaymentId) || getString(payload.paymentId);
  const status = getString(payload.status);

  if (!conversationId) {
    return NextResponse.json({ error: "missing_conversation_id" }, { status: 400 });
  }

  const existingByPaymentId = payloadPaymentId
    ? await getPaymentByIyzicoPaymentId(supabase, payloadPaymentId)
    : null;

  if (existingByPaymentId && isTerminalEscrowStatus(existingByPaymentId.status)) {
    return NextResponse.json({ ok: true, idempotent: true });
  }

  const payment =
    existingByPaymentId ?? (await getPaymentByConversationId(supabase, conversationId));

  if (!payment) {
    return NextResponse.json({ error: "payment_not_found" }, { status: 404 });
  }

  if (!isSuccessStatus(status)) {
    await supabase
      .from("payments")
      .update({
        escrow_failed_at: new Date().toISOString(),
        status: PAYMENT_STATUSES.escrowFailed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    return NextResponse.json({ ok: true });
  }

  const detail = await retrieveCheckoutDetail({
    conversationId,
    payment,
    payload,
  });
  const paymentId = payloadPaymentId || getString(detail?.paymentId);
  const paymentTransactionId = getFirstTransactionId(detail);

  if (!paymentId) {
    return NextResponse.json({ error: "missing_payment_id" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("payments")
    .update({
      escrow_held_at: now,
      iyzico_checkout_token: getString(payload.token) || detail?.token || payment.iyzico_checkout_token,
      iyzico_payment_id: paymentId,
      iyzico_payment_transaction_id: paymentTransactionId || null,
      status: PAYMENT_STATUSES.escrowHeld,
      updated_at: now,
    })
    .eq("id", payment.id)
    .in("status", [
      PAYMENT_STATUSES.pendingConfirmation,
      PAYMENT_STATUSES.escrowFailed,
      PAYMENT_STATUSES.escrowHeld,
    ]);

  if (updateError) {
    return NextResponse.json({ error: "payment_update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
