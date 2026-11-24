import { commerceDatabaseError, withCommerceApi } from "@/lib/commerce/api";
import { commerceRateLimit } from "@/lib/commerce/rate";
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthContext } from "@/services/auth/server";
import { isUuid } from "@/lib/utils/validation";

const noStore = { "Cache-Control": "no-store, private" };

// Ödeme adımındaki Ön Bilgilendirme Formu için satıcı (usta) ve aracı hizmet sağlayıcı (FUWU) kimliği.
// Yalnızca giriş yapmış kullanıcıya, satıştaki bir hizmet için ve kullanıcı başına sınırla verilir; IBAN gibi ödeme bilgileri hiç dönmez.
async function handleGET(request: NextRequest) {
  const offering = request.nextUrl.searchParams.get("offering") ?? "";
  if (!isUuid(offering)) return NextResponse.json({ error: "invalid_selection" }, { status: 400, headers: noStore });
  const { user, supabase: db } = await getServerAuthContext();
  if (!user || !db) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  const limited = await commerceRateLimit(request, "commerce.legal", 30, 60 * 60_000, user.id);
  if (limited) return limited;
  try {
    const { data, error } = await db.rpc("commerce_checkout_legal", { p_offering_id: offering }).abortSignal(AbortSignal.timeout(8000));
    if (error) {
      const code = commerceDatabaseError(error);
      return NextResponse.json({ error: code === "schema_missing" ? "legal_unavailable" : code }, { status: code === "offering_unavailable" ? 409 : code === "unauthorized" ? 401 : 503, headers: noStore });
    }
    return NextResponse.json({ legal: data }, { headers: noStore });
  } catch { return NextResponse.json({ error: "legal_unavailable" }, { status: 503, headers: noStore }); }
}

export const GET = withCommerceApi(handleGET);
