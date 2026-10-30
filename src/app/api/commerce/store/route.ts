import { revalidatePath } from "next/cache";
import { commerceDatabaseError, withCommerceApi } from "@/lib/commerce/api";
import { getRequestOrigin } from "@/lib/security/safeRedirect";
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthContext } from "@/services/auth/server";
import { isUuid } from "@/lib/utils/validation";
async function handlePOST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== getRequestOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { user, supabase: db } = await getServerAuthContext();
  if (!user || !db) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await request.json().catch(() => null);
  if (!b || !isUuid(b.providerId ?? "") || !Array.isArray(b.offerings) || !Array.isArray(b.hours) || !Array.isArray(b.daysOff) || b.offerings.length > 100 || b.hours.length > 7 || b.daysOff.length > 100) return NextResponse.json({ error: "invalid_store" }, { status: 400 });
  const { error } = await db.rpc("commerce_save_store", { p_provider_id: b.providerId, p_offerings: b.offerings, p_hours: b.hours, p_days_off: b.daysOff });
  if (error) console.error("[FUWU] Partner store save failed", { providerId: b.providerId, code: error.code });
  if (!error) { for (const path of ["/", "/providers", "/services", "/admin/providers", "/provider-dashboard"]) revalidatePath(path); revalidatePath("/providers/[id]", "page"); }
  return NextResponse.json(error ? { error: commerceDatabaseError(error) } : { ok: true }, { status: error ? 409 : 200 });
}

export const POST = withCommerceApi(handlePOST);
