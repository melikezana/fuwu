import { withCommerceApi } from "@/lib/commerce/api";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils/validation";
async function handleGET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  if (!isUuid(p.get("offering") ?? "") || !isUuid(p.get("district") ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(p.get("day") ?? "")) return NextResponse.json({ error: "invalid_selection" }, { status: 400 });
  const day = p.get("day")!;
  const parsed = new Date(`${day}T12:00:00+03:00`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== day || (p.has("days") && p.get("days") !== "7")) return NextResponse.json({ error: "invalid_selection" }, { status: 400 });
  const db = await createSupabaseServerClient();
  if (!db) return NextResponse.json({ error: "store_unavailable" }, { status: 503 });
  try {
  if (p.get("days") === "7") {
    const signal = AbortSignal.timeout(8000);
    const days = await Promise.all(Array.from({ length: 7 }, async (_, offset) => {
      const date = new Date(parsed); date.setUTCDate(date.getUTCDate() + offset);
      const iso = date.toISOString().slice(0, 10);
      const { data, error } = await db.rpc("commerce_slots", { p_offering_id: p.get("offering")!, p_day: iso, p_district_id: p.get("district")! }).abortSignal(signal);
      return { day: iso, slots: data ?? [], error: Boolean(error) };
    }));
    const failed = days.some(day => day.error);
    return NextResponse.json(failed ? { error: "store_unavailable" } : { days: days.map(({ day, slots }) => ({ day, slots })) }, { status: failed ? 503 : 200, headers: { "Cache-Control": "no-store" } });
  }
  const { data, error } = await db.rpc("commerce_slots", { p_offering_id: p.get("offering")!, p_day: p.get("day")!, p_district_id: p.get("district")! }).abortSignal(AbortSignal.timeout(8000));
  return NextResponse.json(error ? { error: "store_unavailable" } : { slots: data }, { status: error ? 503 : 200, headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "store_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}

export const GET = withCommerceApi(handleGET);
