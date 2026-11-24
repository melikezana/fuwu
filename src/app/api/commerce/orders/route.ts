import { commerceDatabaseError, withCommerceApi } from "@/lib/commerce/api";
import { commerceRateLimit } from "@/lib/commerce/rate";
import { getRequestOrigin } from "@/lib/security/safeRedirect";
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthContext } from "@/services/auth/server";
import { isUuid } from "@/lib/utils/validation";
import { isAppointmentTimestamp } from "@/lib/commerce/validation";
import { cardCheckoutEnabled, directPurchaseEnabled } from "@/lib/prelaunch";
import { decodeBasket } from "@/lib/commerce/pricing";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";
import { notifyProviderAfterResponse } from "@/services/commerce/provider-order-sms";

const statusFor: Record<string, number> = { unauthorized: 401, forbidden: 403, contact_verification_required: 403, rate_limit: 429, too_many_holds: 429, too_many_open_orders: 429, schema_missing: 503, pay_at_door_closed: 503, invalid_addons: 400, invalid_address: 400, invalid_note: 400, invalid_payment_method: 400, invalid_selection: 400, early_start_consent_required: 400, legal_acceptance_required: 400, legal_identity_incomplete: 409, legal_version_changed: 409 };

/**
 * Doğrudan satın alma: paket + ekstralar + saat + adres tek istekte sipariş olur.
 * Kapıda ödemede sipariş hemen onaylanır (ödeme iş bitince ustaya yapılır); kartla ödemede randevu 10 dakika ayrılır.
 * Fiyat, saat ve ekstralar veritabanında yeniden hesaplanır; istemcinin gönderdiği tutar yalnızca "fiyat değişti mi" kontrolüdür.
 */
async function handlePOST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== getRequestOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { user, supabase: db } = await getServerAuthContext();
  if (!user || !db) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const limited = await commerceRateLimit(request, "commerce.order.hold", 10, 60_000, user.id);
  if (limited) return limited;
  if (!directPurchaseEnabled()) return NextResponse.json({ error: "online_purchase_closed" }, { status: 503 });
  const b = await request.json().catch(() => null);
  const paymentMethod = b?.paymentMethod ?? "PAY_AT_DOOR";
  const basket = b?.addons === undefined || b?.addons === null ? [] : typeof b.addons === "string" ? decodeBasket(b.addons) : null;
  if (!b || !isUuid(b.offeringId ?? "") || !isUuid(b.districtId ?? "") || !isUuid(b.idempotencyKey ?? "") || typeof b.address !== "string" || b.address.length > 1000 || !isAppointmentTimestamp(b.startsAt)) return NextResponse.json({ error: "invalid_selection" }, { status: 400 });
  if (!Number.isSafeInteger(b.expectedTotalMinor) || b.expectedTotalMinor <= 0 || b.expectedTotalMinor > 200_000_000 || (b.feeConsent !== undefined && typeof b.feeConsent !== "boolean")) return NextResponse.json({ error: "invalid_selection" }, { status: 400 });
  if (!basket) return NextResponse.json({ error: "invalid_addons" }, { status: 400 });
  if (paymentMethod !== "PAY_AT_DOOR" && paymentMethod !== "CARD") return NextResponse.json({ error: "invalid_payment_method" }, { status: 400 });
  if (paymentMethod === "CARD" && !cardCheckoutEnabled()) return NextResponse.json({ error: "card_payment_closed" }, { status: 503 });
  if (b.note !== undefined && b.note !== null && (typeof b.note !== "string" || b.note.length > 500)) return NextResponse.json({ error: "invalid_note" }, { status: 400 });
  // Ön bilgilendirme teyidi olmadan sözleşme kurulmaz (Mesafeli Sözleşmeler Yönetmeliği m.7).
  if (b.legalAccepted !== true || typeof b.legalVersion !== "string") return NextResponse.json({ error: "legal_acceptance_required" }, { status: 400 });
  if (b.earlyStartConsent !== undefined && typeof b.earlyStartConsent !== "boolean") return NextResponse.json({ error: "invalid_selection" }, { status: 400 });
  const { data, error } = await db.rpc("commerce_place_order", {
    p_offering_id: b.offeringId, p_district_id: b.districtId, p_starts_at: b.startsAt, p_address: b.address, p_idempotency_key: b.idempotencyKey,
    p_expected_total_minor: b.expectedTotalMinor, p_addons: basket, p_payment_method: paymentMethod, p_note: typeof b.note === "string" ? b.note : null,
    p_fee_consent: b.feeConsent === true, p_terms_version: typeof b.termsVersion === "string" ? b.termsVersion : "",
    p_legal_version: b.legalVersion.slice(0, 60), p_early_start_consent: b.earlyStartConsent === true,
  });
  if (error) { const code = commerceDatabaseError(error); return NextResponse.json({ error: code }, { status: statusFor[code] ?? 409 }); }
  const order = data as { id?: string; status?: string } | null;
  // Kapıda ödemeli sipariş anında kesinleşir: ustaya yeni randevu SMS'i yanıttan sonra, siparişte bir kez gider.
  if (order?.id && order.status === "CONFIRMED") { const service = createSupabaseServiceRoleClient(); if (service) notifyProviderAfterResponse(service, order.id); }
  return NextResponse.json({ order }, { status: 201 });
}

export const POST = withCommerceApi(handlePOST);
