import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getServerAuthContext } from "@/services/auth/server";
import { buildLoginRedirectUrl } from "@/lib/constants/navigation";
import { isUuid } from "@/lib/utils/validation";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { PrintButton } from "@/components/legal/PrintButton";
import { distanceContractSections, preInformationSections, withdrawalFormSection, type ContractInput, type LegalParty } from "@/lib/legal/distance-contract";
import type { CommerceOrder } from "@/lib/commerce/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sipariş Belgeleri", robots: { index: false, follow: false } };

const party = (value: unknown): LegalParty | null => value && typeof value === "object" && !Array.isArray(value) ? value as LegalParty : null;

// Siparişe özel Ön Bilgilendirme Formu ve Mesafeli Hizmet Sözleşmesi: onay anındaki taraf bilgileri ve tutarlarla,
// yalnızca siparişin müşterisine ve ustasına (RLS) gösterilir; yazdırılabilir / PDF olarak kaydedilebilir.
export default async function OrderDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { user, profile, supabase } = await getServerAuthContext();
  if (!user || !supabase) redirect(buildLoginRedirectUrl(`/orders/${id}/belgeler`));
  const { data, error } = await supabase.from("commerce_orders").select("*").eq("id", id).maybeSingle();
  if (error) return <div className="commerce-page"><p role="alert" className="commerce-notice">Belgelere şu anda ulaşılamıyor. Lütfen yeniden dene.</p></div>;
  if (!data) notFound();
  const order = data as CommerceOrder;
  const isCustomer = order.customer_id === user.id;
  const back = <Link className="commerce-back" href={`/orders/${order.id}`}><ArrowLeft size={17} aria-hidden /> Siparişe dön</Link>;
  if (!order.legal_version || !order.legal_parties) return <div className="commerce-page">{back}<section className="commerce-panel"><h1>Sipariş belgeleri</h1><p className="commerce-help">Bu sipariş, sözleşme kaydının siparişe eklenmesinden önce verildi. Geçerli koşullar için <Link href="/kullanim-sartlari">kullanım şartlarını</Link> inceleyebilirsin.</p></section></div>;
  const legal = order.legal_parties;
  const input: ContractInput = {
    orderRef: order.id.slice(0, 8).toUpperCase(), acceptedAt: order.legal_accepted_at ?? order.created_at, version: order.legal_version,
    provider: party(legal.provider), intermediary: party(legal.intermediary),
    customer: isCustomer ? { name: profile?.full_name ?? null, email: user.email ?? null } : null,
    service: { name: order.service_name, variant: order.variant_name, scope: order.scope, exclusions: legal.exclusions ?? order.exclusions ?? null },
    addons: (order.addons ?? []).map(item => ({ name: item.name, quantity: item.quantity, total_minor: item.total_minor })),
    basePriceMinor: order.base_price_minor ?? order.service_price_minor ?? null, addonsMinor: order.addons_minor ?? 0, totalMinor: order.total_minor, customerFeeMinor: order.customer_fee_minor ?? null,
    durationMinutes: Math.round((Date.parse(order.ends_at) - Date.parse(order.starts_at)) / 60000), startsAt: order.starts_at,
    address: order.address, district: order.district_name, paymentMethod: order.payment_method ?? "CARD",
    withinWithdrawalPeriod: legal.within_withdrawal_period ?? null, earlyStartConsentAt: order.early_start_consent_at ?? null,
  };
  return <div className="commerce-page">{back}
    <header className="commerce-page-header"><p className="commerce-eyebrow">SİPARİŞ #{input.orderRef}</p><h1>Sipariş belgeleri</h1><p>Siparişi onayladığın anda geçerli olan metinler ve taraf bilgileri. Bu sayfayı yazdırabilir ya da PDF olarak saklayabilirsin.</p></header>
    <div className="order-documents">
      <div className="order-documents-actions"><PrintButton /></div>
      <LegalDocument title="Ön Bilgilendirme Formu" sections={preInformationSections(input)} />
      <LegalDocument title="Mesafeli Hizmet Sözleşmesi" sections={[...distanceContractSections(input), withdrawalFormSection(input)]} />
    </div>
  </div>;
}
