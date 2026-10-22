import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils/validation";
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  if (!isUuid(p.get("offering") ?? "") || !isUuid(p.get("district") ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(p.get("day") ?? "")) return NextResponse.json({ error: "invalid_selection" }, { status: 400 });
  const db = await createSupabaseServerClient();
  if (!db) return NextResponse.json({ error: "store_unavailable" }, { status: 503 });
  const { data, error } = await db.rpc("commerce_slots", { p_offering_id: p.get("offering")!, p_day: p.get("day")!, p_district_id: p.get("district")! }).abortSignal(AbortSignal.timeout(8000));
  return NextResponse.json(error ? { error: "store_unavailable" } : { slots: data }, { status: error ? 503 : 200, headers: { "Cache-Control": "no-store" } });
}
