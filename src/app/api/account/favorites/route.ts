import { NextRequest, NextResponse } from "next/server";
import { getServerAuthContext } from "@/services/auth/server";
import { isUuid } from "@/lib/utils/validation";
import { getRequestOrigin } from "@/lib/security/safeRedirect";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET() {
  const { user, supabase } = await getServerAuthContext();
  if (!user || !supabase) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });
  const { data, error } = await supabase.from("customer_favorite_providers").select("provider_id").eq("customer_id", user.id);
  return NextResponse.json(error ? { error: "favorites_unavailable" } : { ids: data.map(row => row.provider_id) }, { status: error ? 503 : 200, headers });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== getRequestOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403, headers });
  const { user, supabase } = await getServerAuthContext();
  if (!user || !supabase) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.providerId !== "string" || !isUuid(body.providerId) || typeof body.saved !== "boolean") {
    return NextResponse.json({ error: "invalid_selection" }, { status: 400, headers });
  }
  // The composite primary key makes repeated saves idempotent.
  const result = body.saved
    ? await supabase.from("customer_favorite_providers").insert({ customer_id: user.id, provider_id: body.providerId })
    : await supabase.from("customer_favorite_providers").delete().eq("customer_id", user.id).eq("provider_id", body.providerId);
  const failed = result.error && !(body.saved && result.error.code === "23505");
  return NextResponse.json(failed ? { error: "favorites_unavailable" } : { saved: body.saved }, { status: failed ? 503 : 200, headers });
}
