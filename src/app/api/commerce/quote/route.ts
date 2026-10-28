import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils/validation";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("offering") ?? "";
  if (!isUuid(id)) return NextResponse.json({ error: "invalid_selection" }, { status: 400 });
  const db = await createSupabaseServerClient();
  if (!db) return NextResponse.json({ error: "pricing_unavailable" }, { status: 503 });
  try {
    const { data, error } = await db.rpc("commerce_quote", { p_offering_id: id }).abortSignal(AbortSignal.timeout(8000));
    return NextResponse.json(error || !data ? { error: "pricing_unavailable" } : { quote: data }, { status: error || !data ? 503 : 200, headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "pricing_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
