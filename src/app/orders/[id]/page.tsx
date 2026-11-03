import { notFound, redirect } from "next/navigation";
import { getServerAuthContext } from "@/services/auth/server";
import { buildLoginRedirectUrl } from "@/lib/constants/navigation";
import { assertSandbox } from "@/lib/commerce/payment";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/serviceRole";
import { isUuid } from "@/lib/utils/validation";
import { OrderView } from "@/components/commerce/OrderView";
import type { OrderFinance } from "@/lib/commerce/finance";
import { getReviewEligibility } from "@/services/reviews";
import { getRebookHref } from "@/services/commerce/order-cards";
import type { OrderTrustData } from "@/components/commerce/OrderTrust";
export const dynamic = "force-dynamic";
export const metadata = { title: "Sipariş Takibi | FUWU", robots: { index: false, follow: false } };
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { user, supabase } = await getServerAuthContext();
  if (!user || !supabase) redirect(buildLoginRedirectUrl(`/orders/${id}`));
  const { data: order, error } = await supabase.from("commerce_orders").select("*").eq("id", id).maybeSingle();
  if (error) return <div className="commerce-page"><p role="alert" className="commerce-notice">Siparişe şu anda ulaşılamıyor. Lütfen yeniden dene.</p></div>;
  if (!order) notFound();
  const isCustomer = order.customer_id === user.id;
  // Tüm okumalar tek turda ve paralel: tüm kataloğu çekmek yerine yalnızca bu siparişin ustasına bakılır.
  const [{ data: events }, { data: provider }, { data: finance }, { data: review }, eligibility, rebookHref, trustResult] = await Promise.all([
    supabase.from("order_status_events").select("*").eq("order_id", id).order("created_at"),
    supabase.from("providers").select("id").eq("id", order.provider_id).eq("user_id", user.id).maybeSingle(),
    supabase.rpc("commerce_order_finance", { p_order_id: id }),
    supabase.from("reviews").select("id").eq("order_id", order.id).eq("user_id", user.id).maybeSingle(),
    isCustomer ? getReviewEligibility(order.provider_id, supabase) : Promise.resolve([]),
    isCustomer ? getRebookHref(supabase, order) : Promise.resolve(undefined),
    // Karşılıklı doğrulama: okunamazsa kutu gizlenir, sipariş ekranı etkilenmez.
    supabase.rpc("commerce_order_trust", { p_order_id: id }),
  ]);
  const trust = !trustResult.error && trustResult.data && typeof trustResult.data === "object" && !Array.isArray(trustResult.data) ? trustResult.data as unknown as OrderTrustData : null;
  let paymentReady = false; try { assertSandbox(); paymentReady = isSupabaseServiceRoleConfigured; } catch { /* Sandbox is explicitly unavailable. */ }
  return <OrderView order={order} events={events ?? []} completionCode={null} isProvider={Boolean(provider) && order.customer_id !== user.id} readOnly={order.customer_id !== user.id && !provider} paymentReady={paymentReady} finance={finance as unknown as OrderFinance | null} hasReview={Boolean(review)} reviewEligible={eligibility.some(source => source.kind === "order" && source.id === order.id)} trust={trust} rebookHref={rebookHref} />;
}
