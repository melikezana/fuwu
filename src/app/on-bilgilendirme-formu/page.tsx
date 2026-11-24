import Link from "next/link";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { DISTANCE_CONTRACT_VERSION, preInformationSections } from "@/lib/legal/distance-contract";
import { getIntermediaryParty } from "@/services/legal/intermediary";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ön Bilgilendirme Formu", description: "FUWU üzerinden satın alınan ev hizmetleri için ön bilgilendirme formu örneği." };

export default async function PreInformationPage() {
  const intermediary = await getIntermediaryParty();
  return <div className="commerce-page"><header className="commerce-page-header"><p className="commerce-eyebrow">YASAL METİN · SÜRÜM {DISTANCE_CONTRACT_VERSION}</p><h1>Ön Bilgilendirme Formu</h1><p>Siparişte hizmeti sunan ustanın bilgileri, hizmet, tutar ve randevu ile doldurularak onayına sunulur. Onayladığın metne sipariş sayfandan her zaman ulaşırsın.</p></header>
    <div className="order-documents"><LegalDocument title="Ön Bilgilendirme Formu (örnek)" sections={preInformationSections({ provider: null, intermediary, service: null, addons: [], basePriceMinor: null, addonsMinor: 0, totalMinor: null, paymentMethod: null, withinWithdrawalPeriod: null })} />
    <p className="commerce-help">İlgili metinler: <Link href="/mesafeli-hizmet-sozlesmesi">Mesafeli Hizmet Sözleşmesi</Link> · <Link href="/kullanim-sartlari">Kullanım Şartları</Link> · <Link href="/kvkk">KVKK</Link></p></div>
  </div>;
}
