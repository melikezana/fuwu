import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "@/lib/utils/validation";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";
import type { Database } from "@/lib/supabase/types";
import { getServerAuthContext } from "@/services/auth/server";
import { initializeIyzicoCheckoutForm } from "@/services/payments/iyzico-checkout";
import { PAYMENT_STATUSES } from "@/services/payments/constants";

type CheckoutSupabaseClient = SupabaseClient<Database>;
const processedIyzicoPaymentStatuses = new Set<string>([
  PAYMENT_STATUSES.escrowHeld,
  PAYMENT_STATUSES.escrowReleased,
  PAYMENT_STATUSES.escrowRefunded,
]);

type NamedRelation = {
  name: string | null;
};

type ProfileRelation = {
  full_name: string | null;
  phone: string | null;
};

type ProviderRelation = {
  id: string;
  iyzico_submerchant_key: string | null;
  iyzico_submerchant_status: string | null;
  name: string | null;
};

type CheckoutRequestRecord = {
  id: string;
  address: string | null;
  accepted_provider: ProviderRelation | ProviderRelation[] | null;
  assigned_provider: ProviderRelation | ProviderRelation[] | null;
  district: NamedRelation | NamedRelation[] | null;
  offered_price: number | string | null;
  profile: ProfileRelation | ProfileRelation[] | null;
  service_category: NamedRelation | NamedRelation[] | null;
  status: string;
  user_id: string | null;
};

function getRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? relation[0] : relation ?? null;
}

function getRequestIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "127.0.0.1"
  );
}

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

function parseAmount(value: number | string | null) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

function toMinorUnits(amount: number) {
  return Math.round(amount * 100);
}

function fromMinorUnits(amount: number) {
  return Number((amount / 100).toFixed(2));
}

function normalizeIyzicoPrice(amount: number) {
  return Number(amount.toFixed(2));
}

function parseCommissionRate(value: string | null | undefined) {
  const parsedValue = Number(value?.replace(",", ".") ?? "");

  if (!Number.isFinite(parsedValue)) {
    return 0.1;
  }

  const normalizedValue = parsedValue > 1 ? parsedValue / 100 : parsedValue;

  return Math.min(Math.max(normalizedValue, 0), 1);
}

async function getCommissionRate(supabase: CheckoutSupabaseClient) {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "commission_rate")
    .maybeSingle();

  if (error) {
    return 0.1;
  }

  return parseCommissionRate(data?.value);
}

function splitName(value: string | null | undefined) {
  const parts = (value?.trim() || "Fuwu Müşteri").split(/\s+/).filter(Boolean);
  const name = parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0] ?? "Fuwu";
  const surname = parts.length > 1 ? parts[parts.length - 1] : "Müşteri";

  return { name, surname };
}

function getCheckoutIdentityNumber() {
  return process.env.IYZICO_TEST_BUYER_IDENTITY_NUMBER?.trim() || "11111111111";
}

async function readRequestBody(request: NextRequest) {
  try {
    const body = (await request.json()) as { requestId?: unknown };
    return typeof body.requestId === "string" ? body.requestId.trim() : "";
  } catch {
    return "";
  }
}

async function getCheckoutRequest(
  supabase: CheckoutSupabaseClient,
  requestId: string,
) {
  const { data, error } = await supabase
    .from("service_requests")
    .select(
      `
        id,
        user_id,
        status,
        offered_price,
        address,
        service_category:service_categories(name),
        district:districts(name),
        profile:profiles(full_name, phone),
        assigned_provider:providers!service_requests_assigned_provider_id_fkey(id, name, iyzico_submerchant_key, iyzico_submerchant_status),
        accepted_provider:providers!service_requests_accepted_provider_id_fkey(id, name, iyzico_submerchant_key, iyzico_submerchant_status)
      `,
    )
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as unknown as CheckoutRequestRecord | null;
}

