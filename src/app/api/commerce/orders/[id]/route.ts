import { NextRequest, NextResponse } from "next/server";
import { getServerAuthContext } from "@/services/auth/server";
import { isUuid } from "@/lib/utils/validation";
import { processOrderSettlement } from "@/services/commerce/settlement";
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, supabase: db } = await getServerAuthContext();
  if (!user || !db) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const b = await request.json().catch(() => null);
  if (!isUuid(id) || !b) return NextResponse.json({ error: "invalid_selection" }, { status: 400 });
  const result = b.action === "review" && Number.isInteger(b.rating) && typeof b.comment === "string" && b.comment.length <= 1000
    ? await db.rpc("commerce_submit_review", { p_order_id: id, p_rating: b.rating, p_comment: b.comment })
    : typeof b.status === "string" && (b.code == null || (typeof b.code === "string" && /^\d{6}$/.test(b.code)))
      ? await db.rpc("commerce_transition_order", { p_order_id: id, p_status: b.status, p_code: b.code })
      : { data: null, error: { message: "invalid_selection" } };
  const rpcError = result.data && typeof result.data === "object" && "error" in result.data ? String(result.data.error) : null;
  if (!result.error && !rpcError && result.data && typeof result.data === "object" && "status" in result.data) {
    if (result.data.status === "COMPLETED") await processOrderSettlement(id, "release");
    if (result.data.status === "REFUND_PENDING") await processOrderSettlement(id, "refund");
  }
  return NextResponse.json(result.error || rpcError ? { error: result.error?.message ?? rpcError } : { ok: true }, { status: result.error || rpcError ? 409 : 200 });
}
