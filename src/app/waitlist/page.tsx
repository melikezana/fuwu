import Link from "next/link";
import { WaitlistForm } from "@/components/waitlist/WaitlistForm";
import { getPublicDiscovery } from "@/services/commerce/discovery";
import { getWaitlistContext } from "@/services/waitlist";
export const dynamic = "force-dynamic";
export const metadata = { title: "Açılış Bilgilendirmesi | FUWU", description: "FUWU açılış bilgilendirme tercihini oluştur veya iletişim iznini yönet." };
export default async function WaitlistPage() {
  const [context, discovery] = await Promise.all([getWaitlistContext(), getPublicDiscovery()]);
  return <div className="commerce-page"><header className="commerce-page-header"><p className="commerce-eyebrow">FUWU</p><h1>Hizmetin hazır olduğunda.</h1><p>Açılış haberini e-postayla al. İlçe ve hizmet tercihini paylaşabilirsin.</p></header><WaitlistForm {...context} categories={discovery.categories} districts={discovery.districts} /><Link className="commerce-text-link" href="/services">Hizmetleri Keşfet</Link></div>;
}
