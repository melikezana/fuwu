import Link from "next/link";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { DISTANCE_CONTRACT_VERSION, distanceContractSections, withdrawalFormSection } from "@/lib/legal/distance-contract";
import { getIntermediaryParty } from "@/services/legal/intermediary";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mesafeli Hizmet Sözleşmesi", description: "FUWU üzerinden satın alınan ev hizmetleri için mesafeli hizmet sözleşmesi örneği ve cayma formu." };

export default async function DistanceContractPage() {
  const intermediary = await getIntermediaryParty();
  const input = { provider: null, intermediary, service: null, addons: [], basePriceMinor: null, addonsMinor: 0, totalMinor: null, paymentMethod: null, withinWithdrawalPeriod: null };
  return <div className="commerce-page"><header className="commerce-page-header"><p className="commerce-eyebrow">YASAL METİN · SÜRÜM {DISTANCE_CONTRACT_VERSION}</p><h1>Mesafeli Hizmet Sözleşmesi</h1><p>Siparişte ustanın bilgileri, hizmet, tutar ve randevu ile doldurulur; siparişi onayladığın anda kurulur.</p></header>
    <div className="order-documents"><LegalDocument title="Mesafeli Hizmet Sözleşmesi (örnek)" sections={[...distanceContractSections(input), withdrawalFormSection(input)]} />
    <p className="commerce-help">İlgili metinler: <Link href="/on-bilgilendirme-formu">Ön Bilgilendirme Formu</Link> · <Link href="/kullanim-sartlari">Kullanım Şartları</Link> · <Link href="/kvkk">KVKK</Link></p></div>
  </div>;
}
