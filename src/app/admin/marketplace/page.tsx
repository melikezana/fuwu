import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/components/admin/AdminUI";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { MarketplaceMetrics } from "@/components/admin/MarketplaceMetrics";
import { getAdminAccess } from "@/services/admin";
import { getMarketplaceSummary } from "@/services/admin/marketplace";
import { getServerAuthContext } from "@/services/auth/server";
import { appointment, money, orderLabels } from "@/lib/commerce/display";
import { payoutLabels } from "@/lib/commerce/finance";
import type { CommerceOrder } from "@/lib/commerce/types";
import { buildLoginRedirectUrl } from "@/lib/constants/navigation";
import { reconciliationReasons } from "@/lib/commerce/reconciliation-state";
import { marketplaceAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marketplace Operasyon Merkezi | FUWU", robots: { index: false, follow: false } };
const views = [["orders", "Siparişler"], ["payments", "Ödemeler"], ["reconciliation", "Mutabakat Gerektirenler"], ["refunds", "İadeler"], ["payouts", "Hak Edişler"], ["disputes", "Uyuşmazlıklar"], ["health", "Sistem Sağlığı"]];
type Transaction = { status: string; payout_state: string; refund_state: string; environment: string; created_at: string; item_transaction_id?: string | null; has_item_transaction?: boolean };
type AdminOrder = CommerceOrder & { payment_transactions: Transaction | Transaction[] | null };

export default async function MarketplacePage({ searchParams }: { searchParams: Promise<{ view?: string; page?: string; status?: string; result?: string }> }) {
  const access = await getAdminAccess();
  if (!access.ok && access.reason === "missing-session") redirect(buildLoginRedirectUrl("/admin/marketplace"));
  if (!access.ok) return <AdminAccessGate access={access} />;
  const { supabase } = await getServerAuthContext();
  const params = await searchParams;
  const view = views.some(([id]) => id === params.view) ? params.view! : "orders";
  const page = Math.min(10000, Math.max(1, Number.parseInt(params.page || "1") || 1));
  let query = supabase!.from("orders").select("*,payment_transactions(status,payout_state,refund_state,environment,created_at,item_transaction_id)", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * 25, page * 25 - 1);
  if (view === "refunds") query = query.in("payment_status", ["REFUND_PENDING", "REFUNDED"]);
  else if (view === "disputes") query = query.eq("status", "DISPUTED");
  else if (view === "payouts") query = query.eq("status", "COMPLETED");
  if (view === "orders" && params.status && Object.hasOwn(orderLabels, params.status)) query = query.eq("status", params.status as CommerceOrder["status"]);
  const [summary, queried, reconciliation] = await Promise.all([getMarketplaceSummary(), view === "reconciliation" ? Promise.resolve(null) : query, view === "reconciliation" ? supabase!.rpc("commerce_admin_reconciliation", { p_page: page }) : Promise.resolve(null)]);
  const queue = reconciliation?.data as unknown as { orders: AdminOrder[]; count: number } | null;
  const result = view === "reconciliation" ? { data: queue?.orders ?? [], count: queue?.count ?? 0, error: reconciliation?.error } : queried!;
  const rows = (result.data ?? []) as unknown as AdminOrder[];
  const transaction = (o: AdminOrder) => Array.isArray(o.payment_transactions) ? o.payment_transactions[0] : o.payment_transactions;
  const pageHref = (p: number) => `/admin/marketplace?${new URLSearchParams({ view, page: String(p), ...(params.status ? { status: params.status } : {}) })}`;
  return <AdminPageShell active="marketplace" title="Marketplace Operasyon Merkezi" description="Gerçek sipariş kayıtları, doğrulanan test ödemeleri ve operasyonel mutabakat.">
    <MarketplaceMetrics summary={summary} />
    <nav className="fusion-tabs" aria-label="Marketplace ekranları">{views.map(([id, label]) => <Link key={id} href={`?view=${id}`} aria-current={view === id ? "page" : undefined}>{label}</Link>)}<Link href="/admin/provider-applications">Usta Başvuruları</Link><Link href="/admin/verifications">Doğrulamalar</Link><Link href="/admin/catalog">Hizmet Kataloğu</Link><Link href="/admin/users">Kullanıcılar</Link><Link href="/admin/reviews">Değerlendirme Moderasyonu</Link><Link href="/admin/revenue">Analitik</Link><Link href="/admin/settings">Komisyon Ayarları</Link><Link href="/admin/audit">Güvenlik ve Audit Log</Link></nav>
    {params.result && <p role="status" className="commerce-notice">{params.result === "requested" ? "İşlem talebi işlendi. Güncel ödeme, iade ve hak ediş sonucu aşağıdaki doğrulanmış kayıtlarda gösterilir." : params.result === "rate_limit" ? "Çok fazla işlem. Bir dakika sonra tekrar deneyin." : "İşlem doğrulanamadı. Kayıt ve kuruluş sonucu incelenmeli."}</p>}
    {view === "health" ? <section className="commerce-panel"><h2>Entegrasyon durumu</h2><dl className="fusion-health">{[["Marketplace migration / RLS okuma", Boolean(summary)], ["Supabase sunucu yetkisi", Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)], ["iyzico sandbox anahtarları", Boolean(process.env.IYZICO_API_KEY && process.env.IYZICO_SECRET_KEY)], ["Rezervasyon temizlik cron anahtarı", Boolean(process.env.CRON_SECRET)]].map(([label, configured]) => <div key={String(label)}><dt>{label}</dt><dd>{configured ? "Yapılandırma mevcut" : "Kontrol / kurulum gerekli"}</dd></div>)}</dl><p className="commerce-help">Yapılandırmanın bulunması, dış servis testinin geçtiği anlamına gelmez. Anlık slot doğruluğu zamanlayıcıya bağlı değildir. IN_FLIGHT dış işlemler yeniden gönderilmez; iyzico kaydıyla mutabakat gerekir.</p><Link className="commerce-text-link" href="/admin/audit">Audit Log Kayıtlarını Aç →</Link></section> : <>
      {view === "orders" && <form className="fusion-filter" method="get"><input type="hidden" name="view" value="orders" /><label className="commerce-field">Sipariş durumu<select name="status" defaultValue={params.status || ""}><option value="">Tüm durumlar</option>{Object.entries(orderLabels).map(([status, label]) => <option key={status} value={status}>{label}</option>)}</select></label><button className="commerce-secondary">Filtrele</button></form>}
      {result.error ? <p role="alert" className="commerce-notice">Sipariş ve ödeme kayıtları okunamadı. Migration ve RLS yetkilerini kontrol edin.</p> : !rows.length ? <section className="commerce-empty"><h2>Bu görünümde kayıt yok</h2><p>İlgili işlem oluştuğunda burada listelenir.</p></section> : <div className="fusion-operation-list">{rows.map(order => {
        const t = transaction(order);
        const reasons = reconciliationReasons(order, t, new Date().getTime());
        return <article className="commerce-panel" key={order.id}><header className="fusion-section-heading"><div><p className="commerce-eyebrow">#{order.id.slice(0, 8)} · SANDBOX</p><h2><Link href={`/orders/${order.id}`}>{order.service_name}</Link></h2><p className="commerce-help">{order.provider_name} · {appointment(order.starts_at)}</p></div><strong>{money(order.total_minor)}</strong></header><dl className="fusion-health"><div><dt>Sipariş</dt><dd>{orderLabels[order.status]}</dd></div><div><dt>Ödeme / kuruluş kaydı</dt><dd>{order.payment_status} / {t?.status || "Oturum yok"}</dd></div><div><dt>FUWU komisyonu</dt><dd>{money(order.commission_minor)}</dd></div><div><dt>Usta brüt payı</dt><dd>{money(order.provider_gross_minor)}</dd></div><div><dt>Kuruluş kesintisi</dt><dd>{order.processor_fee_minor == null ? "Bildirilmedi" : money(order.processor_fee_minor)}</dd></div><div><dt>Hak ediş onayı</dt><dd>{t?.payout_state ? payoutLabels[t.payout_state] : "Ödeme yok"}</dd></div><div><dt>İade işlemi</dt><dd>{t?.refund_state === "REFUNDED" ? "Kuruluş sonucu doğrulandı" : t?.refund_state === "IN_FLIGHT" ? "Mutabakat bekliyor" : "Başlatılmadı"}</dd></div></dl>{reasons.length > 0 && <ul className="commerce-warning" role="status">{reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}<div className="fusion-actions">{t && <form action={marketplaceAction}><input type="hidden" name="orderId" value={order.id} /><button className="commerce-secondary" name="action" value="reconcile">Ödeme Sonucunu Sorgula</button></form>}{order.payment_status === "PAID" && t?.payout_state !== "IN_FLIGHT" && t?.refund_state === "NONE" && ["CONFIRMED", "DISPUTED"].includes(order.status) && <form action={marketplaceAction}><input type="hidden" name="orderId" value={order.id} /><button className="commerce-secondary" name="action" value="refund">İade Sürecini Başlat</button></form>}{order.status === "COMPLETED" && t?.payout_state === "NONE" && t?.refund_state === "NONE" && <form action={marketplaceAction}><input type="hidden" name="orderId" value={order.id} /><button className="commerce-secondary" name="action" value="release">Hak Ediş Onayını İste</button></form>}</div></article>;
      })}</div>}
      <nav className="fusion-pagination" aria-label="Sipariş sayfaları">{page > 1 && <Link href={pageHref(page - 1)}>← Önceki</Link>}<span>{page}. sayfa · {result.count ?? "—"} kayıt</span>{(result.count ?? 0) > page * 25 && <Link href={pageHref(page + 1)}>Sonraki →</Link>}</nav>
    </>}
  </AdminPageShell>;
}

