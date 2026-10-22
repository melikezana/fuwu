import { NextRequest, NextResponse } from "next/server";
import { getServerAuthContext } from "@/services/auth/server";
import { isUuid } from "@/lib/utils/validation";
export async function POST(request: NextRequest) {
  const { user, supabase: db } = await getServerAuthContext();
  if (!user || !db) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await request.json().catch(() => null);
  if (!b || !isUuid(b.offeringId ?? "") || !isUuid(b.districtId ?? "") || !isUuid(b.idempotencyKey ?? "") || typeof b.address !== "string" || b.address.length > 1000 || !Number.isSafeInteger(b.expectedPriceMinor) || typeof b.startsAt !== "string" || !Number.isFinite(Date.parse(b.startsAt))) return NextResponse.json({ error: "invalid_selection" }, { status: 400 });
  const { data, error } = await db.rpc("commerce_hold_order", { p_offering_id: b.offeringId, p_district_id: b.districtId, p_starts_at: b.startsAt, p_address: b.address, p_idempotency_key: b.idempotencyKey, p_expected_price_minor: b.expectedPriceMinor });
  return NextResponse.json(error ? { error: error.message } : { order: data }, { status: error ? 409 : 201 });
}
