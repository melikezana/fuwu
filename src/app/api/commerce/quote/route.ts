import { withCommerceApi } from "@/lib/commerce/api";
import { commerceRateLimit } from "@/lib/commerce/rate";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils/validation";
import { decodeBasket } from "@/lib/commerce/pricing";

const noStore = { "Cache-Control": "no-store" };

// Sepet fiyatı yalnızca sunucuda hesaplanır: paket + seçilen ekstralar + müşteri payı. İstemci tutarı yalnızca doğrular.
async function handleGET(request: NextRequest) {
  const limited = await commerceRateLimit(request, "commerce.quote", 120, 60_000);
  if (limited) return limited;
  const id = request.nextUrl.searchParams.get("offering") ?? "";
  const basket = decodeBasket(request.nextUrl.searchParams.get("addons"));
  if (!isUuid(id) || !basket) return NextResponse.json({ error: "invalid_selection" }, { status: 400, headers: noStore });
  const db = await createSupabaseServerClient();
  if (!db) return NextResponse.json({ error: "pricing_unavailable" }, { status: 503, headers: noStore });
  try {
    const { data, error } = await db.rpc("commerce_quote_basket", { p_offering_id: id, p_addons: basket }).abortSignal(AbortSignal.timeout(8000));
    if (error?.message?.includes("invalid_addons")) return NextResponse.json({ error: "invalid_addons" }, { status: 400, headers: noStore });
    if (error && ["PGRST202", "42883"].includes(error.code ?? "") && !basket.length) {
      // Migrasyon henüz uygulanmadıysa ekstrasız teklif eski fonksiyonla aynı biçimde döner.
      const legacy = await db.rpc("commerce_quote", { p_offering_id: id }).abortSignal(AbortSignal.timeout(8000));
      if (legacy.error || !legacy.data) return NextResponse.json({ error: "pricing_unavailable" }, { status: 503, headers: noStore });
      const q = legacy.data as Record<string, unknown>;
      return NextResponse.json({ quote: { ...q, base_price_minor: q.service_price_minor, addons: [], addons_minor: 0 } }, { headers: noStore });
    }
    return NextResponse.json(error || !data ? { error: "pricing_unavailable" } : { quote: data }, { status: error || !data ? 503 : 200, headers: noStore });
  } catch { return NextResponse.json({ error: "pricing_unavailable" }, { status: 503, headers: noStore }); }
}

export const GET = withCommerceApi(handleGET);
