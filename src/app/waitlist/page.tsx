import Link from "next/link";
import { redirect } from "next/navigation";
import { WaitlistForm } from "@/components/waitlist/WaitlistForm";
import { getPublicDiscovery } from "@/services/commerce/discovery";
import { getWaitlistContext } from "@/services/waitlist";
export const dynamic = "force-dynamic";
export const metadata = { title: "Bilgilendirme Tercihlerin", robots: { index: false, follow: false } };
// Hizmetler artık doğrudan satın alınıyor; yeni talep toplanmaz. Önceden kayıt bırakanlar
// tercihlerini görebilir ve onaylarını geri çekebilir (KVKK); diğer herkes hizmetlere yönlenir.
export default async function WaitlistPage() {
  const context = await getWaitlistContext();
  if (!context.entry) redirect("/services");
  const discovery = await getPublicDiscovery();
  return <div className="commerce-page"><header className="commerce-page-header"><p className="commerce-eyebrow">FUWU</p><h1>Bilgilendirme tercihlerin</h1><p>Hizmetler artık doğrudan satın alınıyor. Daha önce bıraktığın kaydı buradan yönetebilir veya kaldırabilirsin.</p></header><WaitlistForm {...context} available={false} categories={discovery.categories} districts={discovery.districts} /><Link className="commerce-button" href="/services">Hizmeti Satın Al</Link></div>;
}
