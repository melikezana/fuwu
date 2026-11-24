import Link from "next/link";
import { ArrowRight, CalendarDays, ShieldCheck, ShoppingBag } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { STOREFRONT_COPY } from "@/lib/prelaunch";

const steps = [
  { icon: ShoppingBag, title: "Paketini seç, ekstranı ekle", description: "Kapsam ve fiyat baştan belli; fırın içi, cam, ütü gibi ekstraları sepete eklersin." },
  { icon: CalendarDays, title: "Randevunu al", description: "Ustanı ve onun gerçek takviminden sana uyan saati seçersin; randevu hemen oluşur." },
  { icon: ShieldCheck, title: "Online öde, paran güvende", description: "Kartla güvenle ödersin; ödemen iş bitip sen onaylayana kadar ustaya geçmez, sorun olursa iade edilir." },
];
export function HomePremiumPanels() {
  return <section aria-labelledby="how-title" className="home-section home-how" id="how-it-works"><Container className="home-container"><div className="home-section-heading"><div><p className="home-eyebrow">NASIL ÇALIŞIR?</p><h2 className="home-section-title" id="how-title">{STOREFRONT_COPY.howTitle}</h2></div></div><ol className="home-steps">{steps.map(({icon:Icon,title,description},index)=><li key={title}><div className="home-step-top"><span className="home-step-icon"><Icon aria-hidden size={24}/></span><span className="home-step-number">0{index+1}</span></div><h3>{title}</h3><p>{description}</p></li>)}</ol></Container></section>;
}
export function HomeProviderInvite() {
  return <section className="home-section" id="trust"><Container className="home-container"><details className="home-compact-faq" id="faq"><summary>Satın alma ve destek</summary><div><h3>Nasıl satın alırım?</h3><p>Hizmet sayfasında paketini ve ekstralarını seç, ustanın boş saatinden randevunu al. <Link href="/services">Hizmetlere göz at.</Link></p><h3>Evime kim gelecek?</h3><p>Hizmeti sunan ustanın profilini ve müsaitliğini satın almadan önce görürsün.</p><h3>Ödemeyi ne zaman yaparım?</h3><p>Kapıda ödemede iş bitince ustana ödersin; tutar siparişte sabittir. Hizmete başlanana kadar ücretsiz iptal edebilirsin.</p><h3>Nasıl destek alırım?</h3><p><Link href="/iletisim">İletişim bilgilerimizden</Link> bize ulaşabilirsin.</p><Link className="home-text-link" href="/provider-application">Usta Ol <ArrowRight size={16} aria-hidden/></Link></div></details></Container></section>;
}
