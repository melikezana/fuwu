import { NextRequest, NextResponse } from "next/server";
import { getRequestOrigin } from "@/lib/security/safeRedirect";
import { getServerAuthContext } from "@/services/auth/server";
import { isUuid } from "@/lib/utils/validation";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") && request.headers.get("origin") !== getRequestOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { user, supabase } = await getServerAuthContext();
  if (!user || !supabase) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || !isUuid(body.providerId ?? "") || !Number.isInteger(body.limit) || body.limit < 1 || body.limit > 30) return NextResponse.json({ error: "invalid_capacity" }, { status: 400 });
  const { error } = await supabase.rpc("commerce_set_daily_limit", { p_provider_id: body.providerId, p_limit: body.limit });
  return NextResponse.json(error ? { error: "store_unavailable" } : { ok: true }, { status: error ? 409 : 200 });
}