export async function POST(request: NextRequest) {
  const requestId = await readRequestBody(request);

  if (!isUuid(requestId)) {
    return NextResponse.json({ error: "invalid_request_id" }, { status: 400 });
  }

  const authContext = await getServerAuthContext();

  if (!authContext.supabase || !authContext.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServiceRoleClient() ?? authContext.supabase;
  const serviceRequest = await getCheckoutRequest(supabase, requestId);

  if (!serviceRequest || serviceRequest.user_id !== authContext.user.id) {
    return NextResponse.json({ error: "request_not_found" }, { status: 404 });
  }

  const amount = parseAmount(serviceRequest.offered_price);

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "request_price_missing" }, { status: 409 });
  }

  const provider =
    getRelation(serviceRequest.accepted_provider) ??
    getRelation(serviceRequest.assigned_provider);

  if (!provider?.iyzico_submerchant_key || provider.iyzico_submerchant_status !== "active") {
    return NextResponse.json({ error: "provider_payment_info_inactive" }, { status: 409 });
  }

  const { data: existingPayment, error: existingPaymentError } = await supabase
    .from("payments")
    .select("id, status")
    .eq("request_id", requestId)
    .maybeSingle();

  if (existingPaymentError) {
    return NextResponse.json({ error: "payment_lookup_failed" }, { status: 500 });
  }

  if (existingPayment && processedIyzicoPaymentStatuses.has(existingPayment.status)) {
    return NextResponse.json({ error: "payment_already_processed" }, { status: 409 });
  }

  const commissionRate = await getCommissionRate(supabase);
  const totalMinor = toMinorUnits(amount);
  const commissionMinor = Math.round(totalMinor * commissionRate);
  const providerPayoutMinor = totalMinor - commissionMinor;
  const totalAmount = fromMinorUnits(totalMinor);
  const commissionAmount = fromMinorUnits(commissionMinor);
  const providerPayoutAmount = fromMinorUnits(providerPayoutMinor);
  const conversationId = `request-${requestId}-${Date.now()}`;
  const customerProfile = getRelation(serviceRequest.profile);
  const customerName = splitName(customerProfile?.full_name);
  const districtName = getRelation(serviceRequest.district)?.name || "İstanbul";
  const categoryName = getRelation(serviceRequest.service_category)?.name || "Fuwu Hizmet";
  const address = serviceRequest.address?.trim() || `${districtName}, İstanbul`;
  const checkoutResponse = await initializeIyzicoCheckoutForm({
    basketId: requestId,
    basketItems: [
      {
        category1: categoryName,
        id: requestId,
        itemType: "VIRTUAL",
        name: categoryName,
        price: normalizeIyzicoPrice(totalAmount),
        subMerchantKey: provider.iyzico_submerchant_key,
        subMerchantPrice: normalizeIyzicoPrice(providerPayoutAmount),
      },
    ],
    billingAddress: {
      address,
      city: "İstanbul",
      contactName: customerProfile?.full_name || "Fuwu Müşteri",
      country: "Turkey",
      zipCode: "34000",
    },
    buyer: {
      city: "İstanbul",
      country: "Turkey",
      email: authContext.user.email || "musteri@fuwu.local",
      gsmNumber: customerProfile?.phone ?? undefined,
      id: authContext.user.id,
      identityNumber: getCheckoutIdentityNumber(),
      ip: getRequestIp(request),
      name: customerName.name,
      registrationAddress: address,
      surname: customerName.surname,
      zipCode: "34000",
    },
    callbackUrl: `${getSiteUrl()}/api/payments/iyzico/webhook`,
    conversationId,
    paidPrice: normalizeIyzicoPrice(totalAmount),
    price: normalizeIyzicoPrice(totalAmount),
    shippingAddress: {
      address,
      city: "İstanbul",
      contactName: customerProfile?.full_name || "Fuwu Müşteri",
      country: "Turkey",
      zipCode: "34000",
    },
  });

  const paymentPayload = {
    amount: totalAmount,
    commission_amount: commissionAmount,
    commission_rate: commissionRate,
    iyzico_checkout_token: checkoutResponse.token ?? null,
    iyzico_conversation_id: conversationId,
    payment_method: "iyzico" as const,
    provider_payout_amount: providerPayoutAmount,
    request_id: requestId,
    status: PAYMENT_STATUSES.pendingConfirmation,
    updated_at: new Date().toISOString(),
  };
  const { error: upsertError } = await supabase
    .from("payments")
    .upsert(paymentPayload, { onConflict: "request_id" });

  if (upsertError) {
    return NextResponse.json({ error: "payment_record_failed" }, { status: 500 });
  }

  await supabase
    .from("service_requests")
    .update({
      payment_method: "iyzico",
      payment_preference: "iyzico",
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  return NextResponse.json({
    checkoutFormContent: checkoutResponse.checkoutFormContent ?? null,
    paymentPageUrl: checkoutResponse.paymentPageUrl ?? null,
    token: checkoutResponse.token ?? null,
  });
}
