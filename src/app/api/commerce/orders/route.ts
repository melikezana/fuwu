import { getRequestOrigin } from "@/lib/security/safeRedirect";
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthContext } from "@/services/auth/server";
import { isUuid } from "@/lib/utils/validation";
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== getRequestOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { user, supabase: db } = await getServerAuthContext();
  if (!user || !db) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await request.json().catch(() => null);
  if (!b || !isUuid(b.offeringId ?? "") || !isUuid(b.districtId ?? "") || !isUuid(b.idempotencyKey ?? "") || typeof b.address !== "string" || b.address.length > 1000 || !Number.isSafeInteger(b.expectedPriceMinor) || typeof b.startsAt !== "string" || !Number.isFinite(Date.parse(b.startsAt))) return NextResponse.json({ error: "invalid_selection" }, { status: 400 });
  const total = b.expectedTotalMinor ?? b.expectedPriceMinor;
  if (b.expectedPriceMinor <= 0 || !Number.isSafeInteger(total) || total <= 0 || total > 200_000_000 || (b.feeConsent !== undefined && typeof b.feeConsent !== "boolean")) return NextResponse.json({ error: "invalid_selection" }, { status: 400 });
  const { data, error } = await db.rpc("commerce_hold_order_priced", { p_offering_id: b.offeringId, p_district_id: b.districtId, p_starts_at: b.startsAt, p_address: b.address, p_idempotency_key: b.idempotencyKey, p_expected_price_minor: b.expectedPriceMinor, p_expected_total_minor: total, p_fee_consent: b.feeConsent === true, p_terms_version: typeof b.termsVersion === "string" ? b.termsVersion : "" });
  return NextResponse.json(error ? { error: error.message } : { order: data }, { status: error ? 409 : 201 });
}
