import { notFound, redirect } from "next/navigation";
import { getServerAuthContext } from "@/services/auth/server";
import { buildLoginRedirectUrl } from "@/lib/constants/navigation";
import { assertSandbox } from "@/lib/commerce/payment";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/serviceRole";
import { isUuid } from "@/lib/utils/validation";
import { OrderView } from "@/components/commerce/OrderView";
import type { OrderFinance } from "@/lib/commerce/finance";
import { getReviewEligibility } from "@/services/reviews";
import { getCommerceCatalog } from "@/services/commerce";
export const dynamic = "force-dynamic";
export const metadata = { title: "Sipariş Takibi | FUWU", robots: { index: false, follow: false } };
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { user, supabase } = await getServerAuthContext();
  if (!user || !supabase) redirect(buildLoginRedirectUrl(`/orders/${id}`));
  const { data: order, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  if (error) return <div className="commerce-page"><p role="alert" className="commerce-notice">Siparişe şu anda ulaşılamıyor. Lütfen yeniden deneyin.</p></div>;
  if (!order) notFound();
  const [{ data: events }, { data: code }, { data: provider }, { data: finance }, { data: review }] = await Promise.all([
    supabase.from("order_status_events").select("*").eq("order_id", id).order("created_at"),
    supabase.from("order_completion_codes").select("code").eq("order_id", id).maybeSingle(),
    supabase.from("providers").select("id").eq("id", order.provider_id).eq("user_id", user.id).maybeSingle(),
    supabase.rpc("commerce_order_finance", { p_order_id: id }),
    supabase.from("reviews").select("id").eq("order_id", order.id).eq("user_id", user.id).maybeSingle(),
  ]);
  const eligibility = order.customer_id === user.id ? await getReviewEligibility(order.provider_id, supabase) : [];
  const catalog = order.customer_id === user.id ? await getCommerceCatalog() : null;
  const offering = catalog?.offers.find(o => o.id === order.offering_id);
  const service = catalog?.services.find(s => s.id === offering?.service_id);
  const rebookHref = service && offering ? `/services/${service.slug}?${new URLSearchParams({ provider: order.provider_id, district: order.district_id, ...(offering.variant_id ? { variant: offering.variant_id } : {}), rebook: order.id })}` : undefined;
  let paymentReady = false; try { assertSandbox(); paymentReady = isSupabaseServiceRoleConfigured; } catch { /* Sandbox is explicitly unavailable. */ }
  return <OrderView order={order} events={events ?? []} completionCode={code?.code ?? null} isProvider={Boolean(provider) && order.customer_id !== user.id} readOnly={order.customer_id !== user.id && !provider} paymentReady={paymentReady} finance={finance as unknown as OrderFinance | null} hasReview={Boolean(review)} reviewEligible={eligibility.some(source => source.kind === "order" && source.id === order.id)} rebookHref={rebookHref} />;
}
