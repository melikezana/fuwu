import { NextRequest, NextResponse } from "next/server";
import { getServerAuthContext } from "@/services/auth/server";
import { isUuid } from "@/lib/utils/validation";
import { getRequestOrigin } from "@/lib/security/safeRedirect";
import { checkRateLimitWithRedis } from "@/lib/security/rateLimitRedis";
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== getRequestOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { user, supabase } = await getServerAuthContext();
  if (!user || !supabase) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await request.json().catch(() => null);
  if (!b || !isUuid(b.providerId ?? "") || !isUuid(b.serviceId ?? "") || typeof b.name !== "string" || b.name.trim().length < 2 || b.name.length > 80) return NextResponse.json({ error: "invalid_variant" }, { status: 400 });
  const rate = await checkRateLimitWithRedis({ action: "provider:variant", userId: user.id, supabase, limit: 10, windowMs: 60000 });
  if (!rate.allowed) return NextResponse.json({ error: "rate_limit" }, { status: 429 });
  const { data, error } = await supabase.rpc("commerce_create_variant", { p_provider_id: b.providerId, p_service_id: b.serviceId, p_name: b.name.trim() });
  return NextResponse.json(error ? { error: "variant_unavailable" } : { id: data }, { status: error ? 409 : 201 });
}
