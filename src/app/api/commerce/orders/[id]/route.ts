import { commerceDatabaseError, withCommerceApi } from "@/lib/commerce/api";
import { getRequestOrigin } from "@/lib/security/safeRedirect";
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthContext } from "@/services/auth/server";
import { isUuid } from "@/lib/utils/validation";
import { processOrderSettlement } from "@/services/commerce/settlement";
import { submitProviderReview } from "@/services/reviews";
import { getPublicErrorMessage } from "@/lib/errors";
import { revalidatePath } from "next/cache";
async function handleGET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, supabase: db } = await getServerAuthContext();
  if (!user || !db) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isUuid(id)) return NextResponse.json({ error: "invalid_selection" }, { status: 400 });
  const { data: order, error } = await db.from("orders").select("provider_id").eq("id", id).maybeSingle();
  if (error || !order) return NextResponse.json({ error: "order_not_found" }, { status: 404 });
  const [{ data: changes, error: changesError }, { data: provider }] = await Promise.all([
    db.from("order_scope_changes").select("id,scope,extra_minor,status,created_at").eq("order_id", id).order("created_at"),
    db.from("providers").select("name,profile_image_url").eq("id", order.provider_id).maybeSingle(),
  ]);
  return NextResponse.json(changesError ? { error: commerceDatabaseError(changesError) } : { changes: changes || [], provider }, { status: changesError ? 503 : 200 });
}
export const GET = withCommerceApi(handleGET);
async function handlePOST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  if (origin && origin !== getRequestOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { user, supabase: db } = await getServerAuthContext();
  if (!user || !db) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const b = await request.json().catch(() => null);
  if (!isUuid(id) || !b) return NextResponse.json({ error: "invalid_selection" }, { status: 400 });
  if (b.action === "service_code") {
    const { data, error } = await db.rpc("trust_issue_service_code", { p_order_id: id });
    const failure = data && typeof data === "object" && !Array.isArray(data) && "error" in data ? String(data.error) : null;
    return NextResponse.json(error || failure ? { error: error ? commerceDatabaseError(error) : failure } : data, { status: error || failure ? 409 : 200 });
  }
  if (b.action === "scope_change") {
    if (b.changeId ? (!isUuid(b.changeId) || typeof b.accept !== "boolean") : (typeof b.scope !== "string" || b.scope.length < 10 || b.scope.length > 2000 || !Number.isSafeInteger(b.extraMinor) || b.extraMinor < 0)) return NextResponse.json({ error: "invalid_selection" }, { status: 400 });
    const { error } = await db.rpc("trust_scope_change", { p_order_id: id, ...(b.changeId ? { p_change_id: b.changeId, p_accept: b.accept } : { p_scope: b.scope, p_extra_minor: b.extraMinor }) });
    return NextResponse.json(error ? { error: commerceDatabaseError(error) } : { ok: true }, { status: error ? 409 : 200 });
  }
  if (b.action === "report") {
    if (typeof b.reason !== "string" || b.reason.trim().length < 10 || b.reason.length > 2000 || !["safety", "complaint", "appeal", "no_show", "unreachable"].includes(b.kind)) return NextResponse.json({ error: "invalid_selection" }, { status: 400 });
    const { error } = await db.rpc("trust_report_case", { p_order_id: id, p_kind: b.kind, p_reason: b.reason.trim() });
    return NextResponse.json(error ? { error: commerceDatabaseError(error) } : { ok: true }, { status: error ? 409 : 200 });
  }
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
  return NextResponse.json(result.error || rpcError ? { error: result.error ? commerceDatabaseError(result.error) : rpcError } : { ok: true }, { status: result.error || rpcError ? 409 : 200 });
}

export const POST = withCommerceApi(handlePOST);
