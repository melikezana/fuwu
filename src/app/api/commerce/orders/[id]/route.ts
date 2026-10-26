import { getRequestOrigin } from "@/lib/security/safeRedirect";
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthContext } from "@/services/auth/server";
import { isUuid } from "@/lib/utils/validation";
import { processOrderSettlement } from "@/services/commerce/settlement";
import { submitProviderReview } from "@/services/reviews";
import { getPublicErrorMessage } from "@/lib/errors";
import { revalidatePath } from "next/cache";
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  if (origin && origin !== getRequestOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { user, supabase: db } = await getServerAuthContext();
  if (!user || !db) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const b = await request.json().catch(() => null);
  if (!isUuid(id) || !b) return NextResponse.json({ error: "invalid_selection" }, { status: 400 });
  if (b.action === "review") {
    if (!Number.isInteger(b.rating) || b.rating < 1 || b.rating > 5 || typeof b.comment !== "string" || b.comment.length > 1000) return NextResponse.json({ error: "invalid_review" }, { status: 400 });
    const { data: order } = await db.from("orders").select("provider_id").eq("id", id).eq("customer_id", user.id).maybeSingle();
    if (!order) return NextResponse.json({ error: "review_not_eligible" }, { status: 403 });
    try {
      await submitProviderReview({ providerId: order.provider_id, orderId: id, rating: b.rating, comment: b.comment }, db);
      revalidatePath(`/providers/${order.provider_id}`);
      revalidatePath(`/orders/${id}`);
      revalidatePath("/account");
      return NextResponse.json({ ok: true });
    } catch (error) {
      return NextResponse.json({ error: "review_not_eligible", message: getPublicErrorMessage(error, "Değerlendirme gönderilemedi.") }, { status: 409 });
    }
  }
  const result = typeof b.status === "string" && (b.code == null || (typeof b.code === "string" && /^\d{6}$/.test(b.code)))
      ? await db.rpc("commerce_transition_order", { p_order_id: id, p_status: b.status, p_code: b.code })
      : { data: null, error: { message: "invalid_selection" } };
  const rpcError = result.data && typeof result.data === "object" && "error" in result.data ? String(result.data.error) : null;
  if (!result.error && !rpcError && result.data && typeof result.data === "object" && "status" in result.data) {
    if (result.data.status === "COMPLETED") await processOrderSettlement(id, "release");
    if (result.data.status === "REFUND_PENDING") await processOrderSettlement(id, "refund");
  }
  return NextResponse.json(result.error || rpcError ? { error: result.error?.message ?? rpcError } : { ok: true }, { status: result.error || rpcError ? 409 : 200 });
}
