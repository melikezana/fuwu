import Link from "next/link";
import { WaitlistForm } from "@/components/waitlist/WaitlistForm";
import { getPublicDiscovery } from "@/services/commerce/discovery";
import { getWaitlistContext } from "@/services/waitlist";
export const dynamic = "force-dynamic";
export const metadata = { title: "Açılış Bilgilendirmesi", description: "FUWU açılışı için ilçe ve hizmet talebini bırak, onaylarını yönet." };
export default async function WaitlistPage() {
  const [context, discovery] = await Promise.all([getWaitlistContext(), getPublicDiscovery()]);
  return <div className="commerce-page"><header className="commerce-page-header"><p className="commerce-eyebrow">FUWU</p><h1>Bölgende ne lazım?</h1><p>{context.marketingEmailAvailable ? "Hangi ilçede hangi hizmete ihtiyacın olduğunu söyle; istersen açılışta e-postayla haber verelim." : "Hangi ilçede hangi hizmete ihtiyacın olduğunu söyle; ilk ustaları önce oraya davet edelim."}</p></header><WaitlistForm {...context} categories={discovery.categories} districts={discovery.districts} /><Link className="commerce-text-link" href="/services">Hizmetleri Keşfet</Link></div>;
}
