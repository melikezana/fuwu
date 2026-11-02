import { NextRequest, NextResponse } from "next/server";
import { withCommerceApi } from "@/lib/commerce/api";
import { buildOrderIcs } from "@/lib/commerce/calendar";
import { commerceRateLimit } from "@/lib/commerce/rate";
import { isUuid } from "@/lib/utils/validation";
import { getServerAuthContext } from "@/services/auth/server";

// Randevuyu telefon takvimine ekler. Sipariş satırı RLS ile okunur: yalnızca müşterisi ve ustası erişir.
async function handleGET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, supabase: db } = await getServerAuthContext();
  if (!user || !db) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isUuid(id)) return NextResponse.json({ error: "invalid_selection" }, { status: 400 });
  const limited = await commerceRateLimit(request, "commerce.order.calendar", 30, 60_000, user.id);
  if (limited) return limited;
  const { data: order, error } = await db.from("commerce_orders").select("id,service_name,provider_name,district_name,address,starts_at,ends_at,status").eq("id", id).maybeSingle();
  if (error || !order) return NextResponse.json({ error: "order_not_found" }, { status: 404 });
  if (!["CONFIRMED", "PROVIDER_ON_THE_WAY", "IN_PROGRESS"].includes(order.status)) return NextResponse.json({ error: "transition_forbidden" }, { status: 409 });
  const ics = buildOrderIcs(order, process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin);
  return new NextResponse(ics, { status: 200, headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="fuwu-randevu-${id.slice(0, 8)}.ics"` } });
}

export const GET = withCommerceApi(handleGET);
